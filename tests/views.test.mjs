// Les vues se rendent-elles sans exploser ? Test d'intégration côté interface,
// dans le DOM minimal de dom-stub.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, findByTag, findByClass } from './dom-stub.mjs';

const { app } = installDom();

const { renderAtlas, renderFeats } = await import('../js/ui/atlas.js');
const { renderLevel } = await import('../js/ui/level.js');
const { renderGrimoire, renderSandbox, PRESETS } = await import('../js/ui/grimoire.js');
const { md, expandAbbrev } = await import('../js/ui/dom.js');
const store = await import('../js/state.js');
const { LEVELS } = await import('../js/content/index.js');

test('l’accueil se rend et contient l’Atlas', () => {
  const stop = renderAtlas(app);
  const text = app.textContent;
  assert.match(text, /Atlas/);
  assert.match(text, /2 \+ 2 = 4/);
  assert.match(text, /Monde 1/);
  if (typeof stop === 'function') stop();
});

test('le Grimoire liste tactiques et lemmes', () => {
  renderGrimoire(app);
  const text = app.textContent;
  assert.match(text, /Grimoire/);
  assert.match(text, /add_comm/);
  assert.match(text, /induction/);
});

test('le bac à sable se rend avec un objectif par défaut', () => {
  renderSandbox(app);
  assert.match(app.textContent, /Bac à sable/);
});

test('les hauts faits affichent le rang', () => {
  renderFeats(app);
  assert.match(app.textContent, /Curieux/);
});

test('chaque niveau déverrouillé se rend', () => {
  // On débloque tout pour parcourir les 55 vues.
  store.importSave(JSON.stringify({ done: LEVELS.map((l) => l.id), xp: 0, hinted: [], revealed: [], drafts: {} }));
  for (const level of LEVELS) {
    assert.doesNotThrow(() => renderLevel(app, level.id), `la vue du niveau ${level.id} plante`);
    assert.match(app.textContent, new RegExp(escapeRe(level.title)), `${level.id} : titre absent`);
  }
  store.resetAll();
});

test('un niveau verrouillé affiche un message au lieu de l’éditeur', () => {
  renderLevel(app, '9.5');
  assert.match(app.textContent, /verrouillé/);
});

test('un identifiant de niveau inconnu ne plante pas', () => {
  renderLevel(app, '42.42');
  assert.match(app.textContent, /n’existe pas/);
});

test('le rendu Markdown produit les balises attendues', () => {
  assert.match(md('**gras** et `code`'), /<strong>gras<\/strong>/);
  assert.match(md('**gras** et `code`'), /<code>code<\/code>/);
  assert.match(md('- un\n- deux'), /<ul><li>un<\/li><li>deux<\/li><\/ul>/);
  assert.match(md('```\nrfl\n```'), /<pre><code>rfl<\/code><\/pre>/);
  assert.match(md('[Lean](https://lean-lang.org)'), /<a href="https:\/\/lean-lang\.org"/);
  assert.doesNotMatch(md('<script>alert(1)</script>'), /<script>/);
});

test('les abréviations de Lean se développent', () => {
  assert.equal(expandAbbrev('rw [\\l', 6).value, 'rw [←');
  assert.equal(expandAbbrev('\\all', 4).value, '∀');
  assert.equal(expandAbbrev('\\nat', 4).value, 'ℕ');
  assert.equal(expandAbbrev('rien', 4), null);
});

test('taper la solution dans l’éditeur valide le niveau et donne l’XP', () => {
  store.resetAll();
  renderLevel(app, '0.1');
  const area = findByTag(app, 'textarea');
  assert.ok(area, 'éditeur introuvable');

  area.value = 'rfl';
  area.fire('input');

  assert.equal(store.isDone('0.1'), true, 'le niveau devrait être marqué terminé');
  assert.equal(store.progress().xp, 10, 'l’XP du niveau devrait être créditée');
  assert.match(findByClass(app, 'feedback').textContent, /Preuve complète/);

  // Rejouer ne recrédite pas l'XP.
  area.fire('input');
  assert.equal(store.progress().xp, 10);
  store.resetAll();
});

const unlockUpTo = (ids) => store.importSave(JSON.stringify(
  { done: ids, xp: 0, hinted: [], revealed: [], drafts: {} }));

test('une tactique fausse affiche un message de la ligne fautive', () => {
  unlockUpTo(['0.1', '0.2', '0.3']);
  renderLevel(app, '1.1');
  const area = findByTag(app, 'textarea');
  area.value = 'rw [mul_zero]';
  area.fire('input');
  const feedback = findByClass(app, 'feedback');
  assert.match(feedback.textContent, /ligne 1/);
  assert.equal(store.isDone('1.1'), false);
  store.resetAll();
});

test('le brouillon est conservé entre deux visites', () => {
  unlockUpTo(['0.1', '0.2', '0.3']);
  renderLevel(app, '1.1');
  const area = findByTag(app, 'textarea');
  area.value = 'rw [add';
  area.fire('input');
  renderLevel(app, '1.1');
  assert.equal(findByTag(app, 'textarea').value, 'rw [add');
  store.resetAll();
});

test('les exemples du bac à sable se prouvent vraiment', async () => {
  const { runProof } = await import('../js/engine/proof.js');
  const { LEMMAS } = await import('../js/engine/lib.js');
  for (const preset of PRESETS) {
    const level = {
      name: 'preset',
      ctx: preset.ctx ? [preset.ctx] : [],
      goal: preset.goal,
      lemmas: LEMMAS.map((l) => l.name),
      arith: preset.arith,
    };
    const r = runProof(preset.script, level);
    assert.equal(r.error, null, `« ${preset.label} » : ${r.error?.message}`);
    assert.ok(r.solved, `« ${preset.label} » ne se termine pas`);
  }
});

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('le routeur monte la vue correspondant au fragment', async () => {
  store.resetAll();
  location.hash = '#/grimoire';
  window.location.hash = '#/grimoire';
  await import('../js/main.js'); // le module route au chargement
  assert.match(app.textContent, /Grimoire/);
  assert.equal(document.getElementById('rank-name').textContent, 'Curieux');
  assert.match(document.getElementById('xp-count').textContent, /0 \/ \d+ XP/);
});
