// Assemblage du parcours + tables de progression.

import { NAT_WORLDS } from './worlds-nat.js';
import { LOGIC_WORLDS } from './worlds-logic.js';
import { FINAL_WORLDS } from './worlds-final.js';

export const WORLDS = [...NAT_WORLDS, ...LOGIC_WORLDS, ...FINAL_WORLDS];

export const LEVELS = WORLDS.flatMap((w) =>
  w.levels.map((l, i) => ({ ...l, world: w.num, worldId: w.id, worldTitle: w.title, index: i })));

export const LEVEL_BY_ID = new Map(LEVELS.map((l) => [l.id, l]));

export const TOTAL_XP = LEVELS.reduce((s, l) => s + l.xp, 0);

/** Un niveau est ouvert dès que le précédent est terminé. */
export function isUnlocked(levelId, done) {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  if (i <= 0) return true;
  return done.has(LEVELS[i - 1].id);
}

export const nextLevel = (levelId) => {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  return i >= 0 && i + 1 < LEVELS.length ? LEVELS[i + 1] : null;
};

export const prevLevel = (levelId) => {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  return i > 0 ? LEVELS[i - 1] : null;
};

/**
 * Les rangs. Le seuil est un pourcentage de l'XP total : ajouter des niveaux
 * ne déclasse donc personne.
 */
export const RANKS = [
  { at: 0.00, name: 'Curieux', note: 'Tu viens d’ouvrir le tableau.' },
  { at: 0.06, name: 'Apprenti scribe', note: 'Tu sais réécrire.' },
  { at: 0.16, name: 'Arithméticien de Peano', note: '2 + 2 = 4, et tu sais pourquoi.' },
  { at: 0.30, name: 'Récurrentiste', note: 'L’infini ne te fait plus peur.' },
  { at: 0.45, name: 'Algébriste', note: 'ℕ est un semi-anneau, et c’est ton œuvre.' },
  { at: 0.60, name: 'Logicien', note: 'Curry–Howard n’est plus un nom de rue.' },
  { at: 0.75, name: 'Quantificateur assermenté', note: 'Tu ne confonds plus ∀∃ et ∃∀.' },
  { at: 0.88, name: 'Formaliste', note: 'Tu pourrais lire Mathlib.' },
  { at: 1.00, name: 'Architecte de Mathlib', note: 'Tout est démontré. ∎' },
];

export function rankFor(xp) {
  const ratio = TOTAL_XP ? xp / TOTAL_XP : 0;
  let best = RANKS[0];
  for (const r of RANKS) if (ratio >= r.at) best = r;
  const next = RANKS.find((r) => r.at > ratio) ?? null;
  return { ...best, next, ratio };
}

/** Hauts faits : calculés à la volée depuis la progression. */
export const ACHIEVEMENTS = [
  { id: 'premier-pas', name: 'Premier pas', glyph: '⊢', desc: 'Terminer un niveau.',
    test: (p) => p.done.size >= 1 },
  { id: 'deux-et-deux', name: 'Deux et deux', glyph: '④', desc: 'Démontrer que 2 + 2 = 4.',
    test: (p) => p.done.has('1.7') },
  { id: 'sans-indice', name: 'Sans filet', glyph: '◇', desc: 'Terminer un boss sans ouvrir d’indice.',
    test: (p) => LEVELS.some((l) => l.boss && p.done.has(l.id) && !(p.hinted ?? []).includes(l.id)) },
  { id: 'peano', name: 'Fils de Peano', glyph: 'ℕ', desc: 'Terminer le monde 1.',
    test: (p) => worldDone(1, p) },
  { id: 'recurrence', name: 'Par récurrence', glyph: '↻', desc: 'Démontrer la commutativité de l’addition.',
    test: (p) => p.done.has('2.5') },
  { id: 'anneau', name: 'Semi-anneau complet', glyph: '×', desc: 'Terminer les mondes 3 et 4.',
    test: (p) => worldDone(3, p) && worldDone(4, p) },
  { id: 'curry-howard', name: 'Curry–Howard', glyph: '→', desc: 'Terminer le monde 5.',
    test: (p) => worldDone(5, p) },
  { id: 'morgan', name: 'De Morgan', glyph: '¬', desc: 'Démontrer les lois de De Morgan.',
    test: (p) => p.done.has('6.7') },
  { id: 'temoin', name: 'Porteur de témoin', glyph: '∃', desc: 'Terminer le monde 7.',
    test: (p) => worldDone(7, p) },
  { id: 'sans-ring', name: 'À la main', glyph: '∎', desc: 'Battre le boss final sans `ring`.',
    test: (p) => p.done.has('9.5') },
  { id: 'integrale', name: 'Intégrale', glyph: '★', desc: 'Terminer les 41 niveaux.',
    test: (p) => p.done.size >= LEVELS.length },
];

function worldDone(num, p) {
  const ls = LEVELS.filter((l) => l.world === num);
  return ls.length > 0 && ls.every((l) => p.done.has(l.id));
}

export function achievementsFor(progress) {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: !!a.test(progress) }));
}
