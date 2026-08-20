// Suite de tests du moteur. Sans dépendance : `node --test tests/`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '../js/engine/parser.js';
import { show } from '../js/engine/printer.js';
import { alphaEq, subst, Var, Const, Lit } from '../js/engine/expr.js';
import { unify, matchPattern, rewriteWith } from '../js/engine/elab.js';
import { defEq, norm } from '../js/engine/reduce.js';
import { ringEq } from '../js/engine/ring.js';
import { runProof } from '../js/engine/proof.js';
import { buildLib, LEMMAS, lemmaType } from '../js/engine/lib.js';

const lib = (names) => buildLib(names);

test('le parseur et l’imprimeur font un aller-retour', () => {
  const cases = [
    ['2 + 2 = 4', '2 + 2 = 4'],
    ['succ (succ 0)', 'succ (succ 0)'],
    ['p ∧ q → q ∧ p', 'p ∧ q → q ∧ p'],
    ['(a + b) + c = a + (b + c)', 'a + b + c = a + (b + c)'],
    ['∀ (a b : ℕ), a + b = b + a', '∀ (a b : ℕ), a + b = b + a'],
    ['∃ x, x + 1 = 3', '∃ x, x + 1 = 3'],
    ['¬(p ∨ q) ↔ ¬p ∧ ¬q', '¬(p ∨ q) ↔ ¬p ∧ ¬q'],
    ['a * (b + c)', 'a * (b + c)'],
    ['a ^ 2 ^ 3', 'a ^ 2 ^ 3'],
    ['p -> q -> p', 'p → q → p'],
    ['fun h => h', 'fun h => h'],
    ['⟨h1, h2⟩', '⟨h1, h2⟩'],
  ];
  for (const [src, want] of cases) assert.equal(show(parse(src)), want, src);
});

test('les priorités des opérateurs suivent celles de Lean', () => {
  assert.equal(show(parse('a + b * c')), 'a + b * c');
  assert.equal(show(parse('(a + b) * c')), '(a + b) * c');
  assert.equal(show(parse('a = b → b = a')), 'a = b → b = a');
  assert.equal(show(parse('¬p ∧ q')), '¬p ∧ q');
  assert.equal(show(parse('¬(p ∧ q)')), '¬(p ∧ q)');
});

test('la substitution évite la capture de variable', () => {
  const e = parse('∀ (b : ℕ), a + b = b + a');
  const out = subst(e, 'a', Var('b'));
  // le liant `b` doit être renommé pour ne pas capturer le `b` substitué
  assert.notEqual(show(out), '∀ (b : ℕ), b + b = b + b');
  assert.match(show(out), /b \+ /);
});

test('l’unification résout les métavariables', () => {
  const sub = new Map();
  assert.ok(unify(parse('?x + 0'), parse('a + 0'), sub));
  assert.equal(show(sub.get('?x')), 'a');
});

test('le filtrage refuse de capturer une variable liée', () => {
  const sub = new Map();
  const ok = matchPattern(parse('?x'), parse('y'), sub, new Set(['y']));
  assert.equal(ok, false);
});

test('rfl ne calcule pas sans autorisation arithmétique', () => {
  assert.equal(defEq(parse('2 + 2'), parse('4'), {}), false);
  assert.equal(defEq(parse('2 + 2'), parse('4'), { arith: true }), true);
});

test('¬p se déplie en p → False', () => {
  assert.equal(show(norm(parse('¬p'), {})), 'p → False');
});

test('la réécriture instancie sur la première occurrence puis remplace partout', () => {
  const eq = lemmaType({ name: 'add_zero', stmt: '∀ (a : ℕ), a + 0 = a' });
  const res = rewriteWith(parse('a + 0 = b + 0'), eq);
  assert.equal(show(res.expr), 'a = b + 0');
});

test('la réécriture inversée fonctionne', () => {
  const eq = lemmaType({ name: 'one', stmt: '1 = succ 0' });
  const res = rewriteWith(parse('succ 0 = succ 0'), eq, { reverse: true });
  assert.equal(show(res.expr), '1 = 1');
});

test('ring décide les identités de semi-anneau', () => {
  assert.ok(ringEq(parse('(a + b) * (a + b)'), parse('a * a + 2 * (a * b) + b * b')));
  assert.ok(ringEq(parse('(a + b) ^ 3'), parse('a^3 + 3*(a^2*b) + 3*(a*b^2) + b^3')));
  assert.equal(ringEq(parse('a * b'), parse('a + b')), false);
});

test('un énoncé faux ne se prouve pas', () => {
  const level = { goal: '2 + 2 = 5', lemmas: ['add_zero', 'add_succ'], arith: true };
  const r = runProof('norm_num', level);
  assert.equal(r.solved, false);
  assert.ok(r.error);
});

test('une tactique verrouillée est refusée', () => {
  const level = { ctx: ['a b : ℕ'], goal: 'a + b = b + a', lemmas: [], tactics: ['rfl', 'rw'] };
  const r = runProof('ring', level);
  assert.match(r.error.message, /pas encore débloquée/);
});

test('un lemme non débloqué reste inconnu', () => {
  const level = { ctx: ['a b : ℕ'], goal: 'a + b = b + a', lemmas: ['add_zero'] };
  const r = runProof('rw [add_comm]', level);
  assert.match(r.error.message, /inconnu/);
});

test('sorry ferme l’objectif mais marque la preuve', () => {
  const level = { ctx: ['a : ℕ'], goal: 'a + 0 = a', lemmas: ['add_zero'], tactics: ['sorry'] };
  const r = runProof('sorry', level);
  assert.equal(r.final.goals.length, 0);
  assert.equal(r.sorried, true);
  assert.equal(r.solved, false);
});

test('les messages d’erreur nomment le motif absent', () => {
  const level = { ctx: ['a : ℕ'], goal: 'a + 0 = a', lemmas: ['mul_zero'] };
  const r = runProof('rw [mul_zero]', level);
  assert.match(r.error.message, /n’apparaît pas/);
});

test('induction produit le cas zéro puis le cas successeur', () => {
  const level = { ctx: ['a : ℕ'], goal: '0 + a = a', lemmas: ['add_zero', 'add_succ'] };
  const r = runProof('induction a', level);
  assert.equal(r.final.goals.length, 2);
  assert.equal(show(r.final.goals[0].target), '0 + 0 = 0');
  assert.equal(show(r.final.goals[1].target), '0 + succ a = succ a');
  assert.equal(r.final.goals[1].ctx.at(-1).name, 'ih');
});

test('tous les énoncés de la bibliothèque se parsent', () => {
  for (const l of LEMMAS) {
    assert.doesNotThrow(() => lemmaType(l), `énoncé illisible : ${l.name}`);
    assert.ok(show(lemmaType(l)).length > 0);
  }
});

test('l’instanciation ne capture pas une variable homonyme du liant', () => {
  // Régression : `le_iff_exists_add` liait `k`, et un niveau nommant sa variable
  // `k` voyait son objectif silencieusement capturé par le liant du lemme.
  const level = {
    ctx: ['a b k : ℕ', 'h : a ≤ b'],
    goal: 'a ≤ b',
    lemmas: ['le_iff_exists_add', 'add_zero'],
    tactics: ['rw', 'exact', 'cases', 'use', 'rfl'],
  };
  const r = runProof('rw [le_iff_exists_add] at h', level);
  assert.equal(r.error, null);
  const hyp = r.final.goals[0].ctx.find((x) => x.name === 'h');
  assert.match(show(hyp.type), /b = a \+ /);
  assert.doesNotMatch(show(hyp.type), /b = a \+ b/);
});

test('buildLib refuse un lemme inexistant', () => {
  assert.throws(() => lib(['ce_lemme_nexiste_pas']));
});
