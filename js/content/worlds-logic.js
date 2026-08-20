// Mondes 5 à 7 : implication, connecteurs, quantificateurs.

const T_IMP = ['rfl', 'exact', 'apply', 'intro', 'intros'];
const T_CONN = [...T_IMP, 'cases', 'constructor', 'left', 'right', 'exfalso',
  'contradiction', 'trivial'];
const T_QUANT = [...T_CONN, 'use', 'rw', 'norm_num'];

export const WORLD_IMPLICATION = {
  num: 5,
  id: 'implication',
  title: 'L’Implication',
  subtitle: 'Des preuves qui sont des fonctions',
  glyph: '→',
  intro: `Changement de décor : plus de nombres pour un moment. On travaille sur des énoncés quelconques \`p\`, \`q\`, \`r\`, et sur la flèche \`→\`. Tu vas découvrir la plus jolie idée de la théorie des types : une preuve de \`p → q\` **est** une fonction qui transforme une preuve de \`p\` en preuve de \`q\`.`,
  levels: [
    {
      id: '5.1',
      name: 'implication_reflexive',
      title: 'La flèche vide',
      ctx: ['p : Prop'],
      goal: 'p → p',
      lemmas: [],
      tactics: T_IMP,
      logic: true,
      xp: 20,
      brief: `Pour prouver \`p → q\`, on suppose \`p\` et on montre \`q\`. La tactique s’appelle \`intro\` : elle prend l’hypothèse à gauche de la flèche, la nomme, et la range dans le contexte.

\`intro hp\` transforme

\`\`\`
⊢ p → p        en        hp : p
                         ⊢ p
\`\`\`

Vu comme un programme : tu écris une fonction, \`intro\` déclare son paramètre. La suite du tableau, c’est le corps de la fonction. Pour \`p → p\`, tu écris donc l’identité.`,
      examples: [{ code: 'intro hp', note: 'Nomme l’hypothèse de gauche et l’ajoute au contexte.' }],
      hints: ['`intro hp` d’abord.', 'Puis `exact hp`.'],
      sol: ['intro hp', 'exact hp'],
    },
    {
      id: '5.2',
      name: 'constante',
      title: 'Ignorer une hypothèse',
      ctx: ['p q : Prop'],
      goal: 'p → q → p',
      lemmas: [],
      tactics: T_IMP,
      logic: true,
      xp: 20,
      brief: `La flèche est associative **à droite** : \`p → q → p\` se lit \`p → (q → p)\`. Deux hypothèses à introduire, donc, et \`intro\` accepte plusieurs noms d’un coup.

Rien n’oblige à utiliser toutes ses hypothèses. Cet énoncé est la fonction constante — et il porte un nom en logique : c’est l’axiome K.`,
      examples: [{ code: 'intro hp hq', note: 'Introduit deux hypothèses en une ligne.' }],
      hints: ['Introduis les deux hypothèses.', 'Une seule des deux sert.'],
      sol: ['intro hp hq', 'exact hp'],
    },
    {
      id: '5.3',
      name: 'modus_ponens',
      title: 'Remonter la flèche',
      ctx: ['p q r : Prop', 'hpq : p → q', 'hqr : q → r'],
      goal: 'p → r',
      lemmas: [],
      tactics: T_IMP,
      logic: true,
      xp: 30,
      brief: `Deux façons de se servir d’une implication.

**En avant** — comme une fonction : si \`hpq : p → q\` et \`hp : p\`, alors \`hpq hp\` est une preuve de \`q\`. On applique, littéralement.

**En arrière** — avec \`apply\`. Si l’objectif est \`r\` et que \`hqr : q → r\`, alors \`apply hqr\` remplace l’objectif \`r\` par \`q\` : « il me suffit de prouver \`q\` ». C’est le raisonnement rétrograde, celui qu’on fait naturellement au tableau, et c’est souvent le plus confortable.

Les deux mènent au même terme de preuve. \`apply\` fabrique les trous, \`exact\` les remplit.`,
      examples: [
        { code: 'apply hqr', note: 'Objectif `r` ⟶ objectif `q`.' },
        { code: 'exact hqr (hpq hp)', note: 'La même preuve, écrite d’un trait.' },
      ],
      hints: ['`intro hp`, puis remonte : `apply hqr`.', 'Puis `apply hpq`, et enfin `exact hp`.'],
      sol: ['intro hp', 'apply hqr', 'apply hpq', 'exact hp'],
    },
    {
      id: '5.4',
      name: 'composition',
      title: 'Composer',
      ctx: ['p q r : Prop'],
      goal: '(p → q) → (q → r) → (p → r)',
      lemmas: [],
      tactics: T_IMP,
      logic: true,
      xp: 35,
      brief: `Le même contenu que le niveau précédent, mais avec les implications **dans** l’énoncé au lieu du contexte. C’est la composition de fonctions, écrite en logique.

Si tu connais un langage fonctionnel, tu viens d’écrire \`g ∘ f\`. La correspondance entre preuves et programmes n’est pas une métaphore : c’est un théorème, l’isomorphisme de Curry–Howard, et c’est sur lui que Lean est bâti.`,
      examples: [{ code: 'intro hpq hqr hp', note: 'Trois hypothèses, une ligne.' }],
      hints: ['Introduis les trois hypothèses.', 'Puis remonte avec `apply` deux fois.'],
      sol: ['intro hpq hqr hp', 'apply hqr', 'apply hpq', 'exact hp'],
    },
    {
      id: '5.5',
      name: 'distribution',
      title: 'Le combinateur S',
      boss: true,
      ctx: ['p q r : Prop'],
      goal: '(p → q → r) → (p → q) → p → r',
      lemmas: [],
      tactics: T_IMP,
      logic: true,
      xp: 55,
      brief: `Boss du monde 5. En logique combinatoire il s’appelle **S**, et avec la fonction constante du niveau 5.2 (**K**), il suffit à écrire *tous* les programmes possibles. Deux énoncés, et toute la calculabilité.

Le piège est ailleurs : quand \`apply\` utilise un lemme à deux hypothèses, il crée **deux** objectifs. Ils apparaissent l’un après l’autre dans la fenêtre, et tes tactiques suivantes s’adressent au premier. Ne te perds pas : lis la fenêtre à chaque étape.

Et une fois que tu l’as, essaie la version en un seul terme. Elle tient en trois mots.`,
      examples: [{ code: 'exact h1 hp (h2 hp)', note: 'La preuve directe, sans tactique de recherche.' }],
      hints: [
        '`intro h1 h2 hp`.',
        '`apply h1` ouvre deux objectifs : `p` puis `q`.',
        'Le premier est `exact hp` ; pour le second, `apply h2` puis `exact hp`.',
      ],
      sol: ['intro h1 h2 hp', 'apply h1', 'exact hp', 'apply h2', 'exact hp'],
    },
  ],
};

export const WORLD_CONNECTEURS = {
  num: 6,
  id: 'connecteurs',
  title: 'Les Connecteurs',
  subtitle: 'et, ou, non',
  glyph: '∧',
  intro: `\`∧\`, \`∨\`, \`¬\`, \`↔\`. Chacun se manipule dans deux sens : le **construire** quand il est dans l’objectif, le **casser** quand il est dans une hypothèse. Toute la logique propositionnelle tient dans ce tableau à deux colonnes.`,
  levels: [
    {
      id: '6.1',
      name: 'and_left',
      title: 'Casser un et',
      ctx: ['p q : Prop'],
      goal: 'p ∧ q → p',
      lemmas: [],
      tactics: T_CONN,
      logic: true,
      xp: 20,
      brief: `Une preuve de \`p ∧ q\` est une **paire** : une preuve de \`p\` et une preuve de \`q\`, rangées ensemble.

\`cases h with hp hq\` ouvre la paire : \`h\` disparaît, \`hp : p\` et \`hq : q\` la remplacent. C’est de la destructuration, exactement comme sur un tuple.`,
      examples: [
        { code: 'cases h with hp hq', note: 'Remplace `h : p ∧ q` par ses deux moitiés.' },
        { code: 'exact And.left h', note: 'Sans casser : la projection gauche.' },
      ],
      hints: ['`intro h` puis `cases h with hp hq`.', 'La moitié gauche suffit.'],
      sol: ['intro h', 'cases h with hp hq', 'exact hp'],
    },
    {
      id: '6.2',
      name: 'and_intro',
      title: 'Construire un et',
      ctx: ['p q : Prop'],
      goal: 'p → q → p ∧ q',
      lemmas: [],
      tactics: T_CONN,
      logic: true,
      xp: 20,
      brief: `Dans l’autre sens : \`constructor\` coupe un objectif \`p ∧ q\` en deux objectifs, \`p\` et \`q\`. Tu prouves les deux moitiés séparément.

Il existe un raccourci qui vaut la peine d’être connu : \`exact ⟨hp, hq⟩\`. Les chevrons \`⟨ ⟩\` (tapés \`\\<\` et \`\\>\`) construisent n’importe quelle structure à partir de ses composantes — et Lean devine laquelle grâce au type attendu.`,
      examples: [
        { code: 'constructor', note: 'Un objectif `p ∧ q` devient deux objectifs.' },
        { code: 'exact ⟨hp, hq⟩', note: 'Le constructeur anonyme, en une ligne.' },
      ],
      hints: ['`intro hp hq`, puis `constructor`.', 'Deux objectifs, deux `exact`.'],
      sol: ['intro hp hq', 'constructor', 'exact hp', 'exact hq'],
    },
    {
      id: '6.3',
      name: 'and_comm',
      title: 'Commuter un et',
      ctx: ['p q : Prop'],
      goal: 'p ∧ q → q ∧ p',
      lemmas: [],
      tactics: T_CONN,
      logic: true,
      xp: 25,
      brief: `Casser puis reconstruire, dans l’autre ordre. Trois lignes si tu utilises les chevrons.

Remarque au passage la différence avec \`add_comm\` : celui-là avait demandé une récurrence et deux lemmes auxiliaires. Ici, la commutativité est immédiate, parce que \`∧\` est *défini* comme une paire, alors que \`+\` est défini par récursion asymétrique. La difficulté d’une preuve dépend de la définition, jamais de l’intuition.`,
      examples: [{ code: 'exact ⟨hq, hp⟩', note: 'La paire, échangée.' }],
      hints: ['`intro h`, `cases h with hp hq`.', 'Reconstruis avec `⟨hq, hp⟩`.'],
      sol: ['intro h', 'cases h with hp hq', 'exact ⟨hq, hp⟩'],
    },
    {
      id: '6.4',
      name: 'or_intro',
      title: 'Choisir un côté',
      ctx: ['p q : Prop'],
      goal: 'p → p ∨ q',
      lemmas: [],
      tactics: T_CONN,
      logic: true,
      xp: 20,
      brief: `\`∨\` est l’exact opposé de \`∧\`. Pour le **construire**, il faut choisir un côté : \`left\` ou \`right\`. Une preuve de \`p ∨ q\` n’est pas seulement « l’un des deux est vrai », c’est « voici lequel, et sa preuve ».

Cette exigence a une conséquence célèbre : \`p ∨ ¬p\` n’est **pas** démontrable en logique constructive. Pour l’avoir, il faut l’ajouter comme axiome — c’est le tiers exclu, et il est rangé dans le Grimoire sous le nom \`em\`.`,
      examples: [
        { code: 'left', note: 'Objectif `p ∨ q` ⟶ objectif `p`.' },
        { code: 'right', note: 'Objectif `p ∨ q` ⟶ objectif `q`.' },
      ],
      hints: ['`intro hp`, puis choisis le bon côté.', 'left'],
      sol: ['intro hp', 'left', 'exact hp'],
    },
    {
      id: '6.5',
      name: 'or_comm',
      title: 'Raisonner par cas',
      ctx: ['p q : Prop'],
      goal: 'p ∨ q → q ∨ p',
      lemmas: [],
      tactics: T_CONN,
      logic: true,
      xp: 30,
      brief: `Pour **casser** un \`∨\` en hypothèse, c’est encore \`cases\` — mais cette fois il produit **deux objectifs** : un où l’hypothèse gauche est vraie, un où c’est la droite. Il faut conclure dans les deux.

C’est le raisonnement par cas, et c’est la raison pour laquelle \`∨\` est plus lourd que \`∧\` : une paire, on la lit ; une alternative, il faut la traiter deux fois.

Dans chaque branche, tu construis le \`∨\` de l’objectif avec \`left\` ou \`right\` — et ce ne sera pas le même côté des deux fois.`,
      examples: [{ code: 'cases h with hp hq', note: 'Deux objectifs : un par branche.' }],
      hints: [
        '`intro h` puis `cases h with hp hq`.',
        'Premier objectif : `hp : p`, il faut `q ∨ p` — donc `right`.',
        'Deuxième objectif : `hq : q`, donc `left`.',
      ],
      sol: ['intro h', 'cases h with hp hq', 'right', 'exact hp', 'left', 'exact hq'],
    },
    {
      id: '6.6',
      name: 'negation',
      title: 'La négation n’existe pas',
      ctx: ['p q : Prop'],
      goal: '¬p → p → q',
      lemmas: [],
      tactics: T_CONN,
      logic: true,
      xp: 30,
      brief: `Il n’y a pas de connecteur « non » dans Lean. \`¬p\` est une **notation** pour \`p → False\`, et \`False\` est l’énoncé sans aucune preuve.

Tout en découle :

- une hypothèse \`hnp : ¬p\` s’utilise comme une fonction : \`hnp hp\` est une preuve de \`False\` ;
- de \`False\` on déduit n’importe quoi, donc une contradiction dans le contexte ferme le tableau, quel que soit l’objectif ;
- \`exfalso\` remplace l’objectif par \`False\` — utile quand tu sais que tu vas conclure par l’absurde.

Ici l’objectif est un \`q\` dont on ne sait rien. Aucune chance de le prouver directement : il faut passer par l’absurde.`,
      examples: [
        { code: 'exfalso', note: 'Remplace l’objectif par `False`.' },
        { code: 'contradiction', note: 'Cherche seule la contradiction dans le contexte.' },
      ],
      hints: ['`intro hnp hp`, puis `exfalso`.', '`exact hnp hp` : une fonction appliquée à son argument.'],
      sol: ['intro hnp hp', 'exfalso', 'exact hnp hp'],
    },
    {
      id: '6.7',
      name: 'de_morgan',
      title: 'De Morgan',
      boss: true,
      ctx: ['p q : Prop'],
      goal: '¬(p ∨ q) ↔ ¬p ∧ ¬q',
      lemmas: [],
      tactics: T_CONN,
      logic: true,
      xp: 80,
      brief: `Le boss du monde 6, et le plus long tableau du jeu jusqu’ici. Tu vas manipuler les quatre connecteurs en même temps.

\`↔\` est une paire d’implications : \`constructor\` l’ouvre en deux objectifs, \`p → q\` et \`q → p\`. À partir de là, chaque branche est un exercice des niveaux précédents.

**Sens direct.** Tu as \`h : ¬(p ∨ q)\`, c’est-à-dire une fonction qui mange un \`p ∨ q\` et rend \`False\`. Il faut produire \`¬p ∧ ¬q\` : donc \`constructor\`, puis dans chaque moitié, \`intro\` la preuve et nourris \`h\` avec le bon côté — \`Or.inl\` ou \`Or.inr\` construit le \`∨\` qu’il attend.

**Sens réciproque.** Tu as les deux négations séparément et un \`p ∨ q\` : casse-les, et chaque branche trouve sa contradiction.

Prends ton temps. Douze lignes, mais aucune n’est nouvelle.`,
      examples: [
        { code: 'exact h (Or.inl hp)', note: '`Or.inl hp` fabrique la preuve de `p ∨ q` que `h` attend.' },
        { code: 'constructor', note: 'Ouvre un `↔` en deux implications.' },
      ],
      hints: [
        'Commence par `constructor` : deux sens à prouver.',
        'Sens direct : `intro h`, `constructor`, puis dans chaque moitié `intro` et `exact h (Or.inl …)`.',
        'Sens réciproque : `intro h hpq`, casse les deux hypothèses, et conclus dans chaque branche.',
      ],
      sol: [
        'constructor',
        'intro h',
        'constructor',
        'intro hp',
        'exact h (Or.inl hp)',
        'intro hq',
        'exact h (Or.inr hq)',
        'intro h hpq',
        'cases h with hnp hnq',
        'cases hpq with hp hq',
        'exact hnp hp',
        'exact hnq hq',
      ],
    },
    {
      id: '6.8',
      name: 'contraposee',
      title: 'La contraposée',
      ctx: ['p q : Prop'],
      goal: '(p → q) → ¬q → ¬p',
      lemmas: ['absurd'],
      tactics: T_CONN,
      logic: true,
      xp: 35,
      brief: `« Si p implique q, alors non-q implique non-p. » Le raisonnement par contraposition, celui qu’on utilise sans le nommer dès qu’on dit « sinon on aurait… ».

Un outil nouveau pour le confort :

\`\`\`
absurd : ∀ {p q : Prop}, p → ¬p → q
\`\`\`

Donne-lui une proposition **et** sa négation, il te rend n’importe quoi. C’est la formalisation de « c’est absurde, donc tout ce que tu veux ».

Remarque, parce qu’elle prépare le niveau suivant : cette implication-ci est valable **constructivement**. Sa réciproque — de \`¬q → ¬p\` déduire \`p → q\` — ne l’est pas. Il faudra un axiome.`,
      examples: [
        { code: 'exact absurd (hpq hp) hnq', note: 'On a `q` et `¬q` : donc n’importe quoi, y compris `False`.' },
      ],
      hints: [
        'Trois hypothèses à introduire : `intro hpq hnq hp`.',
        'L’objectif devient `False`. Or `hpq hp` prouve `q`, et `hnq` le nie.',
        '`exact absurd (hpq hp) hnq`.',
      ],
      sol: ['intro hpq hnq hp', 'exact absurd (hpq hp) hnq'],
    },
    {
      id: '6.9',
      name: 'tiers_exclu',
      title: 'Le tiers exclu',
      ctx: ['p q : Prop'],
      goal: '(p → q) → ¬p ∨ q',
      lemmas: ['em', 'not_not'],
      tactics: [...T_CONN, 'rw'],
      logic: true,
      xp: 45,
      brief: `Tout ce que tu as démontré depuis le monde 5 était **constructif** : chaque preuve construit effectivement l’objet qu’elle annonce. Une preuve de \`p ∨ q\` dit *lequel* des deux.

Cet énoncé-ci ne l’est pas. Pour choisir entre \`¬p\` et \`q\`, il faudrait savoir si \`p\` est vraie — et rien ne le permet en général. Les mathématiques classiques ajoutent donc un axiome :

\`\`\`
em      : ∀ (p : Prop), p ∨ ¬p
not_not : ∀ (p : Prop), ¬¬p ↔ p
\`\`\`

Les deux sont équivalents, et tous deux **indémontrables** sans l’autre. C’est le fameux tiers exclu : ou bien \`p\`, ou bien sa négation, sans troisième possibilité.

Le geste à retenir : \`em p\` est une preuve de \`p ∨ ¬p\`, donc un objet qu’on peut décomposer. \`cases\` accepte n’importe quel terme, pas seulement une hypothèse du contexte — d’où \`cases em p with hp hnp\`, qui ouvre les deux mondes possibles.

Pour la petite histoire : Mathlib est classique, elle utilise cet axiome sans réserve. Mais Lean sait suivre à la trace les théorèmes qui en dépendent — \`#print axioms mon_theoreme\` te le dira.`,
      examples: [
        { code: 'cases em p with hp hnp', note: 'Ouvre deux objectifs : celui où `p` est vraie, celui où elle est fausse.' },
        { code: 'rw [not_not] at h', note: 'L’autre visage de l’axiome : efface une double négation.' },
      ],
      hints: [
        'Introduis l’implication, puis raisonne par cas sur `em p`.',
        'Si `p` est vraie, c’est le côté droit du ∨ qu’il faut prouver.',
        'Si `p` est fausse, tu as déjà exactement `¬p`.',
      ],
      sol: [
        'intro hpq',
        'cases em p with hp hnp',
        'right',
        'exact hpq hp',
        'left',
        'exact hnp',
      ],
    },
  ],
};

export const WORLD_QUANTIFICATEURS = {
  num: 7,
  id: 'quantificateurs',
  title: 'Les Quantificateurs',
  subtitle: 'Pour tout, il existe',
  glyph: '∀',
  intro: `\`∀\` et \`∃\` sont les deux quantificateurs, et Lean les traite de façon merveilleusement asymétrique : le premier est une fonction, le second est une paire. Tu connais déjà les deux gestes — il ne reste qu’à les nommer.`,
  levels: [
    {
      id: '7.1',
      name: 'forall_intro',
      title: 'Pour tout',
      ctx: [],
      goal: '∀ (n : ℕ), n + 0 = n',
      lemmas: ['add_zero', 'add_succ'],
      tactics: T_QUANT,
      xp: 25,
      brief: `Une preuve de \`∀ (n : ℕ), P n\` est une fonction : donne-lui un entier, elle rend une preuve de \`P\` pour cet entier.

Donc la tactique pour prouver un \`∀\` est la même que pour une implication : \`intro n\`. « Soit \`n\` un entier quelconque » — la phrase que tout cours de mathématiques commence par, c’est \`intro\`.

Et pour **utiliser** un \`∀\`, on l’applique : si \`h : ∀ (n : ℕ), P n\`, alors \`h 3\` est une preuve de \`P 3\`.`,
      examples: [
        { code: 'intro n', note: '« Soit n un entier quelconque. »' },
        { code: 'exact h 7', note: 'Spécialise un ∀ en l’appliquant.' },
      ],
      hints: ['`intro n` d’abord.', 'Puis c’est le monde 1 : `rw [add_zero]`.'],
      sol: ['intro n', 'rw [add_zero]'],
    },
    {
      id: '7.2',
      name: 'exists_intro',
      title: 'Il existe',
      ctx: [],
      goal: '∃ (n : ℕ), n + 2 = 5',
      lemmas: ['add_zero', 'add_succ'],
      tactics: T_QUANT,
      arith: true,
      xp: 25,
      brief: `Une preuve de \`∃ (n : ℕ), P n\` est une **paire** : un témoin, et la preuve que ce témoin marche. Pas de « il en existe forcément un » : il faut le montrer.

\`use 3\` fournit le témoin et remplace l’objectif par \`P 3\`. Comme dans Mathlib, \`use\` tente ensuite de finir le travail tout seul si ce qui reste est immédiat.

À partir de ce monde, le moteur s’autorise enfin à **calculer** sur les chiffres — tu as prouvé au monde 1 que c’était légitime, tu as le droit d’en profiter. La tactique \`norm_num\` fait ce genre de vérification numérique.`,
      examples: [
        { code: 'use 3', note: 'Donne le témoin d’un ∃.' },
        { code: 'norm_num', note: 'Clôt un calcul entre nombres.' },
      ],
      hints: ['Quel entier plus 2 fait 5 ?', 'use 3'],
      sol: ['use 3'],
    },
    {
      id: '7.3',
      name: 'forall_elim',
      title: 'Spécialiser',
      ctx: ['p : ℕ → Prop', 'h : ∀ (n : ℕ), p n'],
      goal: 'p 3',
      lemmas: [],
      tactics: T_QUANT,
      logic: true,
      xp: 25,
      brief: `\`p : ℕ → Prop\` est un **prédicat** : il mange un entier et rend un énoncé. \`p 3\` est donc un énoncé, et \`h : ∀ (n : ℕ), p n\` est une machine à en fabriquer les preuves.

Applique-la. C’est tout : \`h 3\`.

Cette uniformité est la grande économie de Lean. Fonction, implication, quantificateur universel : un seul mécanisme, le type \`Π\`. \`p → q\` n’est que le cas où la variable ne sert pas.`,
      examples: [{ code: 'exact h 3', note: 'Un ∀ s’élimine par application.' }],
      hints: ['`h` est une fonction : applique-la.', 'exact h 3'],
      sol: ['exact h 3'],
    },
    {
      id: '7.4',
      name: 'exists_elim',
      title: 'Ouvrir un il existe',
      ctx: ['p : ℕ → Prop', 'q : Prop', 'h : ∃ (n : ℕ), p n', 'k : ∀ (n : ℕ), p n → q'],
      goal: 'q',
      lemmas: [],
      tactics: T_QUANT,
      logic: true,
      xp: 30,
      brief: `Pour **utiliser** un \`∃\`, on l’ouvre — comme un \`∧\`, puisque c’est une paire : \`cases h with n hn\` fait apparaître le témoin \`n\` et la preuve \`hn : p n\`.

Attention à ce que tu obtiens : un entier \`n\` dont tu ne sais **rien**, sinon qu’il vérifie \`p\`. C’est exactement la prudence du mathématicien qui écrit « soit \`n\` tel que… ». Tu ne peux pas décider s’il vaut 3.`,
      examples: [{ code: 'cases h with n hn', note: 'Sort le témoin et sa propriété.' }],
      hints: ['Ouvre `h` avec `cases h with n hn`.', 'Puis applique `k` à ses deux arguments : `exact k n hn`.'],
      sol: ['cases h with n hn', 'exact k n hn'],
    },
    {
      id: '7.5',
      name: 'forall_swap',
      title: 'Échanger deux pour tout',
      ctx: ['r : ℕ → ℕ → Prop', 'h : ∀ (x y : ℕ), r x y'],
      goal: '∀ (y x : ℕ), r x y',
      lemmas: [],
      tactics: T_QUANT,
      logic: true,
      xp: 30,
      brief: `Deux \`∀\` consécutifs s’échangent sans effort : introduis dans l’ordre demandé, applique dans l’ordre disponible.

Ce qui **ne** s’échange **pas**, c’est \`∀\` et \`∃\`. « Pour tout \`x\` il existe \`y\` » n’est pas « il existe \`y\` tel que pour tout \`x\` » — dans le second, le \`y\` est le même pour tous. Toute l’analyse tient dans cette différence : c’est la distinction entre continuité et continuité uniforme.`,
      examples: [{ code: 'exact h x y', note: 'Deux arguments, dans l’ordre du ∀.' }],
      hints: ['`intro y x` — dans l’ordre de l’objectif.', 'Puis `exact h x y` — dans l’ordre de `h`.'],
      sol: ['intro y x', 'exact h x y'],
    },
    {
      id: '7.6',
      name: 'exists_and',
      title: 'Distribuer un il existe',
      boss: true,
      ctx: ['p q : ℕ → Prop', 'h : ∃ (x : ℕ), p x ∧ q x'],
      goal: '(∃ (x : ℕ), p x) ∧ (∃ (x : ℕ), q x)',
      lemmas: [],
      tactics: T_QUANT,
      logic: true,
      xp: 70,
      brief: `Boss du monde 7. Il y a un \`∃\` à ouvrir, un \`∧\` à casser, un \`∧\` à construire et deux \`∃\` à fournir : tout ce que tu sais faire, dans une seule preuve.

Le point important est le témoin. Tu extrais **un** \`x\` de l’hypothèse, et c’est le même que tu donnes aux deux \`∃\` de la conclusion. Tu ne pourrais pas faire l’inverse : de \`(∃ x, p x) ∧ (∃ x, q x)\`, on ne peut **pas** déduire \`∃ x, p x ∧ q x\`, parce que les deux témoins n’ont aucune raison d’être le même. Une implication vraie, sa réciproque fausse, et toute la différence tient dans l’ordre des quantificateurs.`,
      examples: [{ code: 'use x', note: 'Le témoin extrait sert pour les deux ∃.' }],
      hints: [
        'Ouvre `h` : `cases h with x hx`.',
        'Casse le `∧` obtenu : `cases hx with hp hq`.',
        '`constructor`, puis `use x` dans chacune des deux moitiés.',
      ],
      sol: ['cases h with x hx', 'cases hx with hp hq', 'constructor', 'use x', 'use x'],
    },
    {
      id: '7.7',
      name: 'obtenir',
      title: 'La façon moderne',
      ctx: ['p q : ℕ → Prop', 'h : ∃ (x : ℕ), p x ∧ q x'],
      goal: '∃ (x : ℕ), q x ∧ p x',
      lemmas: [],
      tactics: [...T_QUANT, 'obtain'],
      xp: 40,
      brief: `Au boss précédent, il t’a fallu **deux** \`cases\` : un pour ouvrir le \`∃\`, un autre pour casser le \`∧\` qu’il contenait. C’est la syntaxe des débuts de Lean 4, et personne ne l’écrit plus.

L’idiome de Mathlib aujourd’hui :

\`\`\`
obtain ⟨x, hp, hq⟩ := h
\`\`\`

Une seule ligne, et le motif **décrit la forme** de ce qu’on décompose. Les chevrons se replient à droite : \`⟨x, hp, hq⟩\` veut dire \`⟨x, ⟨hp, hq⟩⟩\`, donc « un témoin, puis une paire ». Peu importe la profondeur, tu écris la forme et Lean suit.

Pour une disjonction, le motif change de forme lui aussi :

\`\`\`
obtain hp | hnp := em p
\`\`\`

La barre \`|\` ouvre **deux objectifs**, un par branche — c’est le \`cases\` d’un \`∨\`, en plus lisible, parce qu’on voit tout de suite qu’il y a deux cas et comment ils s’appellent.

Deux cousines à connaître, que ce moteur n’a pas : \`rcases\` fait la même chose avec une syntaxe de motifs encore plus riche, et \`rintro\` combine \`intro\` et la décomposition en un seul geste. Dans Mathlib, tu verras surtout \`obtain\` et \`rintro\`.`,
      examples: [
        { code: 'obtain ⟨x, hp, hq⟩ := h', note: 'Ouvre un ∃ contenant un ∧, en une ligne.' },
        { code: 'obtain hp | hq := h', note: 'Une disjonction : deux objectifs, deux noms.' },
      ],
      hints: [
        'Une seule ligne suffit pour tout ouvrir : `obtain ⟨x, hp, hq⟩ := h`.',
        'Puis fournis le témoin avec `use x`.',
        'Il reste une paire à construire, dans l’autre ordre : `exact ⟨hq, hp⟩`.',
      ],
      sol: ['obtain ⟨x, hp, hq⟩ := h', 'use x', 'exact ⟨hq, hp⟩'],
      lean: `-- Dans le vrai Lean, on écrirait plutôt :\nexample (p q : ℕ → Prop) (h : ∃ x, p x ∧ q x) : ∃ x, q x ∧ p x := by\n  obtain ⟨x, hp, hq⟩ := h\n  exact ⟨x, hq, hp⟩`,
    },
  ],
};

export const LOGIC_WORLDS = [WORLD_IMPLICATION, WORLD_CONNECTEURS, WORLD_QUANTIFICATEURS];
