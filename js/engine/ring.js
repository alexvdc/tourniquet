// Décision de l'égalité dans un semi-anneau commutatif : on normalise chaque
// côté en polynôme (dictionnaire monôme → coefficient) et on compare.
// Tout sous-terme non arithmétique devient une variable atomique.

import { match, unfold } from './expr.js';
import { show } from './printer.js';

const MONO_SEP = '·';

/** @returns {Map<string, number>} monôme (clé triée) → coefficient */
export function toPoly(e) {
  const lit = e.k === 'lit' ? e.v : null;
  if (lit !== null) return lit === 0 ? new Map() : new Map([['', lit]]);

  const succ = match(e, 'Nat.succ', 1);
  if (succ) return addPoly(toPoly(succ[0]), new Map([['', 1]]));

  const add = match(e, 'Nat.add', 2);
  if (add) return addPoly(toPoly(add[0]), toPoly(add[1]));

  const mul = match(e, 'Nat.mul', 2);
  if (mul) return mulPoly(toPoly(mul[0]), toPoly(mul[1]));

  const pow = match(e, 'Nat.pow', 2);
  if (pow && pow[1].k === 'lit' && pow[1].v <= 12) {
    let acc = new Map([['', 1]]);
    for (let i = 0; i < pow[1].v; i++) acc = mulPoly(acc, toPoly(pow[0]));
    return acc;
  }

  return new Map([[atomKey(e), 1]]);
}

const atomKey = (e) => show(e);

function addPoly(a, b) {
  const out = new Map(a);
  for (const [k, v] of b) {
    const n = (out.get(k) ?? 0) + v;
    if (n === 0) out.delete(k); else out.set(k, n);
  }
  return out;
}

function mulPoly(a, b) {
  const out = new Map();
  for (const [ka, va] of a) {
    for (const [kb, vb] of b) {
      const key = mergeMono(ka, kb);
      const n = (out.get(key) ?? 0) + va * vb;
      if (n === 0) out.delete(key); else out.set(key, n);
    }
  }
  return out;
}

function mergeMono(a, b) {
  const parts = [...a.split(MONO_SEP), ...b.split(MONO_SEP)].filter(Boolean);
  parts.sort();
  return parts.join(MONO_SEP);
}

export function polyEq(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

/** Les deux membres sont-ils égaux dans tout semi-anneau commutatif ? */
export function ringEq(lhs, rhs) {
  return polyEq(toPoly(lhs), toPoly(rhs));
}

/** Forme lisible d'un polynôme, pour les messages d'erreur. */
export function showPoly(p) {
  if (!p.size) return '0';
  return [...p.entries()]
    .sort((x, y) => (x[0] === '' ? -1 : y[0] === '' ? 1 : x[0].localeCompare(y[0])))
    .map(([k, v]) => (k === '' ? String(v) : (v === 1 ? '' : `${v}·`) + k))
    .join(' + ');
}
