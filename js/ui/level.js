// La vue d'un niveau : consigne à gauche, éditeur au centre, objectif à droite.
// L'état affiché suit le curseur dans l'éditeur, comme l'Infoview de Lean.

import { h, mount, md, toast, expandAbbrev, playgroundUrl, copyText, mathify } from './dom.js';
import { renderGoals, renderStatement } from './goal.js';
import { runProof, leanCode, levelState } from '../engine/proof.js';
import { BY_NAME, buildLib } from '../engine/lib.js';
import { show } from '../engine/printer.js';
import { LEVEL_BY_ID, nextLevel, prevLevel, isUnlocked, achievementsFor, WORLDS } from '../content/index.js';
import * as store from '../state.js';

const TACTIC_HINTS = {
  rfl: 'clôt `a = a`',
  rw: 'réécrit avec une égalité',
  exact: 'donne le terme exact',
  apply: 'raisonne à reculons',
  intro: 'introduit une hypothèse',
  intros: 'introduit tout',
  induction: 'récurrence sur ℕ',
  cases: 'décompose ∧ ∨ ∃ ↔',
  constructor: 'découpe ∧ ↔',
  left: 'choisit la gauche d’un ∨',
  right: 'choisit la droite d’un ∨',
  use: 'témoin d’un ∃',
  exfalso: 'objectif ⟶ False',
  contradiction: 'trouve la contradiction',
  trivial: 'cas immédiat',
  simp: 'simplifie en boucle',
  ring: 'décide une identité',
  norm_num: 'calcule',
  have: 'nomme une étape',
  revert: 'renvoie une hypothèse dans l’objectif',
  unfold: 'déplie une définition',
  repeat: 'répète tant que ça marche',
  sorry: 'admet (aucune XP)',
  calc: 'chaîne d’égalités lisible',
  obtain: 'décompose avec un motif',
  omega: 'décide les inégalités',
  linarith: 'décide les inégalités',
  assumption: 'cherche l’hypothèse',
  decide: 'calcule et tranche',
  all_goals: 'applique à tous les objectifs',
};

export function renderLevel(host, id) {
  const level = LEVEL_BY_ID.get(id);
  if (!level) {
    mount(host, h('p', 'Ce niveau n’existe pas. ', h('a', { href: '#/' }, 'Retour à l’Atlas.')));
    return;
  }
  const p = store.progress();
  if (!isUnlocked(id, p.done)) {
    mount(host, h('div.view',
      h('h1.title-display', { text: level.title }),
      h('p.lede', 'Ce niveau est encore verrouillé : termine le précédent pour l’ouvrir.'),
      h('p', h('a.btn', { href: '#/' }, 'Retour à l’Atlas'))));
    return;
  }

  const world = WORLDS.find((w) => w.num === level.world);
  const prev = prevLevel(id);
  const next = nextLevel(id);
  let hintsShown = 0;

  /* ── colonne de gauche : la consigne, sur vélin ── */
  const hintsBox = h('div.hints');
  const hintBtn = h('button.btn.btn--ghost.btn--small', {
    type: 'button',
    onclick: () => {
      if (hintsShown >= level.hints.length) return;
      const i = hintsShown++;
      store.markHinted(id);
      hintsBox.append(h('div.hint',
        h('span.hint__num', { text: `${i + 1}.` }),
        h('span', { html: md(level.hints[i]).replace(/^<p>|<\/p>$/g, '') })));
      if (hintsShown >= level.hints.length) {
        hintBtn.disabled = true;
        hintBtn.textContent = 'Plus d’indice';
      } else {
        hintBtn.textContent = `Indice suivant (${level.hints.length - hintsShown} restant${level.hints.length - hintsShown > 1 ? 's' : ''})`;
      }
    },
  }, `Un indice (${level.hints.length} disponible${level.hints.length > 1 ? 's' : ''})`);

  const brief = h('aside.level__brief',
    h('article.manuscript',
      h('span.eyebrow', { text: `Monde ${level.world} · ${world?.title ?? ''}` }),
      h('h3', ...mathify(level.title)),
      h('div', { html: md(level.brief) }),
      level.examples?.length ? h('hr.manuscript__rule') : null,
      level.examples?.length
        ? h('div.tacticnote', ...level.examples.flatMap((ex) => [
          h('code', { text: ex.code }),
          h('span', { html: md(ex.note).replace(/^<p>|<\/p>$/g, '') }),
        ]))
        : null),
    h('div.btnrow', hintBtn),
    hintsBox);

  /* ── colonne du centre : l'éditeur ── */
  const gutter = h('div.editor__gutter', { 'aria-hidden': 'true' });
  const area = h('textarea.editor__area', {
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    wrap: 'off',
    'aria-label': 'Preuve : une tactique par ligne',
    placeholder: 'Une tactique par ligne…',
  });
  area.value = store.draftFor(id);

  const feedback = h('div.feedback.feedback--wait', { role: 'status', 'aria-live': 'polite' },
    'Écris une tactique. La fenêtre d’objectif suit ton curseur.');
  const solvedBox = h('div');
  const goalHost = h('div.panel__body');

  const editor = h('div.editor', gutter, area);

  const resetBtn = h('button.btn.btn--ghost.btn--small', {
    type: 'button',
    onclick: () => { area.value = ''; check(); area.focus(); },
  }, 'Effacer');

  const solutionBtn = h('button.btn.btn--ghost.btn--small.btn--danger', {
    type: 'button',
    onclick: () => {
      const ok = window.confirm(
        'Afficher la solution ? Tu gardes l’XP du niveau, mais tu perds le haut fait « Sans filet ».');
      if (!ok) return;
      store.markRevealed(id);
      area.value = level.sol.join('\n');
      check();
      area.focus();
    },
  }, 'Montrer la solution');

  const leanBtn = h('a.btn.btn--small', {
    href: '#',
    target: '_blank',
    rel: 'noopener',
    onclick: (e) => {
      e.currentTarget.href = playgroundUrl(leanCode(level, area.value || level.sol.join('\n')));
    },
  }, 'Ouvrir dans le vrai Lean ↗');

  const copyBtn = h('button.btn.btn--ghost.btn--small', {
    type: 'button',
    onclick: async () => {
      const ok = await copyText(leanCode(level, area.value || level.sol.join('\n')));
      toast(ok ? 'Code Lean copié.' : 'Copie impossible — sélectionne le texte à la main.');
    },
  }, 'Copier le code Lean');

  const work = h('section.level__work',
    renderStatement(level),
    editor,
    feedback,
    h('div.btnrow', resetBtn, solutionBtn, copyBtn, leanBtn),
    solvedBox);

  /* ── colonne de droite : objectif, tactiques, lemmes ── */
  const lib = buildLib(level.lemmas ?? [], level.logic !== false);
  const lemmaEntries = [...lib.values()].sort((a, b) => a.name.localeCompare(b.name));

  const insert = (text) => {
    const start = area.selectionStart ?? area.value.length;
    const atLineStart = start === 0 || area.value[start - 1] === '\n';
    const chunk = atLineStart ? text : (area.value[start - 1] === ' ' ? text : ' ' + text);
    area.setRangeText(chunk, start, area.selectionEnd ?? start, 'end');
    area.focus();
    check();
  };

  const side = h('aside.level__side',
    h('div.panel',
      h('div.panel__head',
        h('span.panel__title', 'Fenêtre d’objectif'),
        h('span.panel__aside', { id: `goalcount-${id}` }, '')),
      goalHost),
    h('div.panel',
      h('div.panel__head', h('span.panel__title', 'Tactiques disponibles')),
      h('div.panel__body',
        h('div.chiprow', ...(level.tactics ?? Object.keys(TACTIC_HINTS)).map((t) =>
          h('button.chip', { type: 'button', title: TACTIC_HINTS[t] ?? '', onclick: () => insert(t) },
            h('span', { text: t }),
            TACTIC_HINTS[t] ? h('span.chip__note', { text: TACTIC_HINTS[t] }) : null))))),
    lemmaEntries.length
      ? h('div.panel',
        h('div.panel__head',
          h('span.panel__title', 'Lemmes débloqués'),
          h('span.panel__aside', { text: String(lemmaEntries.length) })),
        h('div.panel__body',
          h('div.lemmalist', ...lemmaEntries.map((l) =>
            h('button.lemma', { type: 'button', onclick: () => insert(l.name) },
              h('span.lemma__name', { text: l.name }),
              h('span.lemma__stmt', { text: show(l.type) }))))))
      : null);

  /* ── vérification en direct ── */

  let lastSolved = false;

  function stateAtLine(result, lineIdx) {
    let best = result.steps[0];
    for (const s of result.steps) if (s.line <= lineIdx) best = s;
    return best;
  }

  function caretLine() {
    const pos = area.selectionStart ?? area.value.length;
    return area.value.slice(0, pos).split('\n').length - 1;
  }

  function check() {
    const script = area.value;
    store.saveDraft(id, script);
    autoGrow();

    let result;
    try {
      result = runProof(script, level);
    } catch (err) {
      feedback.className = 'feedback feedback--err';
      feedback.textContent = `Le moteur a trébuché : ${err.message}`;
      return;
    }

    // Marge. Une instruction peut couvrir plusieurs lignes (`calc`) : la
    // première porte le verdict, les suivantes une barre de continuation.
    const lines = script.split('\n');
    const byLine = new Map();
    for (const s of result.steps.slice(1)) {
      byLine.set(s.line, { step: s, cont: false });
      for (let l = s.line + 1; l <= (s.endLine ?? s.line); l++) {
        byLine.set(l, { step: s, cont: true });
      }
    }
    const cl = caretLine();
    mount(gutter, ...lines.map((line, i) => {
      const entry = byLine.get(i);
      const blank = !line.replace(/--.*$/, '').trim();
      let cls = 'mark mark--todo';
      let glyph = blank ? '' : '·';
      if (entry?.step.error) { cls = 'mark mark--err'; glyph = entry.cont ? '│' : '✗'; }
      else if (entry) { cls = 'mark mark--ok'; glyph = entry.cont ? '│' : '✓'; }
      if (i === cl && !blank && !entry) cls = 'mark mark--caret';
      return h('span', { class: cls, text: glyph || (i === cl ? '›' : '') });
    }));

    // fenêtre d'objectif, à la ligne du curseur
    const shown = stateAtLine(result, cl);
    mount(goalHost, renderGoals(shown.state));
    const counter = document.getElementById(`goalcount-${id}`);
    if (counter) {
      counter.textContent = shown.state.goals.length
        ? `${shown.state.goals.length} objectif${shown.state.goals.length > 1 ? 's' : ''}`
        : '∎';
    }

    // message
    if (result.error) {
      feedback.className = 'feedback feedback--err';
      mount(feedback,
        h('span.feedback__line', { text: `ligne ${result.error.line + 1} · ` }),
        result.error.message);
    } else if (result.solved) {
      feedback.className = 'feedback feedback--ok';
      feedback.textContent = 'Preuve complète. Aucun objectif restant.';
    } else if (result.sorried) {
      feedback.className = 'feedback feedback--err';
      feedback.textContent = '`sorry` ferme l’objectif sans le prouver : le niveau ne compte pas.';
    } else if (!script.trim()) {
      feedback.className = 'feedback feedback--wait';
      feedback.textContent = 'Écris une tactique. La fenêtre d’objectif suit ton curseur.';
    } else if (result.warning) {
      feedback.className = 'feedback feedback--err';
      feedback.textContent = `Impasse : ${result.warning}`;
    } else {
      feedback.className = 'feedback feedback--wait';
      const n = result.final.goals.length;
      feedback.textContent = `Il reste ${n} objectif${n > 1 ? 's' : ''}.`;
    }

    if (result.solved && !lastSolved) award();
    lastSolved = result.solved;
  }

  function award() {
    const before = achievementsFor(store.progress()).filter((a) => a.unlocked).map((a) => a.id);
    const fresh = store.markSolved(id, level.xp);
    const now = achievementsFor(store.progress());
    if (fresh) {
      toast(`**${level.title}** démontré · **+${level.xp} XP**`);
      for (const a of now) {
        if (a.unlocked && !before.includes(a.id)) toast(`Haut fait : **${a.name}** ${a.glyph}`);
      }
    }
    mount(solvedBox, h('div.solved',
      h('div.solved__head',
        h('span.solved__seal', '∎'),
        h('span.solved__title', fresh ? 'Niveau terminé' : 'Déjà démontré'),
        h('span.solved__xp', { text: `+${level.xp} XP` })),
      h('div.btnrow',
        next
          ? h('a.btn.btn--primary', { href: `#/niveau/${next.id}` },
            `Niveau suivant · ${next.title}`)
          : h('a.btn.btn--primary', { href: '#/hauts-faits' }, 'Voir les hauts faits'),
        h('a.btn.btn--ghost', { href: '#/' }, 'Atlas'))));
  }

  function autoGrow() {
    const rows = Math.max(6, area.value.split('\n').length + 1);
    area.rows = rows;
  }

  area.addEventListener('input', check);
  area.addEventListener('click', check);
  area.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) check();
  });
  area.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
      const out = expandAbbrev(area.value, area.selectionStart ?? 0);
      if (out) {
        e.preventDefault();
        area.value = out.value;
        area.setSelectionRange(out.caret, out.caret);
        check();
      }
    }
  });

  mount(host, h('div.view',
    h('div.level__bar',
      h('a.level__crumb', { href: '#/' }, 'Atlas'),
      h('span.level__crumb', { text: `· ${level.id} ·` }),
      h('h1.level__title', ...mathify(level.title)),
      level.boss ? h('span.badge.badge--boss', 'boss') : null,
      store.isDone(id) ? h('span.badge.badge--done', 'terminé') : null,
      h('div.level__nav',
        prev ? h('a.btn.btn--ghost.btn--small', { href: `#/niveau/${prev.id}` }, '← précédent') : null,
        next && store.progress().done.has(id)
          ? h('a.btn.btn--ghost.btn--small', { href: `#/niveau/${next.id}` }, 'suivant →')
          : null)),
    h('div.level__grid', brief, work, side)));

  check();
  if (store.isDone(id) && !area.value.trim()) {
    feedback.className = 'feedback feedback--wait';
    feedback.textContent = 'Niveau déjà terminé. Tu peux le refaire autrement, ou passer au suivant.';
  }
  area.focus({ preventScroll: true });
}
