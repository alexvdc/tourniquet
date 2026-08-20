// La fenêtre d'objectif : hypothèses au-dessus du tourniquet, cible en dessous.
// C'est l'objet central du site, tout le reste s'organise autour.

import { h, frag } from './dom.js';
import { show } from '../engine/printer.js';
import { statementOf } from '../engine/proof.js';

const hypRow = (hyp) => h('div.hyp',
  h('span.hyp__name', { text: hyp.name }),
  h('span.hyp__colon', ':'),
  h('span.hyp__type', { text: show(hyp.type) }));

const goalBlock = (goal, label, focus) => h('div.goal', { class: focus ? 'goal--focus' : null },
  label ? h('div.goal__label', { text: label }) : null,
  ...goal.ctx.map(hypRow),
  h('div.target',
    h('span.target__turnstile', '⊢'),
    h('span.target__expr', { text: show(goal.target) })));

/**
 * @param {{goals: Array, sorried: boolean}} state
 * @param {{empty?: string}} opts message affiché quand il ne reste rien
 */
export function renderGoals(state, opts = {}) {
  const box = h('div.goalwin');
  if (!state.goals.length) {
    box.append(h('div.goalwin__empty',
      h('span.goalwin__seal', '∎'),
      state.sorried
        ? h('span.goalwin__sorry', 'Fermé par `sorry` — la dette reste à payer.')
        : h('span', { text: opts.empty ?? 'Plus aucun objectif. La preuve est complète.' })));
    return box;
  }
  const many = state.goals.length > 1;
  state.goals.forEach((g, i) => {
    const label = many ? `objectif ${i + 1} sur ${state.goals.length}` : null;
    box.append(goalBlock(g, label, many && i === 0));
  });
  return box;
}

/** L'énoncé du niveau, colorisé comme dans un fichier Lean. */
export function renderStatement(level) {
  const binders = (level.ctx ?? []).map((c) => `(${c})`).join(' ');
  return h('pre.statement',
    h('span.kw', 'theorem '),
    h('span.nm', { text: level.name ?? 'exercice' }),
    binders ? ` ${binders}` : '',
    ' : ',
    level.goal,
    h('span.kw', ' := by'));
}

export { statementOf };
