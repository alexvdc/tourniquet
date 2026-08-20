# ⊢ Tourniquet

**→ [tourniquet.netlify.app](https://tourniquet.netlify.app)**

**Apprendre Lean 4 en démontrant.** 59 niveaux, de « pourquoi 2 + 2 = 4 » aux tactiques
de décision de Mathlib. Site statique, zéro build, zéro serveur, zéro dépendance.

> Le nom vient du symbole `⊢`, le *tourniquet*, qui sépare ce qu'on sait de ce qu'il
> reste à prouver. C'est le seul objet que ce site sert à regarder.

## Le principe

Tu commences avec deux axiomes et une machine à fabriquer le nombre suivant. `1` n'est
qu'un surnom pour `succ 0`, l'addition est définie par deux équations, et **rien** n'est
admis d'avance — pas même que 2 + 2 fasse 4. Les théorèmes que tu démontres deviennent les
outils du monde suivant, jusqu'à un boss final qui se bat à la main, puis se refait en une
ligne avec `ring`.

| Monde | Sujet | Ce qu'on y démontre |
|---|---|---|
| 0 | Le Tableau | lire une fenêtre d'objectif, `rfl`, `exact`, `rw` |
| 1 | Peano | les axiomes de `+`, **2 + 2 = 4** en quatre réécritures, et l'injectivité de `succ` |
| 2 | La Récurrence | `induction`, `zero_add`, `add_assoc`, `add_comm` |
| 3 | Le Produit | `mul_add`, `mul_comm`, distributivité |
| 4 | Les Puissances | `pow_add`, puis la découverte de `ring` |
| 5 | L'Implication | Curry–Howard, `intro`, `apply`, le combinateur S |
| 6 | Les Connecteurs | `∧ ∨ ¬ ↔`, `cases`, `constructor`, De Morgan, et le tiers exclu |
| 7 | Les Quantificateurs | `∀ ∃`, `use`, pourquoi ∀∃ ≠ ∃∀ |
| 8 | L'Ordre | `≤` comme `∃`, transitivité |
| 9 | Le Vrai Lean | `simp`, `norm_num`, `have`, installer Lean, et l'identité remarquable à la main |

## Faire tourner le site

```bash
npm run dev     # http://localhost:8123
npm test        # moteur, contenu (les 59 preuves rejouées) et rendu des vues
npm run audit   # rendu réel dans Chrome : débordements, contrastes, console
```

Aucune dépendance à installer : le serveur de dev est un fichier de 50 lignes, et les
tests utilisent `node:test`. Node 18+ suffit.

## Déploiement

En ligne sur [tourniquet.netlify.app](https://tourniquet.netlify.app). Site statique
publié à la racine, aucune étape de build nécessaire.

`netlify.toml` déclare `publish = "."` et prend la suite de tests comme commande de
build : un niveau infaisable casse le déploiement, ce qui est exactement le but.

Redéploiement à la main depuis le dossier :

```bash
npx netlify-cli deploy --prod --dir .
```

## Architecture

```
js/engine/     le moteur de preuve — indépendant du DOM, testé à part
  expr.js      représentation des termes, substitution évitant la capture
  parser.js    lexer + parseur Pratt de la syntaxe de termes de Lean
  printer.js   impression avec le minimum de parenthèses
  reduce.js    bêta-réduction, dépliage de ¬ et ≠, arithmétique littérale
  elab.js      unification du premier ordre, infer/check, réécriture
  tactics.js   les 26 tactiques
  ring.js      normalisation polynomiale (la procédure de décision de `ring`)
  lib.js       la bibliothèque de lemmes
  proof.js     exécution d'un script de tactiques, ligne par ligne
js/content/    le parcours : mondes, niveaux, consignes, solutions, doc des tactiques
js/ui/         les vues (DOM à la main, pas de framework)
tests/         moteur, contenu, et rendu des vues dans un DOM minimal
tools/browse.mjs  pilotage d'un Chrome headless (captures, mesures, interaction)
```

### Vérifier le rendu pour de vrai

`tools/browse.mjs` pilote un Chrome headless par le Chrome DevTools Protocol, sans
dépendance (Node 22 fournit `WebSocket` et `fetch`) :

```bash
node tools/browse.mjs audit http://localhost:8123/ --width 390 --dpr 2
node tools/browse.mjs shoot http://localhost:8123/#/niveau/1.7 --width 1440 --full
node tools/browse.mjs play 1.7 --type "rw [add_zero]"     # joue vraiment le niveau
```

`audit` signale les débordements horizontaux, les contrastes sous le seuil WCAG AA
(avec composition de l'alpha) et les erreurs de console. `play` sème une progression
dans localStorage, recharge, tape la preuve et rapporte l'état de la fenêtre
d'objectif. Deux pièges sont documentés en tête du fichier : il faut créer son propre
onglet, et sous Windows une fenêtre ne descend pas sous ~500 px — c'est
`Emulation.setDeviceMetricsOverride` qui fixe la largeur.

Le moteur ne dépend de rien et ne connaît pas le navigateur : c'est ce qui permet de
rejouer les 59 solutions de référence dans la CI.

### Ajouter un niveau

Un niveau est un objet dans `js/content/worlds-*.js` :

```js
{
  id: '2.1', name: 'zero_add', title: 'Zéro à gauche',
  ctx: ['a : ℕ'], goal: '0 + a = a',
  lemmas: ['add_zero', 'add_succ'],       // ce que le niveau débloque
  tactics: ['rfl', 'rw', 'induction'],    // ce qui est autorisé ici
  xp: 30, brief: '…', hints: ['…'],
  sol: ['induction a', 'rw [add_zero]', 'rw [add_succ]', 'rw [ih]'],
}
```

`npm test` rejoue `sol` dans le moteur et vérifie que la preuve se ferme, que les lemmes
cités existent, et que les tactiques autorisées sont implémentées. Un niveau infaisable
fait échouer la suite.

## Ce que ce moteur n'est pas

Important, parce que c'est toute la différence avec l'outil réel :

- **Pas de noyau.** Le moteur ne construit pas de terme de preuve et rien ne revérifie
  son travail. Le vrai Lean réduit toute la confiance à un noyau de quelques milliers de
  lignes qui revérifie chaque preuve, tactiques comprises.
- **Unification du premier ordre seulement.** Les motifs d'ordre supérieur (`?f x`) ne
  s'unifient pas ; `Exists.intro` passe par la tactique `use` et les constructeurs
  anonymes `⟨_, _⟩`.
- **Un seul type de données**, ℕ, plus les propositions. Pas de classes de types, pas
  d'univers, pas de structures, pas de ℤ.
- **`ring` et `norm_num` décident sans certificat.** Dans Lean, elles produisent une
  preuve vérifiable.

Tout le reste — lire un objectif, choisir une tactique, comprendre pourquoi une
réécriture part dans le mauvais sens, la discipline des noms de Mathlib — se transfère
tel quel. Chaque niveau a un bouton qui envoie l'énoncé vers
[live.lean-lang.org](https://live.lean-lang.org) pour le refaire dans le vrai Lean.

## Crédits

Dette d'inspiration entièrement assumée envers le
[Natural Number Game](https://adam.math.hhu.de/#/g/leanprover-community/nng4) de Kevin
Buzzard et Mohammad Pedramfar, qui a eu l'idée du boss « 2 + 2 = 4 » bien avant moi. Le
NNG tourne sur un vrai serveur Lean ; Tourniquet a choisi l'inverse — un moteur maison
qui tient dans un navigateur, au prix de l'honnêteté ci-dessus.

Polices : Bodoni Moda, Spectral, Archivo, JetBrains Mono (Google Fonts).

MIT.
