// Tests de pédagogie. Le moteur peut être correct et le jeu incompréhensible :
// ici on vérifie les promesses faites à l'apprenant.
//
//   • une tactique n'apparaît jamais avant d'avoir été expliquée ;
//   • tout ce que le Grimoire documente existe, et réciproquement ;
//   • les exemples affichés dans une consigne sont utilisables dans ce niveau ;
//   • les solutions naturelles auxquelles pense un débutant sont acceptées ;
//   • les erreurs typiques produisent un message utile, pas une fuite d'interne.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORLDS, LEVELS, LEVEL_BY_ID } from '../js/content/index.js';
import { runProof } from '../js/engine/proof.js';
import { TACTIC_NAMES } from '../js/engine/tactics.js';
import { TACTIC_DOCS } from '../js/content/tactics-doc.js';
import { LEMMAS, ALWAYS } from '../js/engine/lib.js';
import { showState } from '../js/engine/printer.js';

const tacticOf = (line) => line.trim().match(/^([a-z_]+)/)?.[1] ?? null;

const documentedTactics = new Set(
  TACTIC_DOCS.flatMap((d) => d.name.split(/\s*\/\s*/).map((n) => n.trim())));

/* ───────────────────────────────────── ce qui est promis existe */

test('le Grimoire documente toutes les tactiques du moteur', () => {
  const missing = TACTIC_NAMES.filter((t) => !documentedTactics.has(t));
  assert.deepEqual(missing, [], `tactiques implémentées sans documentation : ${missing.join(', ')}`);
});

test('le Grimoire ne documente rien qui n’existe pas', () => {
  const ghosts = [...documentedTactics].filter((t) => !TACTIC_NAMES.includes(t));
  assert.deepEqual(ghosts, [], `documentées mais absentes du moteur : ${ghosts.join(', ')}`);
});

test('chaque lemme de la bibliothèque est atteignable dans un niveau', () => {
  const reachable = new Set(ALWAYS);
  for (const l of LEVELS) for (const n of l.lemmas ?? []) reachable.add(n);
  const orphans = LEMMAS.map((l) => l.name).filter((n) => !reachable.has(n));
  assert.deepEqual(orphans, [],
    `lemmes documentés mais jamais débloqués (donc inutilisables hors bac à sable) : ${orphans.join(', ')}`);
});

/* ───────────────────────────────────── progression */

test('une tactique est expliquée là où elle apparaît pour la première fois', () => {
  const seen = new Set();
  const problems = [];
  for (const level of LEVELS) {
    for (const line of level.sol) {
      const t = tacticOf(line);
      if (!t || seen.has(t)) continue;
      seen.add(t);
      const named = level.brief.includes(`\`${t}\``)
        || level.brief.includes(`\`${t} `)
        || (level.examples ?? []).some((e) => e.code.startsWith(t));
      if (!named) problems.push(`${level.id} utilise \`${t}\` sans l’expliquer`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('la solution d’un niveau n’emploie que ses tactiques autorisées', () => {
  for (const level of LEVELS) {
    if (!level.tactics) continue;
    for (const line of level.sol) {
      const t = tacticOf(line);
      if (t) assert.ok(level.tactics.includes(t), `${level.id} : \`${t}\` n’est pas autorisée ici`);
    }
  }
});

test('les exemples d’une consigne sont utilisables dans ce niveau', () => {
  const problems = [];
  for (const level of LEVELS) {
    for (const ex of level.examples ?? []) {
      const t = tacticOf(ex.code);
      if (!t) continue;
      if (!TACTIC_NAMES.includes(t)) { problems.push(`${level.id} montre \`${t}\`, qui n’existe pas`); continue; }
      if (level.tactics && !level.tactics.includes(t)) {
        problems.push(`${level.id} montre \`${t}\`, verrouillée dans ce niveau`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('chaque boss est mieux doté et mieux accompagné', () => {
  for (const world of WORLDS) {
    const boss = world.levels.find((l) => l.boss);
    if (!boss) continue;
    const others = world.levels.filter((l) => !l.boss);
    const moyenne = others.reduce((s, l) => s + l.xp, 0) / Math.max(1, others.length);
    assert.ok(boss.xp > moyenne, `le boss ${boss.id} rapporte moins que la moyenne du monde`);
    assert.ok(boss.hints.length >= 3, `le boss ${boss.id} n’a que ${boss.hints.length} indice(s)`);
    assert.ok(boss.brief.length > 400, `la consigne du boss ${boss.id} est trop maigre`);
  }
});

// Le dernier indice peut donner la réponse — c'est son rôle. Le premier, jamais :
// sinon il n'y a pas d'échelle, juste un interrupteur.
test('le premier indice ne donne jamais la solution', () => {
  for (const level of LEVELS) {
    const sol = level.sol.join(' ').replace(/\s+/g, ' ');
    assert.ok(level.hints.length >= 2, `${level.id} n’a qu’un seul indice : pas d’échelle`);
    assert.notEqual(level.hints[0].replace(/[`\s]+/g, ' ').trim(), sol,
      `${level.id} : le premier indice donne déjà tout`);
  }
});

/* ───────────────────────────────────── ce qu'un débutant essaie */

// Preuves différentes de la solution de référence, mais qu'un apprenant peut
// légitimement écrire. Si l'une casse, le jeu punit une bonne idée.
const ALTERNATIVES = [
  ['1.2', 'rw [add_zero]\nrw [add_zero]'],
  ['1.3', 'rw [add_succ, add_zero]'],
  ['2.1', 'induction a\nrw [add_zero]\nrw [add_succ, ih]'],
  ['5.1', 'exact fun h => h'],
  ['5.3', 'intro hp\nexact hqr (hpq hp)'],
  ['5.5', 'intro h1 h2 hp\nexact h1 hp (h2 hp)'],
  ['6.1', 'intro h\nexact And.left h'],
  ['6.2', 'intro hp hq\nexact ⟨hp, hq⟩'],
  ['6.3', 'intro h\ncases h with a b\nconstructor\nexact b\nexact a'],
  ['6.4', 'intro hp\nexact Or.inl hp'],
  ['6.6', 'intro hnp hp\ncontradiction'],
  ['7.1', 'intros\nrw [add_zero]'],
  ['7.3', 'apply h'],
  ['9.1', 'rw [add_zero, zero_add]'],
  ['9.2', 'ring'],
  ['9.2', 'decide'],
];

test('les preuves alternatives d’un débutant sont acceptées', () => {
  for (const [id, script] of ALTERNATIVES) {
    const level = LEVEL_BY_ID.get(id);
    assert.ok(level, `niveau ${id} introuvable`);
    const r = runProof(script, level);
    assert.ok(r.solved, `${id} refuse « ${script.replace(/\n/g, ' ⏎ ')} »`
      + (r.error ? ` → ${r.error.message}` : `\nreste :\n${showState(r.final.goals)}`));
  }
});

/* ───────────────────────────────────── ce qu'un débutant rate */

// Erreurs classiques, et ce que le message doit contenir pour être utile.
const MISTAKES = [
  ['1.1', 'rfl', /pas identiques|Continue à réécrire/],
  ['1.1', 'ring', /pas encore débloquée/],
  ['1.1', 'rw [add_comm]', /existe bien, mais ce niveau/],
  ['1.1', 'rw add_zero', /crochets/],
  // un lemme débloqué, mais dont le motif est absent de l'objectif
  ['1.1', 'rw [add_succ]', /n’apparaît pas/],
  // un lemme qui existe ailleurs dans le jeu, mais pas encore ici
  ['1.1', 'rw [mul_zero]', /existe bien, mais ce niveau/],
  ['1.1', 'blabla', /n’est pas une tactique/],
  ['1.7', 'rw [add_zero]', /n’apparaît pas/],
  ['2.1', 'induction b', /pas dans le contexte/],
  ['2.1', 'rw [ih]', /identifiant inconnu/],
  ['5.1', 'exact hp', /identifiant inconnu/],
  ['5.1', 'intro hp\nintro hq', /implication ou d’un ∀/],
  ['6.1', 'intro h\nexact h', /incompatibles|attendu/],
  ['6.2', 'intro hp hq\nleft', /∨/],

];

test('un mauvais témoin est diagnostiqué au lieu de laisser chercher', () => {
  const r = runProof('use 4', LEVEL_BY_ID.get('7.2'));
  assert.equal(r.error, null);
  assert.match(r.warning ?? '', /est faux/);
});

test('les erreurs typiques donnent un message utile', () => {
  for (const [id, script, expected] of MISTAKES) {
    const level = LEVEL_BY_ID.get(id);
    const r = runProof(script, level);
    const msg = r.error?.message ?? (r.solved ? '(la preuve a abouti)' : '(aucune erreur)');
    assert.match(msg, expected, `${id} « ${script.replace(/\n/g, ' ⏎ ')} » → ${msg}`);
  }
});

test('aucun message d’erreur ne laisse fuir l’intérieur du moteur', () => {
  const leaks = /undefined|NaN|\[object|✦|✝|\?m\d|Object\.|at [A-Z]\w+\./;
  const problems = [];
  // On bombarde chaque niveau de bêtises plausibles et on lit tout ce qui sort.
  const nonsense = ['rfl', 'simp', 'ring', 'exact h', 'apply h', 'intro x', 'cases h',
    'rw [h]', 'use 1', 'induction n', 'constructor', 'left', 'norm_num', 'unfold Nat.add'];
  for (const level of LEVELS) {
    for (const script of nonsense) {
      let r;
      try { r = runProof(script, level); }
      catch (err) { problems.push(`${level.id} « ${script} » lève ${err.name} : ${err.message}`); continue; }
      const msg = r.error?.message ?? '';
      if (leaks.test(msg)) problems.push(`${level.id} « ${script} » → ${msg}`);
      if (r.error && msg.trim().length < 15) problems.push(`${level.id} « ${script} » → message trop court : « ${msg} »`);
    }
  }
  assert.deepEqual(problems.slice(0, 12), [], problems.slice(0, 12).join('\n'));
});

test('le moteur ne boucle pas sur une entrée absurde', () => {
  const level = LEVEL_BY_ID.get('9.6');
  const bombs = ['repeat rw [add_comm]', 'simp', 'repeat simp', 'all_goals ring',
    'rw [add_comm, add_comm, add_comm]', 'repeat rw [two_mul]'];
  for (const script of bombs) {
    const started = process.hrtime.bigint();
    try { runProof(script, level); } catch { /* une erreur est acceptable */ }
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(ms < 3000, `« ${script} » a pris ${Math.round(ms)} ms`);
  }
});
