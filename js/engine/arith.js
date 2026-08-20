// Décision des inégalités linéaires : `omega` et `linarith`.
//
// Méthode : on met les hypothèses *et la négation de l'objectif* sous forme
// `Σ cᵢ·xᵢ + k ≥ 0`, on ajoute `x ≥ 0` pour chaque inconnue — on est dans ℕ,
// c'est l'information qui fait la moitié du travail — puis on élimine les
// variables une par une (Fourier–Motzkin). Si le système est contradictoire,
// c'est que l'objectif était vrai.
//
// Honnêteté : ce raisonnement est mené sur les rationnels. Il est donc *correct*
// mais *incomplet* sur les entiers — `2 * x = 1` est réfuté ici parce que ℕ
// impose x ≥ 0 et 2x = 1 n'a pas de solution rationnelle positive… mais un
// système comme `2 * x = 2 * y + 1` (impossible sur ℤ, possible sur ℚ) échappe à
// la méthode. Le vrai `omega` fait de l'arithmétique entière et n'a pas ce trou.

import { match } from './expr.js';
import { toPoly } from './ring.js';
import { whnfHead } from './reduce.js';

const CONST = '';

/** Forme linéaire d'une expression : Map(monôme → coefficient), '' = constante. */
const linear = (e) => toPoly(e);

/** a - b, comme forme linéaire. */
function difference(a, b) {
  const out = new Map(linear(a));
  for (const [k, v] of linear(b)) {
    const n = (out.get(k) ?? 0) - v;
    if (n === 0) out.delete(k); else out.set(k, n);
  }
  return out;
}

const shift = (form, delta) => {
  const out = new Map(form);
  const n = (out.get(CONST) ?? 0) + delta;
  if (n === 0) out.delete(CONST); else out.set(CONST, n);
  return out;
};

const negate = (form) => {
  const out = new Map();
  for (const [k, v] of form) out.set(k, -v);
  return out;
};

/**
 * Contraintes tirées d'un énoncé.
 * @param {object} type énoncé (hypothèse ou objectif)
 * @param {boolean} negated pour l'objectif : on ajoute sa négation
 * @returns {Array<Map>|null} contraintes « ≥ 0 », ou null si l'énoncé n'est pas linéaire
 */
export function constraintsOf(type, negated = false) {
  const t = whnfHead(type);

  const cmp = (name) => match(t, name, 2);
  const le = cmp('Nat.le'), lt = cmp('Nat.lt');
  const ge = cmp('Nat.ge'), gt = cmp('Nat.gt');
  const eq = cmp('Eq');

  // a ≤ b  ⟺  b - a ≥ 0        ;  sa négation : a - b - 1 ≥ 0
  if (le) {
    const [a, b] = le;
    return negated ? [shift(difference(a, b), -1)] : [difference(b, a)];
  }
  if (ge) {
    const [a, b] = ge;
    return negated ? [shift(difference(b, a), -1)] : [difference(a, b)];
  }
  // a < b  ⟺  b - a - 1 ≥ 0    ;  sa négation : a - b ≥ 0
  if (lt) {
    const [a, b] = lt;
    return negated ? [difference(a, b)] : [shift(difference(b, a), -1)];
  }
  if (gt) {
    const [a, b] = gt;
    return negated ? [difference(b, a)] : [shift(difference(a, b), -1)];
  }
  // a = b : deux inégalités. Sa négation ne se met pas sous forme d'un seul
  // système — l'appelant traite ce cas en deux passes.
  if (eq && !negated) {
    const [a, b] = eq;
    return [difference(a, b), difference(b, a)];
  }
  return null;
}

/** Toutes les inconnues d'un système. */
function unknowns(system) {
  const out = new Set();
  for (const c of system) for (const k of c.keys()) if (k !== CONST) out.add(k);
  return out;
}

const MAX_CONSTRAINTS = 600;

/**
 * Le système `Σ cᵢxᵢ + k ≥ 0` est-il contradictoire ?
 * @returns {boolean|null} true = contradictoire, false = satisfiable, null = abandon
 */
export function refutes(system) {
  let cs = system.map((c) => new Map(c));

  for (let round = 0; round < 40; round++) {
    // Contradiction visible : une contrainte sans inconnue et négative.
    for (const c of cs) {
      const vars = [...c.keys()].filter((k) => k !== CONST);
      if (!vars.length && (c.get(CONST) ?? 0) < 0) return true;
    }
    const vars = unknowns(cs);
    if (!vars.size) return false;

    // On élimine l'inconnue qui produira le moins de combinaisons.
    let best = null;
    for (const v of vars) {
      const pos = cs.filter((c) => (c.get(v) ?? 0) > 0).length;
      const neg = cs.filter((c) => (c.get(v) ?? 0) < 0).length;
      const cost = pos * neg;
      if (best === null || cost < best.cost) best = { v, cost };
    }
    const v = best.v;
    const pos = cs.filter((c) => (c.get(v) ?? 0) > 0);
    const neg = cs.filter((c) => (c.get(v) ?? 0) < 0);
    const rest = cs.filter((c) => !(c.get(v) ?? 0));

    const combined = [];
    for (const p of pos) {
      for (const n of neg) {
        const cp = p.get(v), cn = -n.get(v);
        const out = new Map();
        for (const [k, val] of p) if (k !== v) out.set(k, val * cn);
        for (const [k, val] of n) {
          if (k === v) continue;
          const cur = (out.get(k) ?? 0) + val * cp;
          if (cur === 0) out.delete(k); else out.set(k, cur);
        }
        combined.push(out);
      }
    }
    cs = [...rest, ...combined];
    if (cs.length > MAX_CONSTRAINTS) return null;
  }
  return null;
}

/**
 * Tente de démontrer `target` à partir des hypothèses du contexte.
 * @returns {{ok: true}|{ok: false, reason: string}}
 */
export function decideLinear(ctx, target) {
  const base = [];
  for (const hyp of ctx) {
    const cs = constraintsOf(hyp.type);
    if (cs) base.push(...cs);
  }

  const t = whnfHead(target);
  const eq = match(t, 'Eq', 2);

  const withNonNeg = (system) => {
    const out = [...system];
    // Toute inconnue vit dans ℕ : c'est souvent l'ingrédient décisif.
    for (const v of unknowns(system)) out.push(new Map([[v, 1]]));
    return out;
  };

  if (eq) {
    // Prouver `a = b`, c'est réfuter `a > b` puis réfuter `b > a`.
    const [a, b] = eq;
    const strictA = [shift(difference(a, b), -1)]; // a > b
    const strictB = [shift(difference(b, a), -1)]; // b > a
    const first = refutes(withNonNeg([...base, ...strictA]));
    const second = refutes(withNonNeg([...base, ...strictB]));
    if (first === true && second === true) return { ok: true };
    if (first === null || second === null) {
      return { ok: false, reason: 'le système est trop gros pour cette procédure.' };
    }
    return { ok: false, reason: 'les hypothèses n’imposent pas cette égalité.' };
  }

  const neg = constraintsOf(target, true);
  if (!neg) {
    return { ok: false, reason: 'cette tactique décide des inégalités linéaires (≤, <, ≥, >, =) sur ℕ.' };
  }
  const verdict = refutes(withNonNeg([...base, ...neg]));
  if (verdict === true) return { ok: true };
  if (verdict === null) return { ok: false, reason: 'le système est trop gros pour cette procédure.' };
  return { ok: false, reason: 'les hypothèses ne suffisent pas — ou l’énoncé est faux.' };
}
