// Impression des expressions dans la notation de Lean, avec le minimum de
// parenthèses. Les entiers restent des littéraux et `succ n` reste `succ n` :
// c'est la distinction que le monde de Peano fait travailler.

import { unfold } from './expr.js';

const INFIX = {
  Iff: ['↔', 20, 'right'],
  Or: ['∨', 30, 'right'],
  And: ['∧', 35, 'right'],
  Eq: ['=', 50, 'none'],
  Ne: ['≠', 50, 'none'],
  'Nat.le': ['≤', 50, 'none'],
  'Nat.lt': ['<', 50, 'none'],
  'Nat.ge': ['≥', 50, 'none'],
  'Nat.gt': ['>', 50, 'none'],
  'Nat.add': ['+', 65, 'left'],
  'Nat.sub': ['-', 65, 'left'],
  'Nat.mul': ['*', 70, 'left'],
  'Nat.pow': ['^', 75, 'right'],
};

const SHORT = { 'Nat.succ': 'succ', 'Nat.zero': 'zero', 'Nat.pred': 'pred' };

const APP_PREC = 1024;
const ATOM_PREC = 2048;

const wrap = (s, inner, outer) => (inner < outer ? `(${s})` : s);

export function show(e, prec = 0) {
  switch (e.k) {
    case 'var': return e.n;
    case 'const': return SHORT[e.n] ?? e.n;
    case 'mvar': return e.n;
    case 'lit': return String(e.v);
    case 'sort': return e.u;
    case 'lam': {
      const body = show(e.b, 0);
      const bind = isHole(e.t) ? e.x : `(${e.x} : ${show(e.t, 0)})`;
      return wrap(`fun ${bind} => ${body}`, 10, prec);
    }
    case 'pi': {
      if (e.x === '_' || !occurs(e.b, e.x)) {
        const [l, r] = [show(e.t, 26), show(e.b, 25)];
        return wrap(`${l} → ${r}`, 25, prec);
      }
      // Regroupe les liants consécutifs de même type : ∀ (a b : ℕ), …
      const names = [e.x];
      let body = e.b;
      while (body.k === 'pi' && body.x !== '_' && occurs(body.b, body.x)
             && !!body.implicit === !!e.implicit && sameType(body.t, e.t)) {
        names.push(body.x); body = body.b;
      }
      const group = names.join(' ');
      const [o, c] = e.implicit ? ['{', '}'] : ['(', ')'];
      const bind = isHole(e.t) ? group : `${o}${group} : ${show(e.t, 0)}${c}`;
      return wrap(`∀ ${bind}, ${show(body, 0)}`, 10, prec);
    }
    case 'app': {
      const { head, args } = unfold(e);
      if (head.k === 'const') {
        const inf = INFIX[head.n];
        if (inf && args.length === 2) {
          const [sym, p, assoc] = inf;
          const lp = assoc === 'left' ? p : p + 1;
          const rp = assoc === 'right' ? p : p + 1;
          return wrap(`${show(args[0], lp)} ${sym} ${show(args[1], rp)}`, p, prec);
        }
        if (head.n === 'Not' && args.length === 1) {
          return wrap(`¬${show(args[0], 41)}`, 40, prec);
        }
        if (head.n === 'Exists' && args.length === 1 && args[0].k === 'lam') {
          const l = args[0];
          const bind = isHole(l.t) ? l.x : `(${l.x} : ${show(l.t, 0)})`;
          return wrap(`∃ ${bind}, ${show(l.b, 0)}`, 10, prec);
        }
        if (head.n === '⟨⟩') return `⟨${args.map((a) => show(a, 0)).join(', ')}⟩`;
      }
      const parts = [show(head, APP_PREC), ...args.map((a) => show(a, APP_PREC + 1))];
      return wrap(parts.join(' '), APP_PREC, prec);
    }
    default: return '?';
  }
}

const isHole = (t) => !t || (t.k === 'const' && t.n === '_');
const sameType = (a, b) => show(a, 0) === show(b, 0);

function occurs(e, name) {
  switch (e.k) {
    case 'var': return e.n === name;
    case 'app': return occurs(e.f, name) || occurs(e.a, name);
    case 'lam': case 'pi': return (e.t ? occurs(e.t, name) : false) || (e.x !== name && occurs(e.b, name));
    default: return false;
  }
}

/** Le type d'une hypothèse, tel qu'affiché dans la fenêtre d'objectif. */
export const showHyp = (h) => `${h.name} : ${show(h.type)}`;

export function showGoal(goal) {
  const lines = goal.ctx.map(showHyp);
  lines.push(`⊢ ${show(goal.target)}`);
  return lines.join('\n');
}

export function showState(goals) {
  if (!goals.length) return 'Aucun objectif restant. ∎';
  const head = goals.length === 1 ? '' : `${goals.length} objectifs\n\n`;
  return head + goals.map(showGoal).join('\n\n');
}
