// Normalisation : bêta-réduction, dépliage de ¬ et ≠, et arithmétique sur les
// littéraux (activée seulement quand le niveau l'autorise — sinon `rfl` fermerait
// « 2 + 2 = 4 » d'un coup et le monde de Peano n'aurait plus rien à enseigner).

import { App, Const, Lit, apps, alphaEq, subst, match, unfold } from './expr.js';

const NAT_OPS = {
  'Nat.add': (a, b) => a + b,
  'Nat.mul': (a, b) => a * b,
  'Nat.pow': (a, b) => a ** b,
  'Nat.sub': (a, b) => Math.max(0, a - b),
};

/** Une passe de réduction en tête. Renvoie null si rien ne s'applique. */
function step(e, opts) {
  // (fun x => b) a  ⟶  b[x := a]
  if (e.k === 'app' && e.f.k === 'lam') return subst(e.f.b, e.f.x, e.a);

  const not = match(e, 'Not', 1);
  if (not) return { k: 'pi', x: '_', t: not[0], b: Const('False'), implicit: false };

  const ne = match(e, 'Ne', 2);
  if (ne) return App(Const('Not'), apps(Const('Eq'), ne[0], ne[1]));

  if (opts.arith) {
    const succ = match(e, 'Nat.succ', 1);
    if (succ && succ[0].k === 'lit') return Lit(succ[0].v + 1);
    const { head, args } = unfold(e);
    if (head.k === 'const' && NAT_OPS[head.n] && args.length === 2
        && args[0].k === 'lit' && args[1].k === 'lit') {
      return Lit(NAT_OPS[head.n](args[0].v, args[1].v));
    }
  }
  return null;
}

/** Forme normale (parcours ascendant avec relance sur le nœud réécrit). */
export function norm(e, opts = {}) {
  let cur = e;
  for (let i = 0; i < 400; i++) {
    const next = normOnce(cur, opts);
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

function normOnce(e, opts) {
  switch (e.k) {
    case 'app': {
      const f = normOnce(e.f, opts), a = normOnce(e.a, opts);
      const rebuilt = f === e.f && a === e.a ? e : App(f, a);
      return step(rebuilt, opts) ?? rebuilt;
    }
    case 'lam': case 'pi': {
      const t = e.t ? normOnce(e.t, opts) : e.t;
      const b = normOnce(e.b, opts);
      const rebuilt = t === e.t && b === e.b ? e : { ...e, t, b };
      return step(rebuilt, opts) ?? rebuilt;
    }
    default: return step(e, opts) ?? e;
  }
}

/** Égalité définitionnelle, au sens (volontairement limité) de ce moteur. */
export function defEq(a, b, opts = {}) {
  if (alphaEq(a, b)) return true;
  return alphaEq(norm(a, opts), norm(b, opts));
}

/** Convertit les tours de `succ` en littéral, pour l'affichage arithmétique. */
export function collapseNumerals(e) {
  return norm(e, { arith: true });
}

/** Déplie ¬, ≠ et la bêta-réduction en tête seulement (le reste est laissé tel quel). */
export function whnfHead(e) {
  for (let i = 0; i < 30; i++) {
    const not = match(e, 'Not', 1);
    if (not) { e = { k: 'pi', x: '_', t: not[0], b: Const('False'), implicit: false }; continue; }
    const ne = match(e, 'Ne', 2);
    if (ne) { e = App(Const('Not'), apps(Const('Eq'), ne[0], ne[1])); continue; }
    if (e.k === 'app' && e.f.k === 'lam') { e = subst(e.f.b, e.f.x, e.a); continue; }
    return e;
  }
  return e;
}
