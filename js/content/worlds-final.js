// Mondes 8 et 9 : l'ordre, puis le passage au vrai Lean.

const T_ORDER = ['rfl', 'exact', 'apply', 'intro', 'intros', 'cases', 'constructor',
  'use', 'rw', 'norm_num', 'left', 'right'];
// Le dernier monde n'a plus de verrou : ce sont littéralement toutes les
// tactiques du moteur, pour que le Grimoire dise vrai.
const T_ALL = [...T_ORDER, 'induction', 'simp', 'have', 'ring', 'revert', 'unfold',
  'exfalso', 'contradiction', 'trivial', 'repeat', 'sorry', 'decide', 'assumption',
  'all_goals', 'intros'];

const ADD_ALL = ['add_zero', 'add_succ', 'zero_add', 'succ_add', 'add_assoc',
  'add_comm', 'add_right_comm'];
const MUL_ALL = ['mul_zero', 'mul_succ', 'zero_mul', 'succ_mul', 'mul_one', 'one_mul',
  'mul_add', 'add_mul', 'mul_comm', 'mul_assoc', 'two_mul'];
const NUMS = ['one_eq_succ_zero', 'two_eq_succ_one', 'three_eq_succ_two',
  'four_eq_succ_three', 'five_eq_succ_four', 'six_eq_succ_five'];

export const WORLD_ORDRE = {
  num: 8,
  id: 'ordre',
  title: 'L’Ordre',
  subtitle: 'Ce que veut dire « plus petit »',
  glyph: '≤',
  intro: `\`a ≤ b\` n’est pas un symbole primitif : sur ℕ, c’est une **définition**. « \`a\` est plus petit que \`b\` » veut dire « il reste quelque chose à ajouter à \`a\` pour atteindre \`b\` ». Une inégalité est donc un \`∃\` déguisé — et tu sais déjà manipuler les \`∃\`.`,
  levels: [
    {
      id: '8.1',
      name: 'le_refl',
      title: 'Déplier une inégalité',
      ctx: ['a : ℕ'],
      goal: 'a ≤ a',
      lemmas: ['le_iff_exists_add', ...ADD_ALL],
      tactics: T_ORDER,
      arith: true,
      xp: 30,
      brief: `La définition, sous forme d’équivalence :

\`\`\`
le_iff_exists_add : ∀ (a b : ℕ), a ≤ b ↔ ∃ c, b = a + c
\`\`\`

Comme c’est un \`↔\`, on peut la **réécrire** : \`rw [le_iff_exists_add]\` remplace l’inégalité de l’objectif par sa définition. C’est un point qui mérite d’être souligné — dans Lean, on réécrit avec les équivalences exactement comme avec les égalités, parce que deux énoncés équivalents sont interchangeables.

Ensuite, plus d’inégalité : juste un \`∃\` à remplir.`,
      examples: [{ code: 'rw [le_iff_exists_add]', note: 'Remplace `a ≤ b` par sa définition.' }],
      hints: ['Déplie la définition avec `rw [le_iff_exists_add]`.', 'Quel `c` faut-il ajouter à `a` pour obtenir `a` ? `use 0`.', 'Puis `rw [add_zero]`.'],
      sol: ['rw [le_iff_exists_add]', 'use 0', 'rw [add_zero]'],
    },
    {
      id: '8.2',
      name: 'zero_le',
      title: 'Zéro est le plus petit',
      ctx: ['a : ℕ'],
      goal: '0 ≤ a',
      lemmas: ['le_iff_exists_add', ...ADD_ALL],
      tactics: T_ORDER,
      arith: true,
      xp: 30,
      brief: `Tout entier naturel est positif ou nul. Ce n’est pas un axiome : ça se démontre, et la preuve tient en trois lignes parce que le témoin saute aux yeux.

C’est aussi une propriété qui **échoue** sur ℤ, et le jeu ne pourrait pas la prouver là-bas. La définition de \`≤\` par « il reste quelque chose à ajouter » ne marche que parce que dans ℕ, ce quelque chose est toujours positif. Change de structure, change de définition.`,
      examples: [{ code: 'use a', note: 'Le témoin peut être une variable, pas seulement un chiffre.' }],
      hints: ['Déplie la définition.', 'Il faut ajouter `a` à zéro : `use a`.', 'Puis `rw [zero_add]`.'],
      sol: ['rw [le_iff_exists_add]', 'use a', 'rw [zero_add]'],
    },
    {
      id: '8.3',
      name: 'le_succ_self',
      title: 'Un pas en avant',
      ctx: ['a : ℕ'],
      goal: 'a ≤ succ a',
      lemmas: ['le_iff_exists_add', ...ADD_ALL, ...NUMS],
      tactics: T_ORDER,
      arith: true,
      xp: 35,
      brief: `Le successeur est plus grand. Le témoin est \`1\`, et il faut ensuite montrer \`succ a = a + 1\` — c’est-à-dire retourner au monde 1, avec les mêmes outils qu’au premier jour.

C’est un bon moment pour mesurer le chemin : cette égalité te demandait trois réécritures au niveau 1.4, et elle n’est plus qu’un détail technique au milieu d’une preuve sur l’ordre.`,
      examples: [{ code: 'use 1', note: 'Puis il reste `succ a = a + 1` à établir.' }],
      hints: ['Déplie, puis `use 1`.', 'Il reste `succ a = a + 1` : déplie `1`, puis `add_succ`, puis `add_zero`.'],
      sol: ['rw [le_iff_exists_add]', 'use 1', 'rw [one_eq_succ_zero]', 'rw [add_succ]', 'rw [add_zero]'],
    },
    {
      id: '8.4',
      name: 'le_trans',
      title: 'Transitivité',
      boss: true,
      ctx: ['a b c : ℕ', 'hab : a ≤ b', 'hbc : b ≤ c'],
      goal: 'a ≤ c',
      lemmas: ['le_iff_exists_add', ...ADD_ALL],
      tactics: T_ORDER,
      arith: true,
      xp: 80,
      brief: `Boss du monde 8. Si \`a ≤ b\` et \`b ≤ c\`, alors \`a ≤ c\`. La propriété la plus utilisée de toutes les mathématiques, et sa preuve est un bel exercice de plomberie.

Nouveauté : \`rw [...] at h\` réécrit **dans une hypothèse** au lieu de l’objectif. Tu vas t’en servir pour déplier les deux inégalités que tu possèdes, avant de les ouvrir avec \`cases\`.

Le plan complet :

1. déplier \`hab\` et \`hbc\` en \`∃\` (avec \`at\`) ;
2. les ouvrir : tu obtiens deux témoins, disons \`x\` et \`y\`, avec \`b = a + x\` et \`c = b + y\` ;
3. déplier l’objectif, et fournir le témoin qui convient — devine lequel ;
4. il reste une égalité pure : substitue, puis range avec \`add_assoc\`.

C’est la première preuve du jeu où tu construis un objet (le témoin \`x + y\`) à partir de deux hypothèses. Tu ne vérifies plus un calcul : tu fabriques.`,
      examples: [
        { code: 'rw [le_iff_exists_add] at hab', note: 'Réécrit dans l’hypothèse `hab`.' },
        { code: 'use x + y', note: 'Le témoin peut être une expression.' },
      ],
      hints: [
        'Déplie les deux hypothèses : `rw [le_iff_exists_add] at hab` puis idem pour `hbc`.',
        '`cases hab with x hx` et `cases hbc with y hy`.',
        'Déplie l’objectif, puis `use x + y`.',
        'Réécris avec `hy`, puis `hx`, et finis par `add_assoc`.',
      ],
      sol: [
        'rw [le_iff_exists_add] at hab',
        'rw [le_iff_exists_add] at hbc',
        'cases hab with x hx',
        'cases hbc with y hy',
        'rw [le_iff_exists_add]',
        'use x + y',
        'rw [hy]',
        'rw [hx]',
        'rw [add_assoc]',
      ],
    },
    {
      id: '8.5',
      name: 'le_succ_of_le',
      title: 'Enchaîner',
      ctx: ['a b : ℕ', 'hab : a ≤ b'],
      goal: 'a ≤ succ b',
      lemmas: ['le_iff_exists_add', 'le_refl', 'le_trans', 'le_succ_self', 'zero_le', ...ADD_ALL],
      tactics: T_ORDER,
      arith: true,
      xp: 40,
      brief: `Épilogue du monde : maintenant que \`le_trans\` et \`le_succ_self\` sont démontrés, plus besoin de redescendre à la définition. On chaîne les théorèmes.

Un détail sur \`apply\` : \`le_trans\` a trois variables et deux hypothèses. Si tu écris juste \`apply le_trans\`, le moteur ne peut pas devenir le maillon du milieu — rien dans l’objectif ne le mentionne. Donne-le : \`apply le_trans a b (succ b)\`.

Ce n’est pas une limitation de ce jeu, c’est un vrai réflexe de Lean. Quand une application laisse des trous indevinables, on les remplit à la main.`,
      examples: [{ code: 'apply le_trans a b (succ b)', note: 'Deux nouveaux objectifs : `a ≤ b` et `b ≤ succ b`.' }],
      hints: ['`apply le_trans a b (succ b)`.', 'Premier objectif : tu l’as en hypothèse.', 'Second : `exact le_succ_self b`.'],
      sol: ['apply le_trans a b (succ b)', 'exact hab', 'exact le_succ_self b'],
    },
  ],
};

export const WORLD_VRAI_LEAN = {
  num: 9,
  id: 'vrai-lean',
  title: 'Le Vrai Lean',
  subtitle: 'Sortir du jeu',
  glyph: '∎',
  intro: `Dernier monde. Tu vas rencontrer les tactiques d’automatisation, apprendre à installer Lean pour de vrai, et affronter un boss final qu’aucune machine ne fera à ta place. Puis tu le refais en une ligne, pour comprendre pourquoi Mathlib existe.`,
  levels: [
    {
      id: '9.1',
      name: 'simp_exemple',
      title: 'simp, le balai',
      ctx: ['a b : ℕ'],
      goal: 'a + 0 + (0 + b) = a + b',
      lemmas: ['add_zero', 'add_succ', 'zero_add', 'add_assoc'],
      tactics: T_ALL,
      xp: 30,
      brief: `\`simp\` applique en boucle toutes les règles marquées \`@[simp]\` jusqu’à ce que plus rien ne bouge. C’est la tactique la plus utilisée de Mathlib, et la plus mal utilisée : elle ne remplace pas une idée, elle ne fait que nettoyer.

La discipline habituelle :

- \`simp\` pour éliminer le bruit administratif (neutres, doubles négations, projections) ;
- \`simp [mon_lemme]\` pour ajouter une règle à la volée ;
- \`simp only [a, b]\` quand tu veux **exactement** ces règles et rien d’autre — c’est la version qui ne casse pas quand la bibliothèque change ;
- et \`simp at h\` pour nettoyer une hypothèse.

Ce niveau se ferait à la main en trois réécritures. Essaie les deux, et regarde laquelle tu préfères relire dans six mois.`,
      examples: [
        { code: 'simp', note: 'Toutes les règles `@[simp]` disponibles, en boucle.' },
        { code: 'simp only [add_zero]', note: 'Une seule règle, de façon reproductible.' },
      ],
      hints: ['Une seule tactique suffit.', 'simp'],
      sol: ['simp'],
    },
    {
      id: '9.2',
      name: 'norm_num_exemple',
      title: 'Le calcul, enfin',
      ctx: [],
      goal: '2 + 3 * 4 = 14',
      lemmas: [...ADD_ALL, ...MUL_ALL, ...NUMS],
      tactics: T_ALL,
      arith: true,
      xp: 25,
      brief: `Souviens-toi du monde 1 : \`2 + 2 = 4\` t’avait coûté quatre lignes. Multiplie ça par la taille de \`2 + 3 * 4\` et tu comprends pourquoi personne ne fait ça à la main.

\`norm_num\` calcule. C’est une procédure de décision pour l’arithmétique concrète : elle évalue, compare, et clôt l’objectif — ou échoue en disant que c’est faux.

Le mot important est **procédure de décision**. Une tactique de réécriture t’obéit ; une procédure de décision décide à ta place, et il n’y a rien à comprendre dans son fonctionnement pour lui faire confiance : dans le vrai Lean, elle produit un terme de preuve que le noyau revérifie. C’est ce qui distingue un assistant de preuve d’un logiciel de calcul symbolique.

Pendant que tu y es, essaie de le prouver **sans** \`norm_num\`, avec les axiomes de Peano. C’est faisable. C’est long.`,
      examples: [
        { code: 'norm_num', note: 'Évalue et conclut.' },
        { code: 'decide', note: 'Même esprit : décide un énoncé décidable.' },
      ],
      hints: ['Le calcul est autorisé dans ce monde.', 'norm_num'],
      sol: ['norm_num'],
    },
    {
      id: '9.3',
      name: 'have_exemple',
      title: 'Nommer une étape',
      ctx: ['p q r : Prop', 'hpq : p → q', 'hqr : q → r', 'hp : p'],
      goal: 'r',
      lemmas: [],
      tactics: T_ALL,
      logic: true,
      xp: 30,
      brief: `Une preuve qui n’est qu’une pile de \`apply\` devient illisible. \`have\` permet d’avancer **en avant**, en nommant les résultats intermédiaires :

\`\`\`
have hq : q := hpq hp
\`\`\`

« J’ai établi \`q\`, je l’appelle \`hq\`, et voici sa preuve. » L’hypothèse rejoint le contexte et sert ensuite comme n’importe quelle autre.

C’est le geste qui rapproche le plus une preuve Lean d’une preuve écrite en français, et c’est celui qu’on regrette de ne pas avoir utilisé quand on relit son code. Les grands fichiers de Mathlib en sont pleins.

Sa variante \`suffices\` fait l’inverse : elle réduit l’objectif à un énoncé plus simple, en promettant de justifier la réduction.`,
      examples: [
        { code: 'have hq : q := hpq hp', note: 'Ajoute une hypothèse démontrée au contexte.' },
        { code: 'exact hqr hq', note: 'Et on s’en sert comme des autres.' },
      ],
      hints: ['Établis `q` avant de viser `r`.', '`have hq : q := hpq hp`, puis `exact hqr hq`.'],
      sol: ['have hq : q := hpq hp', 'exact hqr hq'],
    },
    {
      id: '9.4',
      name: 'installer_lean',
      title: 'Installer le vrai Lean',
      ctx: [],
      goal: '∀ (n : ℕ), n * 1 = n',
      lemmas: [...ADD_ALL, ...MUL_ALL, ...NUMS],
      tactics: T_ALL,
      xp: 30,
      brief: `Ce jeu s’arrête bientôt. Voilà comment continuer pour de vrai.

**Sans rien installer.** [live.lean-lang.org](https://live.lean-lang.org) est le Lean 4 officiel compilé pour le navigateur, Mathlib incluse. Le bouton « Ouvrir dans le vrai Lean » en bas de cet écran y envoie ta preuve.

**Sur ta machine.** Un seul outil à connaître : \`elan\`, le gestionnaire de versions de Lean. Ensuite \`lake\` gère les projets et les dépendances. Pour démarrer un projet avec Mathlib :

\`\`\`
lake +leanprover-community/mathlib4:lean-toolchain new mon_projet math
cd mon_projet
lake exe cache get      -- télécharge Mathlib précompilée, sinon comptez des heures
\`\`\`

L’éditeur, c’est VS Code avec l’extension officielle **lean4**. La fenêtre d’objectif que tu utilises depuis le début du jeu est une imitation de la sienne, l’*Infoview*.

**Les commandes de survie**, à taper dans un fichier :

\`\`\`
#check add_comm      -- affiche le type d’un terme
#eval 2 + 2          -- exécute, parce que Lean est aussi un langage
#print axioms foo    -- de quels axiomes dépend mon théorème ?
example : 2 + 2 = 4 := by norm_num
exact?                -- cherche dans Mathlib un lemme qui clôt l’objectif
\`\`\`

\`exact?\` est celle qui change la vie. Mathlib contient plus de 200 000 théorèmes ; l’essentiel du travail consiste à trouver celui qui existe déjà.

**Ce que ce jeu n’est pas.** Le moteur derrière cet écran est ma réimplémentation, écrite pour tenir dans un navigateur sans serveur : réécriture, unification du premier ordre, quelques procédures de décision. Il n’y a **pas de noyau** — je ne construis pas de terme de preuve, et personne ne revérifie mon travail. Le vrai Lean, lui, réduit toute la confiance à un noyau de quelques milliers de lignes qui revérifie chaque preuve, tactiques comprises. C’est toute la différence entre un jeu qui t’apprend les gestes et un système sur lequel on peut fonder des mathématiques.

Allez, un dernier exercice facile avant le boss final.`,
      examples: [{ code: '#check mul_one', note: 'À taper dans le vrai Lean.' }],
      hints: ['`intro n`, puis un lemme du monde 3.', 'rw [mul_one]'],
      sol: ['intro n', 'rw [mul_one]'],
      lean: `-- Dans le vrai Lean 4 avec Mathlib :\nexample : ∀ (n : ℕ), n * 1 = n := by\n  intro n\n  rw [mul_one]`,
    },
    {
      id: '9.5',
      name: 'identite_remarquable',
      title: 'Le carré de la somme',
      boss: true,
      ctx: ['a b : ℕ'],
      goal: '(a + b) * (a + b) = a * a + 2 * (a * b) + b * b',
      lemmas: [...ADD_ALL, ...MUL_ALL],
      tactics: ['rfl', 'rw', 'exact', 'intro', 'have', 'induction'],
      xp: 120,
      brief: `**Boss final.** \`(a+b)² = a² + 2ab + b²\`, à la main, avec les théorèmes que tu as démontrés toi-même. Pas de \`ring\` : la tactique est désactivée pour ce niveau.

Tu as tout ce qu’il faut, et rien de plus :

- \`add_mul\` et \`mul_add\` pour développer ;
- \`two_mul\` pour casser le \`2 *\` ;
- \`mul_comm\` — avec ses arguments, pour viser juste ;
- \`add_assoc\`, dans un sens ou dans l’autre, pour ranger.

La méthode est celle de tout calcul algébrique : **développer d’abord**, ranger ensuite. Développe entièrement le membre gauche, casse le \`2 *\` à droite, mets les produits dans le même ordre, et fais tomber les parenthèses des deux côtés jusqu’à ce que les deux sommes soient écrites identiquement.

Sept lignes. Prends le temps de lire la fenêtre après chacune — c’est là que tout se joue.`,
      examples: [
        { code: 'rw [add_mul]', note: '`(a + b) * c` ⟶ `a * c + b * c`' },
        { code: 'rw [mul_comm b a]', note: 'Vise `b * a` précisément, et l’écrit `a * b`.' },
        { code: 'rw [← add_assoc]', note: 'Re-parenthèse vers la gauche : `x + (y + z)` ⟶ `x + y + z`' },
      ],
      hints: [
        'Développe le membre gauche : `add_mul`, puis `mul_add` deux fois.',
        'Casse le `2 *` du membre droit avec `two_mul`.',
        'Les deux côtés ont les mêmes termes, mais `b * a` doit devenir `a * b` : `rw [mul_comm b a]`.',
        'Il ne reste qu’à aplatir les parenthèses : `rw [← add_assoc]`, deux fois.',
      ],
      sol: [
        'rw [add_mul]',
        'rw [mul_add]',
        'rw [mul_add]',
        'rw [two_mul]',
        'rw [mul_comm b a]',
        'rw [← add_assoc]',
        'rw [← add_assoc]',
      ],
      lean: `-- Dans le vrai Lean 4 avec Mathlib, à la main :\nexample (a b : ℕ) : (a + b) * (a + b) = a * a + 2 * (a * b) + b * b := by\n  rw [add_mul, mul_add, mul_add, two_mul, mul_comm b a, ← add_assoc, ← add_assoc]\n\n-- ou, comme tout le monde le ferait :\nexample (a b : ℕ) : (a + b) * (a + b) = a * a + 2 * (a * b) + b * b := by\n  ring`,
    },
    {
      id: '9.6',
      name: 'une_ligne',
      title: 'Une ligne',
      ctx: ['a b : ℕ'],
      goal: '(a + b) * (a + b) = a * a + 2 * (a * b) + b * b',
      lemmas: [...ADD_ALL, ...MUL_ALL],
      tactics: T_ALL,
      arith: true,
      xp: 50,
      brief: `Le même énoncé. \`ring\` est rallumée.

\`\`\`
ring
\`\`\`

Voilà. Sept lignes gagnées — et il ne faut pas se tromper sur ce que ça veut dire.

Tu n’as pas perdu ton temps au niveau précédent : c’est parce que quelqu’un a fait ce travail, une fois, proprement, que la tactique existe. \`ring\` ne connaît pas les nombres ; elle connaît les axiomes de semi-anneau commutatif — ceux que tu as démontrés un par un depuis le monde 1 — et elle les applique mécaniquement. Chaque automatisation de Mathlib est un raisonnement humain qu’on a fini de comprendre et qu’on a rangé.

C’est le mouvement de fond des mathématiques formalisées : on descend une fois jusqu’aux fondations, on remonte en construisant des outils, et on passe le reste de sa vie à l’étage du dessus. Tu viens de faire l’aller-retour complet.

**Il reste tout à faire.** ℤ, les rationnels, les réels, la topologie, la théorie des groupes, l’analyse — Mathlib les a déjà, et attend qu’on aille plus loin. Le Bac à sable de ce site te laisse écrire tes propres énoncés ; le vrai Lean t’attend derrière le bouton du bas.

Merci d’avoir joué. ∎`,
      examples: [{ code: 'ring', note: 'Et c’est tout.' }],
      hints: ['Une tactique. Quatre lettres.', 'ring'],
      sol: ['ring'],
      lean: `example (a b : ℕ) : (a + b) * (a + b) = a * a + 2 * (a * b) + b * b := by\n  ring`,
    },
  ],
};

export const FINAL_WORLDS = [WORLD_ORDRE, WORLD_VRAI_LEAN];
