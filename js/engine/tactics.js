// Les tactiques. Chacune prend un état de preuve et rend un nouvel état, ou
// lève une TacticError avec un message que l'apprenant peut lire.
//
// Comme dans Lean, une tactique agit sur le *premier* objectif de la liste.

import {
  Var, Const, App, Pi, Lit, apps, alphaEq, subst, instantiate, freeVars,
  metaVars, avoid, match, mkSucc, unfold as unfoldApp,
} from './expr.js';
import { parse, ParseError } from './parser.js';
import { show } from './printer.js';
import { defEq, norm, whnfHead } from './reduce.js';
import {
  ElabError, unify, check, infer, openTelescope, rewriteWith, lookupHyp, resolveName,
} from './elab.js';
import { ringEq, toPoly, showPoly } from './ring.js';

export class TacticError extends Error {
  constructor(msg) { super(msg); this.name = 'TacticError'; }
}

let goalId = 0;
export const mkGoal = (ctx, target) => ({ id: ++goalId, ctx, target });

export const initialState = (ctx, target) => ({ goals: [mkGoal(ctx, target)], sorried: false });

const fail = (msg) => { throw new TacticError(msg); };
const NAT = Const('ℕ');
const FALSE = Const('False');
const TRUE = Const('True');

/* ------------------------------------------------------------------ outillage */

function splitTop(src, sep = ',') {
  const out = [];
  let depth = 0, cur = '';
  for (const c of src) {
    if ('([⟨{'.includes(c)) depth++;
    if (')]⟩}'.includes(c)) depth--;
    if (c === sep && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Extrait `[a, b, c]` en tête de chaîne. */
function bracketList(rest) {
  const s = rest.trim();
  if (!s.startsWith('[')) return null;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if ('([⟨{'.includes(s[i])) depth++;
    else if (')]⟩}'.includes(s[i])) {
      depth--;
      if (depth === 0) return { items: splitTop(s.slice(1, i)), rest: s.slice(i + 1).trim() };
    }
  }
  fail('crochet `]` manquant.');
}

function parseTerm(src, what = 'terme') {
  try { return parse(src); }
  catch (err) {
    if (err instanceof ParseError) fail(`${what} illisible : ${err.message}`);
    throw err;
  }
}

const envFor = (env, goal) => ({ ...env, ctx: goal.ctx });

function freshHypName(base, ctx) {
  return avoid(base, new Set(ctx.map((h) => h.name)));
}

/** Remplace le premier objectif par ceux fournis. */
const replaceFirst = (state, goals) => ({ ...state, goals: [...goals, ...state.goals.slice(1)] });

function closesByRfl(goal, env) {
  const eq = match(whnfHead(goal.target), 'Eq', 2) ?? match(whnfHead(goal.target), 'Iff', 2);
  return !!eq && defEq(eq[0], eq[1], env.opts);
}

function typeOfTerm(src, env, goal, what) {
  const term = parseTerm(src, what);
  try { return { term, type: instantiateAll(infer(term, envFor(env, goal))) }; }
  catch (err) {
    if (err instanceof ElabError) fail(err.message);
    throw err;
  }
}

const instantiateAll = (e) => e;

/* ------------------------------------------------------------------ tactiques */

const TACTICS = {};
const def = (name, arity, fn) => { TACTICS[name] = { name, fn, arity }; };

// ── rfl ────────────────────────────────────────────────────────────────────
def('rfl', 'none', (state, rest, env) => {
  const goal = state.goals[0];
  const t = whnfHead(goal.target);
  const eq = match(t, 'Eq', 2) ?? match(t, 'Iff', 2);
  if (!eq) fail(`\`rfl\` clôt une égalité \`a = a\`, mais l’objectif est \`${show(goal.target)}\`.`);
  if (!defEq(eq[0], eq[1], env.opts)) {
    fail(`les deux membres ne sont pas identiques :\n  gauche : ${show(eq[0])}\n  droite : ${show(eq[1])}\nContinue à réécrire jusqu’à ce qu’ils coïncident.`);
  }
  return replaceFirst(state, []);
});

// ── intro / intros ─────────────────────────────────────────────────────────
def('intro', 'names', (state, rest, env) => {
  const goal = state.goals[0];
  const names = rest.trim() ? splitTop(rest.trim(), ' ').filter(Boolean) : [null];
  let ctx = [...goal.ctx], target = goal.target;
  for (const wanted of names) {
    const t = whnfHead(target);
    if (t.k !== 'pi') {
      fail(`\`intro\` a besoin d’une implication ou d’un ∀ : l’objectif \`${show(target)}\` n’en est pas.`);
    }
    const base = wanted ?? (t.x !== '_' ? t.x : (t.t.k === 'sort' || alphaEq(t.t, NAT) ? 'a' : 'h'));
    const name = freshHypName(base, ctx);
    ctx = [...ctx, { name, type: t.t }];
    target = t.x === '_' ? t.b : subst(t.b, t.x, Var(name));
  }
  return replaceFirst(state, [mkGoal(ctx, target)]);
});
def('intros', 'none', (state, rest, env) => {
  let cur = state;
  for (let i = 0; i < 20; i++) {
    const t = whnfHead(cur.goals[0].target);
    if (t.k !== 'pi') break;
    cur = TACTICS.intro.fn(cur, '', env);
  }
  return cur;
});

// ── exact ──────────────────────────────────────────────────────────────────
def('exact', 'term', (state, rest, env) => {
  const goal = state.goals[0];
  if (!rest.trim()) fail('`exact` attend un terme, par exemple `exact h`.');
  const term = parseTerm(rest, 'terme');
  try { check(term, goal.target, envFor(env, goal)); }
  catch (err) {
    if (err instanceof ElabError) fail(err.message);
    throw err;
  }
  return replaceFirst(state, []);
});

// ── apply ──────────────────────────────────────────────────────────────────
def('apply', 'term', (state, rest, env) => {
  const goal = state.goals[0];
  if (!rest.trim()) fail('`apply` attend un lemme, par exemple `apply le_trans a b c`.');
  const { type } = typeOfTerm(rest, env, goal, 'lemme');
  const { args, concl } = openTelescope(type);
  const sub = new Map();
  if (!unify(concl, goal.target, sub)) {
    fail(`la conclusion de ce lemme est \`${show(concl)}\`, elle ne s’ajuste pas à l’objectif \`${show(goal.target)}\`.`);
  }
  const newGoals = [];
  for (const a of args) {
    if (a.kind !== 'goal') continue;
    const t = instantiate(a.type, sub);
    const left = metaVars(t);
    if (left.size) {
      fail(`impossible de deviner ${[...left].join(', ')} dans \`${show(t)}\`.\nDonne les arguments explicitement, par exemple \`apply le_trans a b c\`.`);
    }
    newGoals.push(mkGoal(goal.ctx, t));
  }
  return replaceFirst(state, newGoals);
});

// ── rw ─────────────────────────────────────────────────────────────────────
def('rw', 'rules', (state, rest, env) => {
  const list = bracketList(rest);
  if (!list) fail('`rw` attend une liste entre crochets, par exemple `rw [add_zero]`.');
  let target = null, hypName = null;
  const at = list.rest.match(/^at\s+(\S+)$/);
  if (list.rest && !at) fail(`\`${list.rest}\` inattendu après \`rw [...]\` (seul \`at h\` est accepté).`);
  if (at) hypName = at[1];

  let cur = state;
  for (const raw of list.items) {
    const goal = cur.goals[0];
    if (!goal) fail('plus aucun objectif : la réécriture précédente a déjà tout fermé.');
    let src = raw.trim(), reverse = false;
    if (src.startsWith('←') || src.startsWith('<-')) {
      reverse = true;
      src = src.replace(/^(←|<-)/, '').trim();
    }
    const { type } = typeOfTerm(src, env, goal, 'règle de réécriture');

    if (hypName) {
      const h = lookupHyp(goal.ctx, hypName);
      if (!h) fail(`aucune hypothèse ne s’appelle \`${hypName}\`.`);
      const res = rewriteWith(h.type, type, { reverse });
      if (res.error) fail(res.error);
      const ctx = goal.ctx.map((x) => (x.name === hypName ? { ...x, type: res.expr } : x));
      cur = replaceFirst(cur, [mkGoal(ctx, goal.target)]);
    } else {
      const res = rewriteWith(goal.target, type, { reverse });
      if (res.error) fail(res.error);
      const next = mkGoal(goal.ctx, res.expr);
      cur = closesByRfl(next, env) ? replaceFirst(cur, []) : replaceFirst(cur, [next]);
    }
  }
  return cur;
});

// ── induction ──────────────────────────────────────────────────────────────
def('induction', 'name', (state, rest, env) => {
  const goal = state.goals[0];
  const m = rest.trim().match(/^(\S+)(?:\s+with\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?)?$/);
  if (!m) fail('`induction` attend une variable, par exemple `induction n` ou `induction n with k ih`.');
  const [, varName, n1, n2, n3] = m;
  const hyp = lookupHyp(goal.ctx, varName);
  if (!hyp) fail(`\`${varName}\` n’est pas dans le contexte : sur quoi veux-tu faire la récurrence ?`);

  const dependents = goal.ctx.filter((h) => h.name !== varName && freeVars(h.type).has(varName));
  if (dependents.length) {
    fail(`l’hypothèse \`${dependents[0].name}\` parle de \`${varName}\` : la récurrence casserait le contexte. Reformule l’énoncé pour la quantifier.`);
  }
  const others = goal.ctx.filter((h) => h.name !== varName);
  const listElem = match(hyp.type, 'List', 1);

  // ── récurrence sur une liste : cas [] et cas x :: t ────────────────────
  if (listElem) {
    const nilGoal = mkGoal(others, subst(goal.target, varName, Const('List.nil')));
    const head = freshHypName(n1 ?? 'x', others);
    const ctxTail = [...others, { name: head, type: listElem[0] }];
    const tail = freshHypName(n2 ?? varName, ctxTail);
    const ctxCons = [...ctxTail, { name: tail, type: hyp.type }];
    const ih = freshHypName(n3 ?? 'ih', ctxCons);
    const consGoal = mkGoal(
      [...ctxCons, { name: ih, type: subst(goal.target, varName, Var(tail)) }],
      subst(goal.target, varName, apps(Const('List.cons'), Var(head), Var(tail))));
    return replaceFirst(state, [nilGoal, consGoal]);
  }

  if (!alphaEq(hyp.type, NAT) && !(hyp.type.k === 'const' && hyp.type.n === '_')) {
    fail(`la récurrence de ce jeu marche sur ℕ et sur les listes, et \`${varName} : ${show(hyp.type)}\`.`);
  }

  // ── récurrence sur ℕ : cas 0 et cas succ k ─────────────────────────────
  const zeroGoal = mkGoal(others, subst(goal.target, varName, Lit(0)));
  const k = freshHypName(n1 ?? varName, others);
  const ctxSucc = [...others, { name: k, type: NAT }];
  const ih = freshHypName(n2 ?? 'ih', ctxSucc);
  const succGoal = mkGoal(
    [...ctxSucc, { name: ih, type: subst(goal.target, varName, Var(k)) }],
    subst(goal.target, varName, mkSucc(Var(k))));
  return replaceFirst(state, [zeroGoal, succGoal]);
});

// ── cases ──────────────────────────────────────────────────────────────────
def('cases', 'name', (state, rest, env) => {
  const goal = state.goals[0];
  // `cases h`, `cases h with a b`, mais aussi `cases em p with hp hnp` : on
  // découpe d'abord le `with`, le reste est un terme quelconque — comme en Lean,
  // où l'on peut raisonner par cas sur n'importe quelle disjonction.
  const split = rest.trim().match(/^([\s\S]+?)(?:\s+with\s+(\S+)(?:\s+(\S+))?)?$/);
  if (!split) fail('`cases` attend une hypothèse ou un terme, par exemple `cases h` ou `cases em p with hp hnp`.');
  const [, subject, n1, n2] = split;
  const name = subject.trim();

  const hyp = lookupHyp(goal.ctx, name);
  let type;
  if (hyp) {
    type = hyp.type;
  } else {
    // Pas une hypothèse : on élabore le terme et on décompose son type. Le
    // contexte n'y perd rien, puisqu'il n'y avait rien à retirer.
    const { type: inferred } = typeOfTerm(name, env, goal, 'terme à décomposer');
    type = inferred;
  }
  const others = hyp ? goal.ctx.filter((h) => h.name !== name) : goal.ctx;
  const t = whnfHead(type);

  const and = match(t, 'And', 2);
  if (and) {
    const a = freshHypName(n1 ?? `${name}₁`, others);
    const b = freshHypName(n2 ?? `${name}₂`, [...others, { name: a }]);
    return replaceFirst(state, [mkGoal(
      [...others, { name: a, type: and[0] }, { name: b, type: and[1] }], goal.target)]);
  }
  const iff = match(t, 'Iff', 2);
  if (iff) {
    const a = freshHypName(n1 ?? 'mp', others);
    const b = freshHypName(n2 ?? 'mpr', [...others, { name: a }]);
    return replaceFirst(state, [mkGoal(
      [...others, { name: a, type: Pi('_', iff[0], iff[1]) }, { name: b, type: Pi('_', iff[1], iff[0]) }],
      goal.target)]);
  }
  const or = match(t, 'Or', 2);
  if (or) {
    const a = freshHypName(n1 ?? name, others);
    const b = freshHypName(n2 ?? name, others);
    return replaceFirst(state, [
      mkGoal([...others, { name: a, type: or[0] }], goal.target),
      mkGoal([...others, { name: b, type: or[1] }], goal.target),
    ]);
  }
  const ex = match(t, 'Exists', 1);
  if (ex && ex[0].k === 'lam') {
    const w = freshHypName(n1 ?? ex[0].x, others);
    const hw = freshHypName(n2 ?? `h${w}`, [...others, { name: w }]);
    return replaceFirst(state, [mkGoal(
      [...others, { name: w, type: ex[0].t }, { name: hw, type: subst(ex[0].b, ex[0].x, Var(w)) }],
      goal.target)]);
  }
  // La coupure sur ℕ substitue la variable dans l'objectif : elle n'a de sens
  // que pour une hypothèse du contexte, pas pour un terme quelconque.
  if (hyp && alphaEq(type, NAT)) {
    const zero = mkGoal(others, subst(goal.target, name, Lit(0)));
    const k = freshHypName(n1 ?? name, others);
    const succ = mkGoal([...others, { name: k, type: NAT }],
      subst(goal.target, name, mkSucc(Var(k))));
    return replaceFirst(state, [zero, succ]);
  }
  if (alphaEq(t, FALSE)) return replaceFirst(state, []);
  fail(`\`cases\` ne sait pas décomposer \`${show(type)}\`. Il travaille sur ∧, ∨, ↔, ∃, ℕ et False.`);
});

// ── constructor / left / right / use ───────────────────────────────────────
def('constructor', 'none', (state, rest, env) => {
  const goal = state.goals[0];
  const t = whnfHead(goal.target);
  const and = match(t, 'And', 2);
  if (and) return replaceFirst(state, [mkGoal(goal.ctx, and[0]), mkGoal(goal.ctx, and[1])]);
  const iff = match(t, 'Iff', 2);
  if (iff) {
    return replaceFirst(state, [
      mkGoal(goal.ctx, Pi('_', iff[0], iff[1])),
      mkGoal(goal.ctx, Pi('_', iff[1], iff[0]))]);
  }
  if (alphaEq(t, TRUE)) return replaceFirst(state, []);
  if (match(t, 'Exists', 1)) fail('pour un ∃, donne le témoin avec `use`.');
  fail(`\`constructor\` découpe ∧, ↔ et True, pas \`${show(goal.target)}\`.`);
});

const orSide = (side) => (state, rest, env) => {
  const goal = state.goals[0];
  const or = match(whnfHead(goal.target), 'Or', 2);
  if (!or) fail(`\`${side ? 'right' : 'left'}\` a besoin d’un ∨ dans l’objectif, or il vaut \`${show(goal.target)}\`.`);
  return replaceFirst(state, [mkGoal(goal.ctx, or[side ? 1 : 0])]);
};
def('left', 'none', orSide(0));
def('right', 'none', orSide(1));

def('use', 'term', (state, rest, env) => {
  const goal = state.goals[0];
  if (!rest.trim()) fail('`use` attend un témoin, par exemple `use 3`.');
  const ex = match(whnfHead(goal.target), 'Exists', 1);
  if (!ex || ex[0].k !== 'lam') fail(`\`use\` fournit le témoin d’un ∃, or l’objectif est \`${show(goal.target)}\`.`);
  const w = parseTerm(rest, 'témoin');
  const next = mkGoal(goal.ctx, subst(ex[0].b, ex[0].x, w));
  if (closesByRfl(next, env)) return replaceFirst(state, []);
  const trivialClose = tryAssumption(next, env);
  return replaceFirst(state, trivialClose ? [] : [next]);
});

// ── assumption / exfalso / contradiction / trivial ─────────────────────────
function tryAssumption(goal, env) {
  return goal.ctx.some((h) => defEq(h.type, goal.target, env.opts));
}
def('assumption', 'none', (state, rest, env) => {
  const goal = state.goals[0];
  if (!tryAssumption(goal, env)) {
    fail(`aucune hypothèse du contexte n’est \`${show(goal.target)}\`.`);
  }
  return replaceFirst(state, []);
});
def('exfalso', 'none', (state, rest, env) => {
  const goal = state.goals[0];
  return replaceFirst(state, [mkGoal(goal.ctx, FALSE)]);
});
def('contradiction', 'none', (state, rest, env) => {
  const goal = state.goals[0];
  const types = goal.ctx.map((h) => whnfHead(h.type));
  for (const t of types) if (alphaEq(t, FALSE)) return replaceFirst(state, []);
  for (const t of types) {
    if (t.k === 'pi' && alphaEq(t.b, FALSE)) {
      if (types.some((u) => defEq(u, t.t, env.opts))) return replaceFirst(state, []);
    }
    const eq = match(t, 'Eq', 2);
    if (eq && eq[0].k === 'lit' && eq[1].k === 'lit' && eq[0].v !== eq[1].v) return replaceFirst(state, []);
  }
  fail('aucune contradiction visible dans le contexte.');
});
def('trivial', 'none', (state, rest, env) => {
  const goal = state.goals[0];
  if (alphaEq(whnfHead(goal.target), TRUE)) return replaceFirst(state, []);
  if (closesByRfl(goal, env)) return replaceFirst(state, []);
  if (tryAssumption(goal, env)) return replaceFirst(state, []);
  fail(`\`trivial\` ne suffit pas pour \`${show(goal.target)}\`.`);
});

// ── have / revert ──────────────────────────────────────────────────────────
def('have', 'have', (state, rest, env) => {
  const goal = state.goals[0];
  const m = rest.match(/^(\S+)\s*:\s*([\s\S]+?):=([\s\S]+)$/);
  if (!m) fail('`have` s’écrit `have h : énoncé := preuve`.');
  const [, name, typeSrc, proofSrc] = m;
  const type = parseTerm(typeSrc, 'énoncé');
  const proof = parseTerm(proofSrc, 'preuve');
  try { check(proof, type, envFor(env, goal)); }
  catch (err) {
    if (err instanceof ElabError) fail(err.message);
    throw err;
  }
  const n = freshHypName(name, goal.ctx);
  return replaceFirst(state, [mkGoal([...goal.ctx, { name: n, type }], goal.target)]);
});

def('revert', 'name', (state, rest, env) => {
  const goal = state.goals[0];
  const name = rest.trim();
  const hyp = lookupHyp(goal.ctx, name);
  if (!hyp) fail(`aucune hypothèse ne s’appelle \`${name}\`.`);
  const others = goal.ctx.filter((h) => h.name !== name);
  const dep = others.find((h) => freeVars(h.type).has(name));
  if (dep) fail(`\`${dep.name}\` dépend de \`${name}\` : reverte-la d’abord.`);
  return replaceFirst(state, [mkGoal(others, Pi(name, hyp.type, goal.target))]);
});

// ── simp / unfold ──────────────────────────────────────────────────────────
function simpRules(env, extras, only) {
  const rules = [];
  if (!only) {
    for (const e of env.lib.values()) if (e.simp) rules.push({ name: e.name, type: e.type });
  }
  for (const src of extras) {
    const r = resolveName(env, src) ?? null;
    if (r) rules.push({ name: src, type: r.type });
    else rules.push({ name: src, type: parseTerm(src, 'lemme') });
  }
  return rules;
}

function simpExpr(expr, rules, env) {
  let cur = norm(expr, env.opts);
  for (let i = 0; i < 120; i++) {
    let progressed = false;
    for (const r of rules) {
      const res = rewriteWith(cur, r.type);
      if (res.error) continue;
      const next = norm(res.expr, env.opts);
      if (alphaEq(next, cur)) continue;
      cur = next; progressed = true; break;
    }
    if (!progressed) break;
  }
  return cur;
}

def('simp', 'simp', (state, rest, env) => {
  const goal = state.goals[0];
  let src = rest.trim();
  const only = src.startsWith('only');
  if (only) src = src.slice(4).trim();
  const list = src.startsWith('[') ? bracketList(src) : { items: [], rest: src };
  const at = list.rest.match(/^at\s+(\S+)$/);
  const rules = simpRules(env, list.items, only);
  if (!rules.length) fail('aucune règle de simplification disponible dans ce niveau.');

  if (at) {
    const h = lookupHyp(goal.ctx, at[1]);
    if (!h) fail(`aucune hypothèse ne s’appelle \`${at[1]}\`.`);
    const simplified = simpExpr(h.type, rules, env);
    if (alphaEq(simplified, h.type)) fail(`\`simp\` ne change rien dans \`${at[1]}\`.`);
    const ctx = goal.ctx.map((x) => (x.name === at[1] ? { ...x, type: simplified } : x));
    return replaceFirst(state, [mkGoal(ctx, goal.target)]);
  }
  const simplified = simpExpr(goal.target, rules, env);
  const next = mkGoal(goal.ctx, simplified);
  if (closesByRfl(next, env) || alphaEq(whnfHead(simplified), TRUE) || tryAssumption(next, env)) {
    return replaceFirst(state, []);
  }
  if (alphaEq(simplified, goal.target)) {
    fail(`\`simp\` ne progresse plus sur \`${show(goal.target)}\`. Il faut une idée : une récurrence, ou un lemme précis.`);
  }
  return replaceFirst(state, [next]);
});

const DEFS = {
  'Nat.add': ['add_zero', 'add_succ'],
  'Nat.mul': ['mul_zero', 'mul_succ'],
  'Nat.pow': ['pow_zero', 'pow_succ'],
  'Nat.le': ['le_iff_exists_add'],
  add: ['add_zero', 'add_succ'],
  mul: ['mul_zero', 'mul_succ'],
  pow: ['pow_zero', 'pow_succ'],
  le: ['le_iff_exists_add'],
};

def('unfold', 'name', (state, rest, env) => {
  const goal = state.goals[0];
  const m = rest.trim().match(/^(\S+)(?:\s+at\s+(\S+))?$/);
  if (!m) fail('`unfold` attend un nom, par exemple `unfold Nat.le`.');
  const [, name, hypName] = m;
  if (name === 'Not' || name === 'Ne') {
    const target = norm(goal.target, env.opts);
    return replaceFirst(state, [mkGoal(goal.ctx, target)]);
  }
  const defs = DEFS[name];
  if (!defs) fail(`je ne connais pas la définition de \`${name}\`.`);
  const rules = [];
  for (const d of defs) {
    const r = resolveName(env, d);
    if (r) rules.push({ name: d, type: r.type });
  }
  if (!rules.length) fail(`les équations de \`${name}\` ne sont pas encore débloquées dans ce niveau.`);
  if (hypName) {
    const h = lookupHyp(goal.ctx, hypName);
    if (!h) fail(`aucune hypothèse ne s’appelle \`${hypName}\`.`);
    const out = simpExpr(h.type, rules, env);
    const ctx = goal.ctx.map((x) => (x.name === hypName ? { ...x, type: out } : x));
    return replaceFirst(state, [mkGoal(ctx, goal.target)]);
  }
  const out = simpExpr(goal.target, rules, env);
  const next = mkGoal(goal.ctx, out);
  return closesByRfl(next, env) ? replaceFirst(state, []) : replaceFirst(state, [next]);
});

// ── ring / norm_num / decide ───────────────────────────────────────────────
def('ring', 'none', (state, rest, env) => {
  const goal = state.goals[0];
  const eq = match(whnfHead(goal.target), 'Eq', 2);
  if (!eq) fail(`\`ring\` clôt une égalité entre expressions arithmétiques, pas \`${show(goal.target)}\`.`);
  if (!ringEq(eq[0], eq[1])) {
    fail(`\`ring\` normalise les deux membres et n’obtient pas la même chose :\n  ${showPoly(toPoly(eq[0]))}\n  ${showPoly(toPoly(eq[1]))}`);
  }
  return replaceFirst(state, []);
});

def('norm_num', 'none', (state, rest, env) => {
  const goal = state.goals[0];
  const opts = { arith: true };
  const t = norm(whnfHead(goal.target), opts);
  const eq = match(t, 'Eq', 2);
  if (eq && defEq(eq[0], eq[1], opts)) return replaceFirst(state, []);
  const ne = match(t, 'Not', 1) && match(match(t, 'Not', 1)[0], 'Eq', 2);
  if (ne && ne[0].k === 'lit' && ne[1].k === 'lit' && ne[0].v !== ne[1].v) return replaceFirst(state, []);
  for (const [name, op] of [['Nat.le', (a, b) => a <= b], ['Nat.lt', (a, b) => a < b],
    ['Nat.ge', (a, b) => a >= b], ['Nat.gt', (a, b) => a > b]]) {
    const cmp = match(t, name, 2);
    if (cmp && cmp[0].k === 'lit' && cmp[1].k === 'lit' && op(cmp[0].v, cmp[1].v)) {
      return replaceFirst(state, []);
    }
  }
  if (eq && ringEq(eq[0], eq[1])) return replaceFirst(state, []);
  fail(`\`norm_num\` ne conclut pas sur \`${show(goal.target)}\` : il calcule, il ne raisonne pas.`);
});
TACTICS.decide = { ...TACTICS.norm_num, name: 'decide' };

// ── sorry ──────────────────────────────────────────────────────────────────
def('sorry', 'none', (state, rest, env) => ({
  ...replaceFirst(state, []), sorried: true,
}));

// ── calc ───────────────────────────────────────────────────────────────────

/**
 * Chaîne d'égalités, comme en Lean 4 :
 *
 *   calc (a + b) * c = a * c + b * c := by rw [add_mul]
 *     _ = c * a + b * c := by rw [mul_comm a c]
 *
 * Chaque étape est une égalité justifiée après `:=`, par `by <tactique>` ou par
 * un terme. Le `_` reprend le membre droit de l'étape précédente. Au bout, la
 * chaîne doit prouver exactement l'objectif — la transitivité est implicite,
 * c'est tout l'intérêt : une preuve qui se lit de haut en bas.
 */
def('calc', 'block', (state, rest, env) => {
  const goal = state.goals[0];
  const steps = rest.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!steps.length) fail('`calc` attend au moins une étape : `calc a = b := by rfl`.');

  let start = null, cursor = null;
  steps.forEach((line, i) => {
    const cut = line.indexOf(':=');
    if (cut < 0) {
      fail(`étape ${i + 1} : il manque la justification. Écris \`… = … := by <tactique>\`.`);
    }
    const claim = parseTerm(line.slice(0, cut), `étape ${i + 1} de calc`);
    const justif = line.slice(cut + 2).trim();
    const eq = match(claim, 'Eq', 2);
    if (!eq) {
      fail(`étape ${i + 1} : \`calc\` enchaîne des égalités, et \`${show(claim)}\` n’en est pas une.`);
    }
    let [left, right] = eq;
    const isHole = (e) => e.k === 'const' && e.n === '_';
    if (i === 0) {
      if (isHole(left)) fail('la première étape doit nommer son membre gauche, pas `_`.');
      start = left;
    } else if (isHole(left)) {
      left = cursor;
    } else if (!defEq(left, cursor, env.opts)) {
      fail(`étape ${i + 1} : le membre gauche \`${show(left)}\` ne reprend pas \`${show(cursor)}\`,`
        + ' le membre droit de l’étape précédente. Utilise `_` pour le reprendre.');
    }

    // Chaque étape est une petite preuve autonome, dans le contexte du niveau.
    const sub = { goals: [mkGoal(goal.ctx, apps(Const('Eq'), left, right))], sorried: false };
    let out;
    if (/^by\b/.test(justif)) {
      out = sub;
      for (const tac of splitTop(justif.replace(/^by\s*/, ''), ';')) {
        if (!out.goals.length) fail(`étape ${i + 1} : \`${tac}\` arrive après la fin de l’étape.`);
        try { out = runTactic(out, tac, env); }
        catch (err) {
          if (err instanceof TacticError) fail(`étape ${i + 1} — ${err.message}`);
          throw err;
        }
      }
    } else {
      if (!justif) fail(`étape ${i + 1} : justification vide après \`:=\`.`);
      const term = parseTerm(justif, `justification de l’étape ${i + 1}`);
      try { check(term, sub.goals[0].target, envFor(env, sub.goals[0])); out = { goals: [], sorried: false }; }
      catch (err) {
        if (err instanceof ElabError) fail(`étape ${i + 1} — ${err.message}`);
        throw err;
      }
    }
    if (out.goals.length) {
      fail(`étape ${i + 1} : \`${show(left)} = ${show(right)}\` n’est pas démontrée.`
        + `\nIl reste : ${show(out.goals[0].target)}`);
    }
    if (out.sorried) fail(`étape ${i + 1} fermée par \`sorry\` : la chaîne ne compte pas.`);
    cursor = right;
  });

  const proved = apps(Const('Eq'), start, cursor);
  if (!defEq(proved, goal.target, env.opts)) {
    fail(`la chaîne démontre \`${show(proved)}\`, or l’objectif est \`${show(goal.target)}\`.`);
  }
  return replaceFirst(state, []);
});

// ── combinateurs ───────────────────────────────────────────────────────────
def('repeat', 'tactic', (state, rest, env) => {
  let cur = state;
  for (let i = 0; i < 60; i++) {
    if (!cur.goals.length) break;
    try { cur = runTactic(cur, rest, env); }
    catch { break; }
  }
  if (cur === state) fail(`\`repeat ${rest.trim()}\` n’a rien pu appliquer.`);
  return cur;
});

def('all_goals', 'tactic', (state, rest, env) => {
  if (!state.goals.length) fail('aucun objectif.');
  const collected = [];
  let sorried = state.sorried;
  for (const g of state.goals) {
    const single = { goals: [g], sorried: false };
    const out = runTactic(single, rest, env);
    collected.push(...out.goals);
    sorried = sorried || out.sorried;
  }
  return { goals: collected, sorried };
});

/* -------------------------------------------------------------------- moteur */

export const TACTIC_NAMES = Object.keys(TACTICS);

/** Exécute une ligne de tactique. Lève TacticError en cas d'échec. */
export function runTactic(state, line, env) {
  const src = line.trim().replace(/;\s*$/, '');
  if (!src) return state;
  const m = src.match(/^([A-Za-z_][A-Za-z0-9_'.]*)\s*([\s\S]*)$/);
  if (!m) fail(`\`${src}\` n’est pas une tactique.`);
  const [, name, rest] = m;
  const tac = TACTICS[name];
  if (!tac) {
    fail(`\`${name}\` n’est pas une tactique de ce moteur. Tactiques connues : ${TACTIC_NAMES.join(', ')}.`);
  }
  if (env.tactics && !env.tactics.has(name)) {
    fail(`\`${name}\` n’est pas encore débloquée. Ici tu disposes de : ${[...env.tactics].join(', ')}.`);
  }
  if (!state.goals.length) fail('il n’y a plus d’objectif : la preuve est déjà terminée.');
  return tac.fn(state, rest, env);
}
