// Unification du premier ordre, filtrage de motifs et élaboration
// bidirectionnelle (infer / check) d'un fragment de termes de Lean.
//
// Choix assumé : le trou `_` s'unifie avec n'importe quoi. Ce moteur enseigne
// la structure des preuves, il ne remplace pas le noyau de Lean — les types
// d'univers et les arguments d'instance ne sont pas vérifiés.

import {
  Var, Const, App, Lam, Pi, MVar, Lit, apps, alphaEq, subst, instantiate,
  metaVars, freeVars, freshMVar, avoid, match, unfold, replaceAll, subterms,
} from './expr.js';
import { show } from './printer.js';
import { defEq, norm, whnfHead } from './reduce.js';

export class ElabError extends Error {
  constructor(msg) { super(msg); this.name = 'ElabError'; }
}

const isHole = (e) => e.k === 'const' && e.n === '_';
const NAT = Const('ℕ');
const PROP = { k: 'sort', u: 'Prop' };

/* ------------------------------------------------------------------ unification */

function occursCheck(name, e, sub) {
  for (const m of metaVars(instantiate(e, sub))) if (m === name) return true;
  return false;
}

/** Unification symétrique du premier ordre. `sub` est mutée. */
export function unify(a, b, sub = new Map()) {
  a = instantiate(a, sub); b = instantiate(b, sub);
  if (isHole(a) || isHole(b)) return true;
  if (a.k === 'mvar') {
    if (b.k === 'mvar' && a.n === b.n) return true;
    if (occursCheck(a.n, b, sub)) return false;
    sub.set(a.n, b); return true;
  }
  if (b.k === 'mvar') return unify(b, a, sub);
  if (a.k !== b.k) {
    // 0 et Nat.zero, 3 et succ 2 : on tolère la forme littérale.
    const na = norm(a, { arith: true }), nb = norm(b, { arith: true });
    if (na.k === nb.k && !alphaEq(na, a)) return unify(na, nb, sub);
    return false;
  }
  switch (a.k) {
    case 'var': case 'const': return a.n === b.n;
    case 'lit': return a.v === b.v;
    case 'sort': return a.u === b.u;
    case 'app': return unify(a.f, b.f, sub) && unify(a.a, b.a, sub);
    case 'lam': case 'pi': {
      if (!unify(a.t ?? Const('_'), b.t ?? Const('_'), sub)) return false;
      const fresh = Var(avoid(a.x, new Set([...freeVars(a.b), ...freeVars(b.b)])));
      return unify(subst(a.b, a.x, fresh), subst(b.b, b.x, fresh), sub);
    }
    default: return false;
  }
}

/**
 * Filtrage à sens unique : les métavariables du motif s'instancient, le terme
 * reste figé. `bound` liste les variables liées dans le terme, qu'une
 * métavariable ne peut pas capturer.
 */
export function matchPattern(pat, term, sub = new Map(), bound = new Set()) {
  pat = instantiate(pat, sub);
  if (pat.k === 'mvar') {
    const prev = sub.get(pat.n);
    if (prev !== undefined) return alphaEq(prev, term);
    for (const v of freeVars(term)) if (bound.has(v)) return false;
    sub.set(pat.n, term); return true;
  }
  if (isHole(pat)) return true;
  if (pat.k !== term.k) return false;
  switch (pat.k) {
    case 'var': case 'const': return pat.n === term.n;
    case 'lit': return pat.v === term.v;
    case 'sort': return pat.u === term.u;
    case 'app': return matchPattern(pat.f, term.f, sub, bound)
                    && matchPattern(pat.a, term.a, sub, bound);
    case 'lam': case 'pi': {
      if (pat.t && term.t && !matchPattern(pat.t, term.t, sub, bound)) return false;
      const b2 = new Set(bound); b2.add(term.x);
      return matchPattern(subst(pat.b, pat.x, Var(term.x)), term.b, sub, b2);
    }
    default: return false;
  }
}

/* ------------------------------------------------------------------- télescopes */

/**
 * Ouvre les Π successifs d'un énoncé. Chaque liant devient soit une
 * métavariable (liant dépendant ou implicite), soit un argument à prouver
 * (flèche : `A → B`).
 */
export function openTelescope(type, sub = new Map()) {
  const args = [];
  let t = type;
  while (t.k === 'pi') {
    const dependent = t.x !== '_' && occursIn(t.b, t.x);
    if (dependent || t.implicit) {
      const m = freshMVar(t.x === '_' ? 'm' : t.x);
      args.push({ kind: 'mvar', mvar: m, type: t.t, name: t.x });
      t = subst(t.b, t.x, m);
    } else {
      args.push({ kind: 'goal', type: t.t, name: t.x });
      t = t.b;
    }
  }
  return { args, concl: t };
}

function occursIn(e, name) {
  for (const v of freeVars(e)) if (v === name) return true;
  return false;
}

/* ------------------------------------------------------------ environnement */

export function makeEnv({ lib = new Map(), ctx = [], arith = false } = {}) {
  return { lib, ctx, arith, opts: { arith } };
}

export const lookupHyp = (ctx, name) => ctx.find((h) => h.name === name) ?? null;

export function lookupLemma(env, name) {
  const entry = env.lib.get(name);
  if (!entry) return null;
  return entry;
}

/**
 * Type d'un identifiant : hypothèse locale d'abord, puis bibliothèque.
 * Renvoie { type, source } ou null.
 */
export function resolveName(env, name) {
  const h = lookupHyp(env.ctx, name);
  if (h) return { type: h.type, source: 'hyp', name };
  const l = lookupLemma(env, name);
  if (l) return { type: l.type, source: 'lib', name, entry: l };
  return null;
}

/* -------------------------------------------------------------- élaboration */

/** Insère des métavariables pour les liants implicites en tête. */
function instImplicits(type, sub) {
  while (type.k === 'pi' && type.implicit) {
    const m = freshMVar(type.x);
    type = subst(type.b, type.x, m);
  }
  return type;
}

/** Type inféré de `e`, ou lève une ElabError. `sub` accumule les affectations. */
export function infer(e, env, sub = new Map()) {
  switch (e.k) {
    case 'lit': return NAT;
    case 'sort': return PROP;
    case 'mvar': return Const('_');
    case 'var': case 'const': {
      if (isHole(e)) return Const('_');
      const name = e.n;
      if (name === 'rfl') throw new ElabError('`rfl` a besoin de connaître l’objectif : utilise-le comme tactique, ou `exact rfl`.');
      const r = resolveName(env, name);
      if (r) return r.type;
      if (name === 'Nat.succ') return Pi('_', NAT, NAT);
      if (name === 'Nat.zero') return NAT;
      if (name === 'True' || name === 'False') return PROP;
      throw new ElabError(`identifiant inconnu : \`${name}\``);
    }
    case 'app': {
      const { head, args } = unfold(e);
      if (head.k === 'const' && head.n === '⟨⟩') {
        throw new ElabError('le constructeur anonyme ⟨…⟩ a besoin d’un type attendu.');
      }
      let type = infer(head, env, sub);
      for (const arg of args) {
        type = whnfHead(instImplicits(instantiate(type, sub), sub));
        if (type.k !== 'pi') {
          throw new ElabError(`trop d’arguments : \`${show(head)}\` n’attend pas \`${show(arg)}\`.`);
        }
        checkArg(arg, type.t, env, sub);
        type = type.x === '_' ? type.b : subst(type.b, type.x, arg);
      }
      return instantiate(type, sub);
    }
    case 'lam': {
      if (isHole(e.t)) throw new ElabError('impossible de deviner le type de la variable liée ; précise-le ou utilise `intro`.');
      const env2 = { ...env, ctx: [...env.ctx, { name: e.x, type: e.t }] };
      return Pi(e.x, e.t, infer(e.b, env2, sub));
    }
    case 'pi': return PROP;
    default: throw new ElabError('terme non pris en charge.');
  }
}

function checkArg(arg, expected, env, sub) {
  try { check(arg, instantiate(expected, sub), env, sub); }
  catch (err) {
    if (err instanceof ElabError) throw err;
    throw new ElabError(String(err.message ?? err));
  }
}

/** Vérifie que `e` a le type `expected` (élaboration dirigée par le type). */
export function check(e, expected, env, sub = new Map()) {
  expected = instantiate(expected, sub);

  if ((e.k === 'var' || e.k === 'const') && e.n === 'rfl') {
    const eq = match(norm(expected, env.opts), 'Eq', 2) ?? match(norm(expected, env.opts), 'Iff', 2);
    if (!eq) throw new ElabError(`\`rfl\` prouve une égalité, pas \`${show(expected)}\`.`);
    if (!defEq(eq[0], eq[1], env.opts)) {
      throw new ElabError(`\`rfl\` échoue : \`${show(eq[0])}\` et \`${show(eq[1])}\` ne sont pas identiques.`);
    }
    return expected;
  }

  if (e.k === 'lam') {
    const exp = norm(expected, env.opts);
    if (exp.k !== 'pi') throw new ElabError(`une fonction ne prouve pas \`${show(expected)}\`.`);
    const bt = isHole(e.t) ? exp.t : e.t;
    const env2 = { ...env, ctx: [...env.ctx, { name: e.x, type: bt }] };
    const body = exp.x === '_' ? exp.b : subst(exp.b, exp.x, Var(e.x));
    check(e.b, body, env2, sub);
    return expected;
  }

  const anon = match(e, '⟨⟩');
  if (anon) return checkAnon(anon, expected, env, sub);

  const actual = infer(e, env, sub);
  if (!unify(instantiate(actual, sub), expected, sub)
      && !defEq(instantiate(actual, sub), expected, env.opts)) {
    throw new ElabError(
      `types incompatibles.\n  attendu : ${show(expected)}\n  obtenu  : ${show(instantiate(actual, sub))}`);
  }
  return expected;
}

/** ⟨a, b, …⟩ contre ∧, ↔ ou ∃. */
function checkAnon(args, expected, env, sub) {
  const exp = norm(expected, env.opts);
  const and = match(exp, 'And', 2);
  const iff = match(exp, 'Iff', 2);
  const ex = match(exp, 'Exists', 1);
  const rest = () => (args.length === 2 ? args[1] : apps(Const('⟨⟩'), ...args.slice(1)));

  if (args.length < 2) throw new ElabError('⟨…⟩ attend au moins deux composantes.');
  if (and) {
    check(args[0], and[0], env, sub);
    check(rest(), and[1], env, sub);
    return expected;
  }
  if (iff) {
    check(args[0], Pi('_', iff[0], iff[1]), env, sub);
    check(rest(), Pi('_', iff[1], iff[0]), env, sub);
    return expected;
  }
  if (ex && ex[0].k === 'lam') {
    const witness = args[0];
    check(rest(), subst(ex[0].b, ex[0].x, witness), env, sub);
    return expected;
  }
  throw new ElabError(`⟨…⟩ ne construit pas \`${show(expected)}\`.`);
}

/* ---------------------------------------------------------------- réécriture */

/**
 * Réécrit `target` avec l'équation `eqType` (∀ … , lhs = rhs).
 * Sémantique de Lean : on instancie sur la première occurrence trouvée, puis on
 * remplace toutes les occurrences de cette instance.
 */
export function rewriteWith(target, eqType, { reverse = false } = {}) {
  const { args, concl } = openTelescope(eqType);
  if (args.some((a) => a.kind === 'goal')) {
    return { error: 'cette règle a des hypothèses : prouve-les d’abord (`apply`) ou utilise `rw` avec un lemme sans prémisse.' };
  }
  const eq = match(concl, 'Eq', 2) ?? match(concl, 'Iff', 2);
  if (!eq) return { error: `\`rw\` attend une égalité ou une équivalence, pas \`${show(concl)}\`.` };
  const [l, r] = reverse ? [eq[1], eq[0]] : [eq[0], eq[1]];

  for (const { expr, bound } of subterms(target)) {
    const sub = new Map();
    if (!matchPattern(l, expr, sub, bound)) continue;
    const from = instantiate(l, sub);
    const to = instantiate(r, sub);
    const leftover = metaVars(to);
    for (const m of metaVars(from)) leftover.delete(m);
    if (leftover.size) {
      return { error: `impossible de déterminer ${[...leftover].join(', ')} : donne l’argument explicitement, par exemple \`rw [le_lemme x]\`.` };
    }
    if (metaVars(from).size) continue;
    const { expr: out, count } = replaceAll(target, from, to);
    if (count === 0) continue;
    return { expr: out, from, to, count };
  }
  return { error: `le motif \`${show(reverse ? eq[1] : eq[0])}\` n’apparaît pas dans \`${show(target)}\`.` };
}
