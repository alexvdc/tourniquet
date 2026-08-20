// Le Grimoire (documentation) et le Bac à sable (preuves libres).

import { h, mount, md, ABBREVS, toast, expandAbbrev, playgroundUrl, copyText } from './dom.js';
import { renderGoals } from './goal.js';
import { LEMMAS, lemmaType, BY_NAME } from '../engine/lib.js';
import { show } from '../engine/printer.js';
import { runProof } from '../engine/proof.js';
import { TACTIC_NAMES } from '../engine/tactics.js';
import { TACTIC_DOCS, SYNTAX_NOTES } from '../content/tactics-doc.js';
import { LEVELS } from '../content/index.js';
import * as store from '../state.js';

const KIND_LABEL = { axiom: 'axiome', thm: 'théorème', struct: 'constructeur' };

/* ═════════════════════════════════════════════════════════════ Grimoire */

export function renderGrimoire(host) {
  const query = h('input', {
    type: 'search',
    placeholder: 'rw, add_comm, récurrence, ∃…',
    'aria-label': 'Rechercher dans le Grimoire',
  });
  const results = h('div');

  const tacticEntry = (t) => h('div.entry.entry--tactic',
    h('div.entry__head',
      h('span.entry__name', { text: t.name }),
      h('span.badge.badge--struct', 'tactique'),
      h('span.entry__stmt', { text: t.syntax[0] })),
    t.syntax.length > 1
      ? h('div.chiprow', ...t.syntax.slice(1).map((s) => h('span.chip', { text: s })))
      : null,
    h('div.entry__doc', { html: md(t.doc) }));

  const lemmaEntry = (l) => h('div', { class: `entry entry--${l.kind}` },
    h('div.entry__head',
      h('span.entry__name', { text: l.name }),
      h('span', { class: `badge badge--${l.kind}`, text: KIND_LABEL[l.kind] ?? l.kind }),
      h('span.chip__note', { text: l.group })),
    h('pre.entry__stmt', { text: show(lemmaType(l)) }),
    h('div.entry__doc', { html: md(l.doc) }));

  function draw() {
    const q = query.value.trim().toLowerCase();
    const match = (...fields) => !q || fields.join(' ').toLowerCase().includes(q);

    const tactics = TACTIC_DOCS.filter((t) => match(t.name, t.doc, t.group, ...t.syntax));
    const lemmas = LEMMAS.filter((l) => match(l.name, l.stmt, l.doc, l.group));

    const groups = new Map();
    for (const l of lemmas) {
      if (!groups.has(l.group)) groups.set(l.group, []);
      groups.get(l.group).push(l);
    }

    mount(results,
      h('section',
        h('div',
          h('span.eyebrow', `${tactics.length} entrée${tactics.length > 1 ? 's' : ''}`),
          h('h2.title-section', 'Tactiques')),
        tactics.length
          ? h('div.entrylist', ...tactics.map(tacticEntry))
          : h('p.lede', 'Aucune tactique ne correspond.')),

      h('section',
        h('div',
          h('span.eyebrow', `${lemmas.length} énoncé${lemmas.length > 1 ? 's' : ''}`),
          h('h2.title-section', 'Bibliothèque'),
          h('p.lede', 'Tout ce qui se démontre dans le jeu, plus les axiomes qu’on admet. Un lemme n’est utilisable dans un niveau que si ce niveau l’a débloqué.')),
        ...[...groups.entries()].map(([group, items]) => h('section',
          h('span.eyebrow', { text: group }),
          h('div.entrylist', ...items.map(lemmaEntry))))));
  }

  query.addEventListener('input', draw);

  const abbrevs = h('div.panel',
    h('div.panel__head', h('span.panel__title', 'Écrire les symboles')),
    h('div.panel__body',
      h('p.entry__doc', 'Comme dans VS Code : tape la séquence, puis un espace. L’éditeur du site accepte aussi les équivalents ASCII (`->`, `/\\`, `\\/`, `<->`, `~`, `<-`).'),
      h('div.abbrevtable', ...dedupeAbbrevs().map(([seq, out]) => h('div.abbrev',
        h('span.abbrev__seq', { text: seq }),
        h('span.abbrev__arrow', '→'),
        h('span.abbrev__out', { text: out }))))));

  const syntax = h('div.panel',
    h('div.panel__head', h('span.panel__title', 'Lire du Lean')),
    h('div.panel__body',
      h('div.entrylist', ...SYNTAX_NOTES.map((n) => h('div.entry',
        h('div.entry__head', h('span.entry__name', { text: n.title })),
        h('div.entry__doc', { html: md(n.body) }))))));

  mount(host, h('div.view.grimoire',
    h('div',
      h('span.eyebrow', 'Documentation'),
      h('h1.title-display', 'Grimoire'),
      h('p.lede', 'Toutes les tactiques du moteur, tous les énoncés de la bibliothèque, et de quoi lire un vrai fichier Lean. Cherche par nom, par symbole ou par idée.')),
    h('div.searchbar', h('span.searchbar__glyph', '⌕'), query),
    h('div.grid-two', abbrevs, syntax),
    results));

  draw();
  return () => {};
}

function dedupeAbbrevs() {
  const seen = new Set();
  const out = [];
  for (const [seq, sym] of ABBREVS) {
    if (seen.has(sym)) continue;
    seen.add(sym);
    out.push([seq, sym]);
  }
  return out;
}

/* ═════════════════════════════════════════════════════════════ Bac à sable */

const ALL_LEMMAS = LEMMAS.map((l) => l.name);

export const PRESETS = [
  { label: '2 + 2 = 4, mais en trichant', ctx: '', goal: '2 + 2 = 4', arith: true, script: 'norm_num' },
  { label: 'Identité remarquable', ctx: 'a b : ℕ', goal: '(a + b) ^ 2 = a ^ 2 + 2 * (a * b) + b ^ 2', arith: true, script: 'ring' },
  { label: 'Récurrence libre', ctx: 'n : ℕ', goal: 'n + n = 2 * n', arith: false, script: 'rw [two_mul]' },
  { label: 'Logique classique', ctx: 'p : Prop', goal: '¬¬p → p', arith: false, script: 'intro h\nrw [not_not] at h\nexact h' },
  { label: 'Un ∃ à remplir', ctx: '', goal: '∃ (n : ℕ), n * n = 49', arith: true, script: 'use 7' },
];

export function renderSandbox(host) {
  const ctxField = h('input', { type: 'text', value: 'a b : ℕ', 'aria-label': 'Hypothèses' });
  const goalField = h('input', { type: 'text', value: 'a + b = b + a', 'aria-label': 'Objectif' });
  const arithField = h('select', { 'aria-label': 'Calcul sur les chiffres' },
    h('option', { value: 'off' }, 'désactivé (comme au monde 1)'),
    h('option', { value: 'on', selected: true }, 'activé (rfl calcule)'));

  const gutter = h('div.editor__gutter', { 'aria-hidden': 'true' });
  const area = h('textarea.editor__area', {
    spellcheck: 'false', wrap: 'off', rows: '10',
    'aria-label': 'Preuve',
    placeholder: 'induction a\nrw [add_zero, zero_add]\n…',
  });
  area.value = store.draftFor('__sandbox__') || 'induction b\nrw [add_zero, zero_add]\nrw [add_succ, succ_add]\nrw [ih]';

  const feedback = h('div.feedback.feedback--wait', { role: 'status', 'aria-live': 'polite' },
    'Écris un énoncé et prouve-le. Tous les lemmes et toutes les tactiques sont débloqués.');
  const goalHost = h('div.panel__body');

  const currentLevel = () => ({
    name: 'bac_a_sable',
    ctx: ctxField.value.trim() ? [ctxField.value.trim()] : [],
    goal: goalField.value.trim() || 'True',
    lemmas: ALL_LEMMAS,
    arith: arithField.value === 'on',
  });

  function check() {
    const level = currentLevel();
    store.saveDraft('__sandbox__', area.value);
    area.rows = Math.max(8, area.value.split('\n').length + 1);

    let result;
    try {
      result = runProof(area.value, level);
    } catch (err) {
      feedback.className = 'feedback feedback--err';
      feedback.textContent = `Énoncé illisible : ${err.message}`;
      mount(goalHost, h('p.entry__doc', 'Corrige l’énoncé pour voir la fenêtre d’objectif.'));
      mount(gutter);
      return;
    }

    const lines = area.value.split('\n');
    const byLine = new Map(result.steps.slice(1).map((s) => [s.line, s]));
    mount(gutter, ...lines.map((line, i) => {
      const step = byLine.get(i);
      const blank = !line.replace(/--.*$/, '').trim();
      if (step?.error) return h('span.mark.mark--err', '✗');
      if (step) return h('span.mark.mark--ok', '✓');
      return h('span.mark.mark--todo', { text: blank ? '' : '·' });
    }));

    mount(goalHost, renderGoals(result.final));

    if (result.error) {
      feedback.className = 'feedback feedback--err';
      feedback.textContent = `ligne ${result.error.line + 1} · ${result.error.message}`;
    } else if (result.solved) {
      feedback.className = 'feedback feedback--ok';
      feedback.textContent = 'Preuve complète. ∎';
    } else if (result.sorried) {
      feedback.className = 'feedback feedback--err';
      feedback.textContent = 'Fermé par `sorry` : ça ne compte pas.';
    } else {
      feedback.className = 'feedback feedback--wait';
      const n = result.final.goals.length;
      feedback.textContent = `Il reste ${n} objectif${n > 1 ? 's' : ''}.`;
    }
  }

  for (const el of [ctxField, goalField, arithField]) {
    el.addEventListener('input', check);
    el.addEventListener('change', check);
  }
  area.addEventListener('input', check);
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

  const leanCodeOf = () => {
    const l = currentLevel();
    const binders = l.ctx.map((c) => `(${c})`).join(' ');
    const body = area.value.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => '  ' + s).join('\n');
    return `example ${binders} : ${l.goal} := by\n${body || '  sorry'}`;
  };

  mount(host, h('div.view.sandbox',
    h('div',
      h('span.eyebrow', 'Terrain libre'),
      h('h1.title-display', 'Bac à sable'),
      h('p.lede', 'Ton énoncé, tes tactiques, aucune restriction. C’est ici qu’on vérifie qu’on a compris — et qu’on découvre les limites du moteur.')),

    h('div.presetrow', ...PRESETS.map((p) => h('button.chip', {
      type: 'button',
      onclick: () => {
        ctxField.value = p.ctx;
        goalField.value = p.goal;
        arithField.value = p.arith ? 'on' : 'off';
        area.value = p.script;
        check();
      },
    }, p.label))),

    h('div.sandbox__form',
      h('label.field',
        h('span.field__label', 'Hypothèses'),
        ctxField,
        h('span.field__help', 'Format Lean : `a b : ℕ`, `p q : Prop`, `h : a = b`. Sépare par des espaces.')),
      h('label.field',
        h('span.field__label', 'Objectif'),
        goalField,
        h('span.field__help', 'Par exemple `a + b = b + a`, `p ∧ q → q ∧ p`, `∃ (n : ℕ), n * n = 49`.')),
      h('label.field',
        h('span.field__label', 'Calcul numérique'),
        arithField,
        h('span.field__help', 'Désactivé, `rfl` exige des termes identiques — l’expérience du monde 1.'))),

    h('div.sandbox__cols',
      h('div.level__work',
        h('div.editor', gutter, area),
        feedback,
        h('div.btnrow',
          h('a.btn.btn--small', {
            href: '#', target: '_blank', rel: 'noopener',
            onclick: (e) => { e.currentTarget.href = playgroundUrl(leanCodeOf()); },
          }, 'Ouvrir dans le vrai Lean ↗'),
          h('button.btn.btn--ghost.btn--small', {
            type: 'button',
            onclick: async () => {
              const ok = await copyText(leanCodeOf());
              toast(ok ? 'Code Lean copié.' : 'Copie impossible.');
            },
          }, 'Copier le code Lean'))),
      h('div.level__side',
        h('div.panel',
          h('div.panel__head', h('span.panel__title', 'Fenêtre d’objectif')),
          goalHost),
        h('div.panel',
          h('div.panel__head', h('span.panel__title', 'Tout est disponible')),
          h('div.panel__body',
            h('p.entry__doc', `${TACTIC_NAMES.length} tactiques et ${LEMMAS.length} énoncés, sans verrou. Le détail est dans le `,
              h('a', { href: '#/grimoire' }, 'Grimoire'), '.'),
            h('p.entry__doc', 'Le moteur ne connaît qu’un seul type de données, ℕ, et les propositions. Pas de listes, pas de ℤ, pas de structures : c’est la frontière du jeu, et le vrai Lean commence exactement là.')))))));

  check();
  return () => {};
}
