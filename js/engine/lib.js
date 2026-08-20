// Bibliothèque de lemmes. Chaque entrée est visible dans le Grimoire et n'est
// utilisable dans un niveau que si ce niveau la débloque : c'est ce qui empêche
// de prouver `add_comm` avec `add_comm`.

import { parse } from './parser.js';

/**
 * kind : axiom  = admis (définition de +, de *, chiffres…)
 *        thm    = démontré quelque part dans le jeu
 *        struct = constructeur ou éliminateur logique
 */
export const LEMMAS = [
  // ── Définitions de ℕ ────────────────────────────────────────────────────
  { name: 'add_zero', stmt: '∀ (a : ℕ), a + 0 = a', kind: 'axiom', simp: true, group: 'Addition',
    doc: 'Ajouter zéro ne fait rien. C’est la première des deux équations qui *définissent* l’addition.' },
  { name: 'add_succ', stmt: '∀ (a b : ℕ), a + succ b = succ (a + b)', kind: 'axiom', simp: true, group: 'Addition',
    doc: 'Ajouter le successeur, c’est le successeur de l’addition. Deuxième équation de définition : elle fait descendre le second argument vers zéro.' },
  { name: 'zero_add', stmt: '∀ (a : ℕ), 0 + a = a', kind: 'thm', simp: true, group: 'Addition',
    doc: 'La symétrique de `add_zero` — et elle n’est *pas* gratuite : il faut une récurrence.' },
  { name: 'succ_add', stmt: '∀ (a b : ℕ), succ a + b = succ (a + b)', kind: 'thm', simp: true, group: 'Addition',
    doc: 'Le successeur passe à travers l’addition, côté gauche. Démontré par récurrence sur `b`.' },
  { name: 'add_assoc', stmt: '∀ (a b c : ℕ), a + b + c = a + (b + c)', kind: 'thm', group: 'Addition',
    doc: 'L’associativité. `a + b + c` se lit `(a + b) + c` : le `+` est associatif à gauche.' },
  { name: 'add_comm', stmt: '∀ (a b : ℕ), a + b = b + a', kind: 'thm', group: 'Addition',
    doc: 'La commutativité. Le premier vrai théorème du jeu.' },
  { name: 'add_right_comm', stmt: '∀ (a b c : ℕ), a + b + c = a + c + b', kind: 'thm', group: 'Addition',
    doc: 'Échange les deux derniers termes. Pratique pour ranger une somme sans passer par `add_comm` trois fois.' },
  { name: 'succ_inj', stmt: '∀ (a b : ℕ), succ a = succ b → a = b', kind: 'axiom', group: 'Successeur',
    doc: '`succ` est injective : si deux successeurs sont égaux, leurs prédécesseurs le sont. Un des axiomes de Peano.' },
  { name: 'succ_ne_zero', stmt: '∀ (a : ℕ), succ a ≠ 0', kind: 'axiom', group: 'Successeur',
    doc: 'Zéro n’est le successeur de personne. L’autre axiome de Peano — celui qui interdit à ℕ de boucler.' },

  // ── Chiffres ────────────────────────────────────────────────────────────
  { name: 'one_eq_succ_zero', stmt: '1 = succ 0', kind: 'axiom', group: 'Chiffres',
    doc: 'Un vaut le successeur de zéro. Un chiffre n’est qu’une abréviation.' },
  { name: 'two_eq_succ_one', stmt: '2 = succ 1', kind: 'axiom', group: 'Chiffres',
    doc: 'Deux vaut le successeur de un.' },
  { name: 'three_eq_succ_two', stmt: '3 = succ 2', kind: 'axiom', group: 'Chiffres',
    doc: 'Trois vaut le successeur de deux.' },
  { name: 'four_eq_succ_three', stmt: '4 = succ 3', kind: 'axiom', group: 'Chiffres',
    doc: 'Quatre vaut le successeur de trois. C’est la clé du boss du monde 1.' },
  { name: 'five_eq_succ_four', stmt: '5 = succ 4', kind: 'axiom', group: 'Chiffres',
    doc: 'Cinq vaut le successeur de quatre.' },
  { name: 'six_eq_succ_five', stmt: '6 = succ 5', kind: 'axiom', group: 'Chiffres',
    doc: 'Six vaut le successeur de cinq.' },

  // ── Multiplication et puissance ─────────────────────────────────────────
  { name: 'mul_zero', stmt: '∀ (a : ℕ), a * 0 = 0', kind: 'axiom', simp: true, group: 'Multiplication',
    doc: 'Multiplier par zéro donne zéro. Première équation de définition de `*`.' },
  { name: 'mul_succ', stmt: '∀ (a b : ℕ), a * succ b = a * b + a', kind: 'axiom', simp: true, group: 'Multiplication',
    doc: 'Deuxième équation de définition de `*` : une multiplication est une addition répétée.' },
  { name: 'zero_mul', stmt: '∀ (a : ℕ), 0 * a = 0', kind: 'thm', simp: true, group: 'Multiplication',
    doc: 'Zéro absorbe à gauche aussi. Récurrence.' },
  { name: 'succ_mul', stmt: '∀ (a b : ℕ), succ a * b = a * b + b', kind: 'thm', group: 'Multiplication',
    doc: 'Le successeur côté gauche de `*`.' },
  { name: 'mul_one', stmt: '∀ (a : ℕ), a * 1 = a', kind: 'thm', simp: true, group: 'Multiplication',
    doc: 'Un est neutre à droite.' },
  { name: 'one_mul', stmt: '∀ (a : ℕ), 1 * a = a', kind: 'thm', simp: true, group: 'Multiplication',
    doc: 'Un est neutre à gauche.' },
  { name: 'mul_add', stmt: '∀ (a b c : ℕ), a * (b + c) = a * b + a * c', kind: 'thm', group: 'Multiplication',
    doc: 'Distributivité à gauche. Le pont entre `+` et `*`.' },
  { name: 'add_mul', stmt: '∀ (a b c : ℕ), (a + b) * c = a * c + b * c', kind: 'thm', group: 'Multiplication',
    doc: 'Distributivité à droite.' },
  { name: 'mul_comm', stmt: '∀ (a b : ℕ), a * b = b * a', kind: 'thm', group: 'Multiplication',
    doc: 'Commutativité du produit.' },
  { name: 'two_mul', stmt: '∀ (a : ℕ), 2 * a = a + a', kind: 'thm', group: 'Multiplication',
    doc: 'Multiplier par deux, c’est additionner à soi-même. Indispensable au boss final.' },
  { name: 'mul_assoc', stmt: '∀ (a b c : ℕ), a * b * c = a * (b * c)', kind: 'thm', group: 'Multiplication',
    doc: 'Associativité du produit.' },
  { name: 'pow_zero', stmt: '∀ (a : ℕ), a ^ 0 = 1', kind: 'axiom', simp: true, group: 'Puissance',
    doc: 'Tout élément à la puissance zéro vaut un — zéro compris, par convention.' },
  { name: 'pow_succ', stmt: '∀ (a b : ℕ), a ^ succ b = a ^ b * a', kind: 'axiom', simp: true, group: 'Puissance',
    doc: 'Une puissance de plus, un facteur de plus.' },

  // ── Logique ─────────────────────────────────────────────────────────────
  { name: 'And.intro', stmt: '∀ {p q : Prop}, p → q → p ∧ q', kind: 'struct', group: 'Conjonction',
    doc: 'Construit une conjonction à partir de ses deux moitiés. `⟨hp, hq⟩` en est le raccourci.' },
  { name: 'And.left', stmt: '∀ {p q : Prop}, p ∧ q → p', kind: 'struct', group: 'Conjonction',
    doc: 'Récupère la moitié gauche d’une conjonction.' },
  { name: 'And.right', stmt: '∀ {p q : Prop}, p ∧ q → q', kind: 'struct', group: 'Conjonction',
    doc: 'Récupère la moitié droite.' },
  { name: 'Or.inl', stmt: '∀ {p q : Prop}, p → p ∨ q', kind: 'struct', group: 'Disjonction',
    doc: 'Prouve une disjonction par la gauche. La tactique `left` fait la même chose.' },
  { name: 'Or.inr', stmt: '∀ {p q : Prop}, q → p ∨ q', kind: 'struct', group: 'Disjonction',
    doc: 'Prouve une disjonction par la droite.' },
  { name: 'Or.elim', stmt: '∀ {p q r : Prop}, p ∨ q → (p → r) → (q → r) → r', kind: 'struct', group: 'Disjonction',
    doc: 'Raisonnement par cas : si les deux branches mènent à `r`, alors `r`. `cases` l’applique pour toi.' },
  { name: 'Iff.intro', stmt: '∀ {p q : Prop}, (p → q) → (q → p) → p ↔ q', kind: 'struct', group: 'Équivalence',
    doc: 'Une équivalence est une paire d’implications.' },
  { name: 'Iff.mp', stmt: '∀ {p q : Prop}, (p ↔ q) → p → q', kind: 'struct', group: 'Équivalence',
    doc: '*modus ponens* : traverse l’équivalence de gauche à droite.' },
  { name: 'Iff.mpr', stmt: '∀ {p q : Prop}, (p ↔ q) → q → p', kind: 'struct', group: 'Équivalence',
    doc: 'Traverse l’équivalence de droite à gauche.' },
  { name: 'False.elim', stmt: '∀ {p : Prop}, False → p', kind: 'struct', group: 'Négation',
    doc: 'De l’absurde on déduit tout. La tactique `exfalso` remplace l’objectif par `False`.' },
  { name: 'absurd', stmt: '∀ {p q : Prop}, p → ¬p → q', kind: 'struct', group: 'Négation',
    doc: 'Une proposition et sa négation ensemble : contradiction, donc tout.' },
  { name: 'not_not', stmt: '∀ (p : Prop), ¬¬p ↔ p', kind: 'axiom', group: 'Négation',
    doc: 'La double négation s’efface. Attention : cette équivalence est *classique*, elle n’est pas démontrable en logique constructive.' },
  { name: 'em', stmt: '∀ (p : Prop), p ∨ ¬p', kind: 'axiom', group: 'Négation',
    doc: 'Le tiers exclu. Le second visage de l’axiome classique.' },
  { name: 'Eq.symm', stmt: '∀ {α : Type} {a b : α}, a = b → b = a', kind: 'struct', group: 'Égalité',
    doc: 'Retourne une égalité.' },
  { name: 'Eq.trans', stmt: '∀ {α : Type} {a b c : α}, a = b → b = c → a = c', kind: 'struct', group: 'Égalité',
    doc: 'Enchaîne deux égalités.' },
  { name: 'trivial', stmt: 'True', kind: 'struct', group: 'Égalité',
    doc: 'La preuve de `True`. Il n’y a rien à faire, et c’est bien le point.' },

  // ── Ordre ───────────────────────────────────────────────────────────────
  { name: 'le_iff_exists_add', stmt: '∀ (a b : ℕ), a ≤ b ↔ ∃ (k : ℕ), b = a + k', kind: 'axiom', group: 'Ordre',
    doc: 'La définition de ≤ sur ℕ : `a ≤ b` signifie qu’il reste un `c` à ajouter à `a` pour atteindre `b`.' },
  { name: 'le_refl', stmt: '∀ (a : ℕ), a ≤ a', kind: 'thm', group: 'Ordre',
    doc: 'Tout entier est inférieur ou égal à lui-même.' },
  { name: 'le_trans', stmt: '∀ (a b c : ℕ), a ≤ b → b ≤ c → a ≤ c', kind: 'thm', group: 'Ordre',
    doc: 'Transitivité de ≤.' },
  { name: 'zero_le', stmt: '∀ (a : ℕ), 0 ≤ a', kind: 'thm', group: 'Ordre',
    doc: 'Zéro est le plus petit.' },
  { name: 'le_succ_self', stmt: '∀ (a : ℕ), a ≤ succ a', kind: 'thm', group: 'Ordre',
    doc: 'Un pas en avant reste au-dessus.' },
];

const parsedCache = new Map();

export function lemmaType(entry) {
  if (!parsedCache.has(entry.name)) parsedCache.set(entry.name, parse(entry.stmt));
  return parsedCache.get(entry.name);
}

export const BY_NAME = new Map(LEMMAS.map((l) => [l.name, l]));

/** Toujours accessibles : les briques du langage lui-même. */
export const ALWAYS = ['And.intro', 'And.left', 'And.right', 'Or.inl', 'Or.inr',
  'Iff.intro', 'Iff.mp', 'Iff.mpr', 'False.elim', 'Eq.symm', 'Eq.trans', 'trivial'];

/**
 * Construit la bibliothèque visible pour un niveau.
 * @param {string[]} names lemmes débloqués par le niveau
 * @param {boolean} withAlways ajouter les briques logiques de base
 */
export function buildLib(names = [], withAlways = true) {
  const lib = new Map();
  const add = (n) => {
    const e = BY_NAME.get(n);
    if (!e) throw new Error(`lemme inconnu dans la bibliothèque : ${n}`);
    lib.set(n, { ...e, type: lemmaType(e) });
  };
  for (const n of names) add(n);
  if (withAlways) for (const n of ALWAYS) if (!lib.has(n)) add(n);
  return lib;
}

/** Ensemble simp par défaut : les équations marquées `simp` et débloquées. */
export function simpSet(lib) {
  return [...lib.values()].filter((e) => e.simp);
}
