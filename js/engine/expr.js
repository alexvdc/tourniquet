// Représentation des expressions. Variables nommées (pas de de Bruijn) : le
// domaine est petit et contrôlé, et les noms rendent l'affichage lisible pour
// l'apprenant. La substitution renomme les liants en cas de capture.

export const Var = (n) => ({ k: 'var', n });
export const Const = (n) => ({ k: 'const', n });
export const App = (f, a) => ({ k: 'app', f, a });
export const Lam = (x, t, b) => ({ k: 'lam', x, t, b });
export const Pi = (x, t, b, implicit = false) => ({ k: 'pi', x, t, b, implicit });
export const Arrow = (a, b) => Pi('_', a, b);
export const MVar = (n) => ({ k: 'mvar', n });
export const Lit = (v) => ({ k: 'lit', v });
export const Sort = (u) => ({ k: 'sort', u });

export const apps = (f, ...args) => args.reduce(App, f);

// Constantes structurantes reconnues par l'imprimeur et les tactiques.
export const EQ = 'Eq', NE = 'Ne', AND = 'And', OR = 'Or', IFF = 'Iff';
export const NOT = 'Not', EXISTS = 'Exists', FALSE = 'False', TRUE = 'True';
export const ADD = 'Nat.add', MUL = 'Nat.mul', POW = 'Nat.pow', SUB = 'Nat.sub';
export const LE = 'Nat.le', LT = 'Nat.lt', SUCC = 'Nat.succ', NAT = 'ℕ';

export const mkEq = (a, b) => apps(Const(EQ), a, b);
export const mkSucc = (a) => App(Const(SUCC), a);

/** Décompose une application en (tête, arguments). */
export function unfold(e) {
  const args = [];
  while (e.k === 'app') { args.unshift(e.a); e = e.f; }
  return { head: e, args };
}

/** Reconnaît `C a b ...` et renvoie les arguments, ou null. */
export function match(e, name, arity) {
  const { head, args } = unfold(e);
  if (head.k !== 'const' || head.n !== name) return null;
  if (arity !== undefined && args.length !== arity) return null;
  return args;
}

export const isEq = (e) => match(e, EQ, 2);
export const isArrow = (e) => e.k === 'pi' && e.x === '_';

export function freeVars(e, acc = new Set(), bound = new Set()) {
  switch (e.k) {
    case 'var': if (!bound.has(e.n)) acc.add(e.n); break;
    case 'app': freeVars(e.f, acc, bound); freeVars(e.a, acc, bound); break;
    case 'lam': case 'pi': {
      if (e.t) freeVars(e.t, acc, bound);
      const b2 = new Set(bound); b2.add(e.x);
      freeVars(e.b, acc, b2);
      break;
    }
  }
  return acc;
}

export function metaVars(e, acc = new Set()) {
  switch (e.k) {
    case 'mvar': acc.add(e.n); break;
    case 'app': metaVars(e.f, acc); metaVars(e.a, acc); break;
    case 'lam': case 'pi': if (e.t) metaVars(e.t, acc); metaVars(e.b, acc); break;
  }
  return acc;
}

let freshCounter = 0;
export const resetFresh = () => { freshCounter = 0; };
export const freshName = (base = 'x') => `${base}✦${++freshCounter}`;
export const freshMVar = (base = 'm') => MVar(`?${base}${++freshCounter}`);

/** Nom disponible dérivé de `base`, évitant `used`. */
export function avoid(base, used) {
  const stem = base.replace(/[✦†].*$/, '') || 'x';
  if (!used.has(stem)) return stem;
  for (let i = 1; i < 500; i++) {
    const cand = `${stem}${i === 1 ? '✝' : '✝' + i}`;
    if (!used.has(cand)) return cand;
  }
  return freshName(stem);
}

/** e[name := val], avec évitement de capture. */
export function subst(e, name, val) {
  switch (e.k) {
    case 'var': return e.n === name ? val : e;
    case 'app': {
      const f = subst(e.f, name, val), a = subst(e.a, name, val);
      return f === e.f && a === e.a ? e : App(f, a);
    }
    case 'lam': case 'pi': {
      const t = e.t ? subst(e.t, name, val) : e.t;
      if (e.x === name) return t === e.t ? e : { ...e, t };
      let node = e, x = e.x, body = e.b;
      if (freeVars(val).has(x)) {
        const used = new Set([...freeVars(val), ...freeVars(body)]);
        const nx = avoid(x, used);
        body = subst(body, x, Var(nx));
        x = nx;
      }
      const b = subst(body, name, val);
      return { ...node, x, t, b };
    }
    default: return e;
  }
}

/** Substitution simultanée d'un dictionnaire de métavariables. */
export function instantiate(e, sub) {
  if (!sub || sub.size === 0) return e;
  switch (e.k) {
    case 'mvar': {
      const v = sub.get(e.n);
      return v === undefined ? e : instantiate(v, sub);
    }
    case 'app': {
      const f = instantiate(e.f, sub), a = instantiate(e.a, sub);
      return f === e.f && a === e.a ? e : App(f, a);
    }
    case 'lam': case 'pi': {
      const t = e.t ? instantiate(e.t, sub) : e.t;
      // Une métavariable du corps peut valoir un terme contenant une variable
      // libre homonyme du liant : il faut renommer le liant avant d'instancier.
      let x = e.x, body = e.b;
      const incoming = incomingNames(body, sub);
      if (incoming.has(x)) {
        const nx = avoid(x, new Set([...incoming, ...freeVars(body)]));
        body = subst(body, x, Var(nx));
        x = nx;
      }
      const b = instantiate(body, sub);
      return t === e.t && b === e.b && x === e.x ? e : { ...e, x, t, b };
    }
    default: return e;
  }
}

/** Variables libres qu'une instanciation va faire entrer dans ce sous-terme. */
function incomingNames(body, sub) {
  const out = new Set();
  for (const m of metaVars(body)) {
    const v = sub.get(m);
    if (v !== undefined) for (const n of freeVars(v)) out.add(n);
  }
  return out;
}

/** Égalité à renommage des liants près. */
export function alphaEq(a, b, ren = new Map()) {
  if (a === b) return true;
  if (a.k !== b.k) return false;
  switch (a.k) {
    case 'var': return (ren.get(a.n) ?? a.n) === b.n;
    case 'const': return a.n === b.n;
    case 'mvar': return a.n === b.n;
    case 'lit': return a.v === b.v;
    case 'sort': return a.u === b.u;
    case 'app': return alphaEq(a.f, b.f, ren) && alphaEq(a.a, b.a, ren);
    case 'lam': case 'pi': {
      if (!!a.t !== !!b.t) return false;
      if (a.t && !alphaEq(a.t, b.t, ren)) return false;
      const r2 = new Map(ren); r2.set(a.x, b.x);
      return alphaEq(a.b, b.b, r2);
    }
    default: return false;
  }
}

/** Applique `fn` à chaque sous-terme (post-ordre), en reconstruisant l'arbre. */
export function mapSub(e, fn) {
  switch (e.k) {
    case 'app': {
      const f = mapSub(e.f, fn), a = mapSub(e.a, fn);
      return fn(f === e.f && a === e.a ? e : App(f, a));
    }
    case 'lam': case 'pi': {
      const t = e.t ? mapSub(e.t, fn) : e.t;
      const b = mapSub(e.b, fn);
      return fn(t === e.t && b === e.b ? e : { ...e, t, b });
    }
    default: return fn(e);
  }
}

/** Remplace toutes les occurrences alpha-équivalentes à `from` par `to`. */
export function replaceAll(e, from, to) {
  let count = 0;
  const go = (x) => {
    if (alphaEq(x, from)) { count++; return to; }
    switch (x.k) {
      case 'app': { const f = go(x.f), a = go(x.a); return f === x.f && a === x.a ? x : App(f, a); }
      case 'lam': case 'pi': {
        const t = x.t ? go(x.t) : x.t, b = go(x.b);
        return t === x.t && b === x.b ? x : { ...x, t, b };
      }
      default: return x;
    }
  };
  return { expr: go(e), count };
}

/** Parcourt les sous-termes de l'extérieur vers l'intérieur, gauche à droite. */
export function* subterms(e, bound = new Set()) {
  yield { expr: e, bound };
  switch (e.k) {
    case 'app':
      yield* subterms(e.f, bound);
      yield* subterms(e.a, bound);
      break;
    case 'lam': case 'pi': {
      if (e.t) yield* subterms(e.t, bound);
      const b2 = new Set(bound); b2.add(e.x);
      yield* subterms(e.b, b2);
      break;
    }
  }
}

export function size(e) {
  switch (e.k) {
    case 'app': return 1 + size(e.f) + size(e.a);
    case 'lam': case 'pi': return 1 + (e.t ? size(e.t) : 0) + size(e.b);
    default: return 1;
  }
}
