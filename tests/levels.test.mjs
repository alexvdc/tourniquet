// Le garde-fou du contenu : chaque solution de référence est rejouée dans le
// moteur. Si un niveau devient infaisable, ce test tombe.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORLDS, LEVELS, LEVEL_BY_ID, TOTAL_XP, rankFor } from '../js/content/index.js';
import { runProof, levelState, statementOf } from '../js/engine/proof.js';
import { showState } from '../js/engine/printer.js';
import { BY_NAME } from '../js/engine/lib.js';
import { TACTIC_NAMES } from '../js/engine/tactics.js';

test('le parcours est bien formé', () => {
  assert.ok(WORLDS.length >= 10);
  const ids = LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants de niveaux dupliqués');
  for (const l of LEVELS) {
    assert.ok(l.title, `${l.id} sans titre`);
    assert.ok(l.brief && l.brief.length > 80, `${l.id} : consigne trop courte`);
    assert.ok(Array.isArray(l.sol) && l.sol.length, `${l.id} sans solution`);
    assert.ok(Array.isArray(l.hints) && l.hints.length, `${l.id} sans indice`);
    assert.ok(l.xp > 0, `${l.id} sans XP`);
    assert.ok(l.name && /^[a-z_0-9]+$/.test(l.name), `${l.id} : nom de théorème invalide`);
  }
});

test('chaque niveau ne référence que des lemmes et tactiques existants', () => {
  for (const l of LEVELS) {
    for (const name of l.lemmas ?? []) {
      assert.ok(BY_NAME.has(name), `${l.id} référence le lemme inconnu ${name}`);
    }
    for (const t of l.tactics ?? []) {
      assert.ok(TACTIC_NAMES.includes(t), `${l.id} autorise la tactique inconnue ${t}`);
    }
  }
});

test('l’état initial de chaque niveau est constructible', () => {
  for (const l of LEVELS) {
    assert.doesNotThrow(() => levelState(l), `${l.id} : contexte ou objectif illisible`);
    assert.ok(statementOf(l).startsWith('theorem '));
  }
});

// Le cœur du test : les 55 preuves de référence.
for (const world of WORLDS) {
  test(`monde ${world.num} — ${world.title}`, async (t) => {
    for (const level of world.levels) {
      await t.test(`${level.id} ${level.title}`, () => {
        const script = level.sol.join('\n');
        const r = runProof(script, level);
        if (r.error) {
          assert.fail(`${level.id} — ligne ${r.error.line + 1} « ${level.sol[r.error.line]} » : `
            + `${r.error.message}\n\nÉtat :\n${showState(r.final.goals)}`);
        }
        assert.ok(r.solved,
          `${level.id} — la solution ne clôt pas la preuve.\nReste :\n${showState(r.final.goals)}`);
      });
    }
  });
}

test('une solution tronquée ne valide pas le niveau', () => {
  const boss = LEVEL_BY_ID.get('1.7');
  const r = runProof(boss.sol.slice(0, -1).join('\n'), boss);
  assert.equal(r.solved, false);
});

test('les indices ne donnent pas la solution complète du boss final', () => {
  const boss = LEVEL_BY_ID.get('9.5');
  assert.ok(boss.hints.length >= 3);
});

test('les rangs couvrent tout le parcours', () => {
  assert.ok(TOTAL_XP > 0);
  assert.equal(rankFor(0).name, 'Curieux');
  assert.equal(rankFor(TOTAL_XP).name, 'Architecte de Mathlib');
  assert.equal(rankFor(TOTAL_XP).next, null);
});
