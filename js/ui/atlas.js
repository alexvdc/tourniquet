// L'accueil : un hameçon, une preuve qui se déroule toute seule, puis l'Atlas.

import { h, mount, md, mathify } from './dom.js';
import { renderGoals } from './goal.js';
import { runProof } from '../engine/proof.js';
import { show } from '../engine/printer.js';
import {
  WORLDS, LEVELS, LEVEL_BY_ID, TOTAL_XP, isUnlocked, rankFor, achievementsFor,
} from '../content/index.js';
import * as store from '../state.js';

/** Le premier niveau non terminé — là où le bouton « reprendre » envoie. */
export function resumeLevel(done) {
  return LEVELS.find((l) => !done.has(l.id)) ?? LEVELS[LEVELS.length - 1];
}

/* ────────────────────────────────────────────── le replay du boss 2 + 2 = 4 */

function buildReplay() {
  const level = LEVEL_BY_ID.get('1.7');
  const result = runProof(level.sol.join('\n'), level);
  const frames = result.steps.map((s, i) => ({
    tactic: i === 0 ? '' : s.text,
    state: s.state,
  }));
  return { level, frames };
}

function replayPanel() {
  const { level, frames } = buildReplay();
  const theorem = h('div.replay__theorem', { text: `theorem deux_et_deux : ${level.goal} := by` });
  const tactic = h('div.replay__tactic');
  const goalHost = h('div');
  const frame = h('div.replay__frame', theorem, tactic, goalHost);

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  const draw = () => {
    const f = frames[i];
    tactic.textContent = f.tactic || 'aucune tactique — les deux membres n’ont rien en commun';
    mount(goalHost, renderGoals(f.state, { empty: 'Plus aucun objectif. 2 + 2 = 4 est démontré.' }));
  };

  if (reduced) {
    i = frames.length - 1;
    draw();
    return { el: h('div.replay', frame, h('p.replay__caption', 'La preuve complète, en quatre réécritures.')), stop: () => {} };
  }

  draw();
  let timer = null;
  const tick = () => {
    i = (i + 1) % (frames.length + 1);
    if (i === frames.length) return; // une respiration sur le ∎
    draw();
  };
  const start = () => { timer = setInterval(tick, 2100); };
  const stop = () => { clearInterval(timer); timer = null; };
  start();

  const toggle = h('button.btn.btn--ghost.btn--small', {
    type: 'button',
    onclick: (e) => {
      if (timer) { stop(); e.currentTarget.textContent = 'Reprendre le replay'; }
      else { start(); e.currentTarget.textContent = 'Mettre en pause'; }
    },
  }, 'Mettre en pause');

  return {
    el: h('div.replay', frame,
      h('div.replay__head',
        h('p.replay__caption', 'Le boss du monde 1, rejoué en direct par le moteur du site.'),
        toggle)),
    stop,
  };
}

/* ────────────────────────────────────────────── l'atlas */

function worldRow(world, done) {
  const levels = world.levels;
  const doneCount = levels.filter((l) => done.has(l.id)).length;
  const unlocked = levels.some((l) => isUnlocked(l.id, done));
  const complete = doneCount === levels.length;

  const cls = complete ? 'world world--done'
    : unlocked ? 'world world--current' : 'world world--locked';

  return h('section', { class: cls },
    h('div.world__medallion', { 'aria-hidden': 'true', text: world.glyph }),
    h('div.world__body',
      h('div.world__head',
        h('span.world__num', { text: `Monde ${world.num}` }),
        h('h2.world__title', { text: world.title }),
        h('span.world__subtitle', { text: world.subtitle }),
        h('span.world__count', { text: `${doneCount}/${levels.length}` })),
      h('div.world__intro', { html: md(world.intro) }),
      h('div.levelgrid', ...levels.map((l) => levelCard(l, done)))));
}

function levelCard(level, done) {
  const isOpen = isUnlocked(level.id, done);
  const isDone = done.has(level.id);
  const next = isOpen && !isDone;
  const classes = ['levelcard'];
  if (isDone) classes.push('levelcard--done');
  if (level.boss) classes.push('levelcard--boss');
  if (!isOpen) classes.push('levelcard--locked');
  if (next) classes.push('levelcard--next');

  return h('a', {
    class: classes.join(' '),
    href: isOpen ? `#/niveau/${level.id}` : '#/',
    'aria-disabled': isOpen ? null : 'true',
  },
    h('div.levelcard__top',
      h('span.levelcard__id', { text: level.id }),
      level.boss ? h('span.badge.badge--boss', 'boss') : null,
      h('span.levelcard__state', { text: isDone ? '✓' : isOpen ? '' : '·' })),
    h('span.levelcard__title', ...mathify(level.title)),
    h('span.levelcard__goal', { text: isOpen ? level.goal : 'verrouillé' }));
}

/* ────────────────────────────────────────────── la vue */

export function renderAtlas(host) {
  const p = store.progress();
  const rank = rankFor(p.xp);
  const resume = resumeLevel(p.done);
  const started = p.done.size > 0;
  const replay = replayPanel();

  const hero = h('section.hero',
    h('div',
      h('span.eyebrow', 'Apprendre Lean 4 en démontrant'),
      h('h1.hero__title', 'Personne ne t’a jamais demandé de prouver que ',
        h('span.expr.hero__expr', '2 + 2 = 4')),
      h('p.hero__lede',
        'Un assistant de preuve, si. ',
        h('strong', 'Tourniquet'),
        ' est un jeu en ',
        String(LEVELS.length),
        ' niveaux : tu pars de deux axiomes et d’une machine à fabriquer le nombre suivant, et tu remontes jusqu’aux tactiques que Mathlib utilise pour de vrai.'),
      h('div.hero__actions',
        started
          ? h('a.btn.btn--primary', { href: `#/niveau/${resume.id}` },
            `Reprendre · ${resume.id} ${resume.title}`)
          : h('a.btn.btn--primary', { href: `#/niveau/${LEVELS[0].id}` }, 'Commencer au tableau'),
        h('a.btn.btn--ghost', { href: '#/grimoire' }, 'Feuilleter le Grimoire')),
      h('div.hero__stats',
        h('div.stat',
          h('span.stat__num', { text: String(LEVELS.length) }),
          h('span.stat__label', 'niveaux')),
        h('div.stat',
          h('span.stat__num', { text: String(WORLDS.length) }),
          h('span.stat__label', 'mondes')),
        h('div.stat',
          h('span.stat__num', { text: `${Math.round((p.done.size / LEVELS.length) * 100)}%` }),
          h('span.stat__label', 'démontré')),
        h('div.stat',
          h('span.stat__num', { text: rank.name.split(' ')[0] }),
          h('span.stat__label', 'ton rang')))),
    replay.el);

  const atlas = h('div.atlas',
    h('div',
      h('span.eyebrow', 'Le parcours'),
      h('h2.title-section', 'Atlas'),
      h('p.lede', 'Chaque monde ouvre le suivant. Les théorèmes que tu démontres deviennent les outils du monde d’après — rien n’est admis deux fois.')),
    ...WORLDS.map((w) => worldRow(w, p.done)));

  mount(host, h('div.view', hero, atlas));
  return () => replay.stop();
}

/* ────────────────────────────────────────────── hauts faits */

export function renderFeats(host) {
  const p = store.progress();
  const rank = rankFor(p.xp);
  const feats = achievementsFor(p);
  const doneCount = p.done.size;

  mount(host, h('div.view',
    h('div',
      h('span.eyebrow', 'Progression'),
      h('h1.title-display', 'Hauts faits'),
      h('p.lede', 'Le rang suit l’XP, l’XP suit les preuves. Rien ici ne s’achète.')),

    h('div.standingcard',
      h('span.eyebrow', 'Rang actuel'),
      h('div.standingcard__rank', { text: rank.name }),
      h('div.standingcard__note', { text: rank.note }),
      h('progress.standing__bar', { value: String(p.xp), max: String(TOTAL_XP) }),
      h('div.standingcard__next', { text: rank.next
        ? `${p.xp} XP sur ${TOTAL_XP} · prochain rang : ${rank.next.name} à ${Math.ceil(rank.next.at * TOTAL_XP)} XP`
        : `${p.xp} XP sur ${TOTAL_XP} · tout est démontré.` }),
      h('div.standingcard__next', { text: `${doneCount} niveaux terminés sur ${LEVELS.length}` })),

    h('div',
      h('h2.title-section', 'Faits d’armes'),
      h('div.feats', ...feats.map((f) => h('div', { class: f.unlocked ? 'feat feat--on' : 'feat' },
        h('span.feat__glyph', { 'aria-hidden': 'true', text: f.glyph }),
        h('span.feat__name', { text: f.name }),
        h('span.feat__desc', { text: f.desc }))))),

    h('div',
      h('h2.title-section', 'Sauvegarde'),
      h('div.dangerzone',
        h('p', 'La progression vit dans ce navigateur, nulle part ailleurs : pas de compte, pas de serveur. Copie-la si tu changes de machine.'),
        h('div.btnrow',
          h('button.btn.btn--small', {
            type: 'button',
            onclick: async () => {
              const { copyText, toast } = await import('./dom.js');
              const ok = await copyText(store.exportSave());
              toast(ok ? 'Sauvegarde copiée dans le presse-papier.' : 'Copie impossible.');
            },
          }, 'Copier ma sauvegarde'),
          h('button.btn.btn--small', {
            type: 'button',
            onclick: async () => {
              const json = window.prompt('Colle ici une sauvegarde exportée :');
              if (!json) return;
              const { toast } = await import('./dom.js');
              try { store.importSave(json); toast('Sauvegarde importée.'); renderFeats(host); }
              catch { toast('Cette sauvegarde est illisible.'); }
            },
          }, 'Importer'),
          h('button.btn.btn--small.btn--danger', {
            type: 'button',
            onclick: async () => {
              if (!window.confirm('Tout effacer ? Les 68 preuves repartent de zéro.')) return;
              store.resetAll();
              renderFeats(host);
            },
          }, 'Repartir de zéro'))))));
  return () => {};
}
