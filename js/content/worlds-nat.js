// Mondes 0 à 4 : le tableau, Peano, la récurrence, le produit, les puissances.
// `sol` est la solution de référence — la suite de tests la rejoue dans le
// moteur, donc aucun niveau ne peut devenir infaisable sans que ça casse.

const T_BASE = ['rfl', 'exact', 'rw'];
const T_REC = ['rfl', 'exact', 'rw', 'induction'];
const T_REC_RING = [...T_REC, 'ring', 'norm_num'];

const NUMS = ['one_eq_succ_zero', 'two_eq_succ_one', 'three_eq_succ_two',
  'four_eq_succ_three', 'five_eq_succ_four', 'six_eq_succ_five'];
const ADD = ['add_zero', 'add_succ'];
const ADD_ALL = [...ADD, 'zero_add', 'succ_add', 'add_assoc', 'add_comm', 'add_right_comm'];
const MUL = ['mul_zero', 'mul_succ'];
const MUL_ALL = [...MUL, 'zero_mul', 'succ_mul', 'mul_one', 'one_mul', 'mul_add',
  'add_mul', 'mul_comm', 'mul_assoc', 'two_mul'];

export const WORLD_TABLEAU = {
  num: 0,
  id: 'tableau',
  title: 'Le Tableau',
  subtitle: 'Ce que veut dire « prouver »',
  glyph: '⊢',
  intro: `Un assistant de preuve ne devine rien. Il tient un tableau : au-dessus du trait, ce que tu **sais** ; en dessous, ce qu'il **reste à montrer**. Tu ne parles pas de mathématiques à Lean en français, tu lui donnes des ordres — des *tactiques* — et il redessine le tableau après chacun.`,
  levels: [
    {
      id: '0.1',
      name: 'ma_premiere_preuve',
      title: 'La fenêtre d’objectif',
      ctx: ['a : ℕ'],
      goal: 'a = a',
      lemmas: [],
      tactics: T_BASE,
      xp: 10,
      brief: `À droite, la **fenêtre d’objectif**. Elle se lit comme un tableau noir :

- \`a : ℕ\` — une hypothèse. Ici : « \`a\` est un entier naturel ».
- \`⊢ a = a\` — le tourniquet \`⊢\` sépare ce qu’on a de ce qu’on doit prouver.

Ton travail : vider la partie sous le tourniquet. Une preuve est terminée quand il ne reste plus **aucun** objectif.

La tactique \`rfl\` (de *reflexivity*) clôt un objectif de la forme \`a = a\` : les deux côtés sont littéralement le même terme, il n’y a rien à démontrer.`,
      examples: [{ code: 'rfl', note: 'Clôt `x = x`, `2 = 2`, `a + b = a + b`.' }],
      hints: ['Les deux côtés du `=` sont déjà identiques.', 'Écris `rfl` et rien d’autre.'],
      sol: ['rfl'],
    },
    {
      id: '0.2',
      name: 'utiliser_une_hypothese',
      title: 'Ce qu’on a déjà',
      ctx: ['p : Prop', 'hp : p'],
      goal: 'p',
      lemmas: [],
      tactics: T_BASE,
      xp: 10,
      brief: `\`p : Prop\` veut dire « \`p\` est un énoncé ». Et \`hp : p\` veut dire « \`hp\` est une **preuve** de \`p\` ».

C’est l’idée centrale de Lean, et elle surprend toujours au début : une preuve est un objet, comme un entier. Elle a un nom, un type, on peut la passer en argument. Le type d’une preuve, c’est l’énoncé qu’elle démontre.

Donc pour prouver \`p\` quand on a déjà \`hp : p\` sous la main : \`exact hp\`.`,
      examples: [{ code: 'exact hp', note: '« l’objectif est exactement ceci ».' }],
      hints: ['Regarde le contexte : une preuve de `p` s’y trouve déjà.', '`exact hp`'],
      sol: ['exact hp'],
    },
    {
      id: '0.3',
      name: 'reecrire_avec_une_hypothese',
      title: 'Réécrire',
      ctx: ['a b : ℕ', 'h : a = b'],
      goal: 'a + a = b + b',
      lemmas: [],
      tactics: T_BASE,
      xp: 15,
      brief: `Voici la tactique que tu utiliseras le plus dans ce jeu : \`rw\`, pour *rewrite*.

\`rw [h]\` cherche le membre **gauche** de l’égalité \`h\` dans l’objectif et le remplace partout par le membre droit. Avec \`h : a = b\`, chaque \`a\` devient un \`b\`.

Petit bonus, qui vient de Lean lui-même : après chaque réécriture, \`rw\` tente \`rfl\` tout seul. Si la réécriture suffit à rendre les deux côtés identiques, l’objectif se ferme sans que tu aies à l’écrire.`,
      examples: [
        { code: 'rw [h]', note: 'Remplace le membre gauche de `h` par son membre droit.' },
        { code: 'rw [← h]', note: 'Dans l’autre sens : remplace le membre droit par le gauche.' },
      ],
      hints: ['Une seule réécriture suffit, et `rw` finira le travail seul.', 'rw [h]'],
      sol: ['rw [h]'],
    },
  ],
};

export const WORLD_PEANO = {
  num: 1,
  id: 'peano',
  title: 'Peano',
  subtitle: 'Fabriquer les entiers',
  glyph: 'ℕ',
  intro: `Oublie ce que tu sais des nombres. Dans ce monde, ℕ ne contient au départ que deux choses : \`0\`, et une machine \`succ\` qui fabrique le nombre suivant. \`1\` n’est qu’un surnom pour \`succ 0\`. L’addition n’est pas donnée : elle est **définie** par deux équations, et tout le reste — y compris que 2 + 2 fait 4 — devra être démontré.`,
  levels: [
    {
      id: '1.1',
      name: 'add_zero_exemple',
      title: 'Le premier axiome',
      ctx: ['a : ℕ'],
      goal: 'a + 0 = a',
      lemmas: [...ADD],
      tactics: ['rfl', 'rw'],
      xp: 15,
      brief: `L’addition sur ℕ est définie par récursion sur son **deuxième** argument. Deux équations, pas une de plus :

\`\`\`
add_zero : ∀ (a : ℕ), a + 0 = a
add_succ : ∀ (a b : ℕ), a + succ b = succ (a + b)
\`\`\`

La première dit qu’ajouter zéro ne fait rien. La seconde fait descendre le deuxième argument d’un cran vers zéro, en sortant un \`succ\` au passage. Tout calcul d’addition, c’est l’application répétée de ces deux règles jusqu’à tomber sur \`0\`.

\`add_zero\` commence par un \`∀\`, donc \`rw [add_zero]\` choisit lui-même le \`a\` qui va bien.`,
      examples: [{ code: 'rw [add_zero]', note: 'Transforme n’importe quel `x + 0` en `x`.' }],
      hints: ['`rw [add_zero]` transforme `a + 0` en `a`.', 'Et `rw` conclut par `rfl` tout seul.'],
      sol: ['rw [add_zero]'],
    },
    {
      id: '1.2',
      name: 'add_zero_deux_fois',
      title: 'Deux fois rien',
      ctx: ['a : ℕ'],
      goal: 'a + 0 + 0 = a',
      lemmas: [...ADD],
      tactics: ['rfl', 'rw'],
      xp: 15,
      brief: `\`a + 0 + 0\` se lit \`(a + 0) + 0\` : le \`+\` est associatif **à gauche** en Lean, comme en mathématiques courantes.

Une réécriture ne s’applique qu’une fois par appel. Deux \`+ 0\` à effacer, donc deux réécritures — et tu peux les enchaîner dans un seul \`rw\` en les séparant par une virgule.`,
      examples: [{ code: 'rw [add_zero, add_zero]', note: 'Équivaut à deux lignes `rw [add_zero]`.' }],
      hints: ['Applique `add_zero` deux fois.', 'rw [add_zero, add_zero]'],
      sol: ['rw [add_zero, add_zero]'],
    },
    {
      id: '1.3',
      name: 'add_succ_exemple',
      title: 'Le successeur sort',
      ctx: ['a : ℕ'],
      goal: 'a + succ 0 = succ a',
      lemmas: [...ADD],
      tactics: ['rfl', 'rw'],
      xp: 20,
      brief: `Au tour de la deuxième équation :

\`\`\`
add_succ : ∀ (a b : ℕ), a + succ b = succ (a + b)
\`\`\`

Elle fait **sortir** le \`succ\` de l’addition. Après l’avoir appliquée, l’addition qui reste est plus petite : c’est ce qui garantit que le calcul termine.

Stratégie générale, valable pour tout ce monde : sors tous les \`succ\`, puis nettoie les \`+ 0\` avec \`add_zero\`.`,
      examples: [{ code: 'rw [add_succ]', note: '`x + succ y` devient `succ (x + y)`.' }],
      hints: ['D’abord `add_succ` pour sortir le successeur.', 'Il reste un `+ 0` : `add_zero`.'],
      sol: ['rw [add_succ]', 'rw [add_zero]'],
    },
    {
      id: '1.4',
      name: 'un_est_succ_zero',
      title: 'Les chiffres sont des surnoms',
      ctx: ['a : ℕ'],
      goal: 'a + 1 = succ a',
      lemmas: [...ADD, ...NUMS],
      tactics: ['rfl', 'rw'],
      xp: 20,
      brief: `Où sont les chiffres dans tout ça ? Nulle part : ce sont des abréviations, et chacune a son petit axiome.

\`\`\`
one_eq_succ_zero : 1 = succ 0
two_eq_succ_one  : 2 = succ 1
\`\`\`

Le moteur ne fait **aucun** calcul dans ce monde : pour lui \`1\` et \`succ 0\` sont deux termes différents tant que tu n’as pas réécrit l’un en l’autre. C’est exactement ce qui rend le boss de ce monde intéressant — et c’est aussi la vérité sur ce que fait un noyau de preuve quand personne ne l’aide.`,
      examples: [{ code: 'rw [one_eq_succ_zero]', note: 'Remplace tous les `1` par `succ 0`.' }],
      hints: ['Commence par remplacer `1` par `succ 0`.', 'Puis `add_succ`, puis `add_zero`.'],
      sol: ['rw [one_eq_succ_zero]', 'rw [add_succ]', 'rw [add_zero]'],
    },
    {
      id: '1.5',
      name: 'reecrire_a_reculons',
      title: 'À reculons',
      ctx: [],
      goal: 'succ 1 = 2',
      lemmas: [...ADD, ...NUMS],
      tactics: ['rfl', 'rw'],
      xp: 20,
      brief: `\`rw [two_eq_succ_one]\` remplace \`2\` par \`succ 1\`. Mais parfois c’est l’inverse qu’on veut : recoller \`succ 1\` en \`2\`.

La flèche \`←\` retourne la règle. \`rw [← two_eq_succ_one]\` cherche \`succ 1\` et écrit \`2\`.

Tape-la avec \`\\l\` puis un espace (l’éditeur convertit les abréviations de Lean : \`\\to\` donne \`→\`, \`\\forall\` donne \`∀\`, \`\\and\` donne \`∧\`). \`<-\` fonctionne aussi.`,
      examples: [
        { code: 'rw [two_eq_succ_one]', note: '`2` ⟶ `succ 1`' },
        { code: 'rw [← two_eq_succ_one]', note: '`succ 1` ⟶ `2`' },
      ],
      hints: ['Tu peux réécrire dans les deux sens.', 'rw [← two_eq_succ_one]'],
      sol: ['rw [← two_eq_succ_one]'],
    },
    {
      id: '1.6',
      name: 'ajouter_deux',
      title: 'Ajouter deux',
      ctx: ['a : ℕ'],
      goal: 'a + 2 = succ (succ a)',
      lemmas: [...ADD, ...NUMS],
      tactics: ['rfl', 'rw'],
      xp: 25,
      brief: `Répétition générale avant le boss. Le plan ne change pas :

1. Déplier les chiffres en tours de \`succ\`.
2. Sortir les \`succ\` de l’addition avec \`add_succ\`.
3. Effacer le \`+ 0\` final avec \`add_zero\`.

Tu peux tout mettre dans un seul \`rw [...]\`. Les règles s’appliquent de gauche à droite, dans l’ordre où tu les listes.`,
      examples: [{ code: 'rw [two_eq_succ_one, one_eq_succ_zero]', note: 'Déplie `2` en `succ (succ 0)`.' }],
      hints: ['Déplie d’abord `2`, puis `1`.', 'Ensuite deux `add_succ`, et un `add_zero`.'],
      sol: ['rw [two_eq_succ_one, one_eq_succ_zero]', 'rw [add_succ, add_succ]', 'rw [add_zero]'],
    },
    {
      id: '1.7',
      name: 'deux_plus_deux',
      title: 'Pourquoi 2 + 2 = 4',
      boss: true,
      ctx: [],
      goal: '2 + 2 = 4',
      lemmas: [...ADD, ...NUMS],
      tactics: ['rfl', 'rw'],
      xp: 60,
      brief: `Le voilà. Personne ne t’a jamais demandé de le prouver, et c’est justement pour ça que c’est un boss.

Rappelle-toi ce que le moteur sait, à cet instant précis : deux équations pour \`+\`, et quatre surnoms de chiffres. Il ne sait pas compter. \`2 + 2\` et \`4\` sont deux mots sans rapport.

Le plan, c’est celui du niveau précédent, appliqué **des deux côtés** du \`=\` : déplie tout en \`succ\` jusqu’à \`0\`, à gauche comme à droite, puis laisse les deux tours se rejoindre.

Un détail qui compte : \`rw\` remplace *toutes* les occurrences de ce qu’il a trouvé. Réécrire \`2\` change les deux \`2\` d’un coup. Choisis donc ton ordre : le \`4\` d’abord, sinon il restera un chiffre orphelin dont plus rien ne parle.

Quand la dernière tour de \`succ\` coïncide, \`rw\` conclut par \`rfl\` et le tableau se vide. Tu auras démontré 2 + 2 = 4 à partir de rien.`,
      examples: [{ code: 'rw [four_eq_succ_three, three_eq_succ_two]', note: 'Le côté droit descend vers `succ (succ 2)`.' }],
      hints: [
        'Commence par le côté droit : déplie `4`, puis `3`.',
        'Ensuite déplie `2`, puis `1` — les deux côtés sont maintenant en `succ`.',
        'Termine avec `add_succ` deux fois et `add_zero` une fois.',
      ],
      sol: [
        'rw [four_eq_succ_three, three_eq_succ_two]',
        'rw [two_eq_succ_one, one_eq_succ_zero]',
        'rw [add_succ, add_succ]',
        'rw [add_zero]',
      ],
    },
    {
      id: '1.8',
      name: 'deux_nest_pas_zero',
      title: 'Zéro n’est le successeur de personne',
      ctx: [],
      goal: '2 ≠ 0',
      lemmas: [...ADD, ...NUMS, 'succ_ne_zero'],
      tactics: ['rfl', 'rw', 'exact'],
      xp: 30,
      brief: `Après le boss, les deux axiomes de Peano qu’on n’a pas encore sortis. Voici le premier :

\`\`\`
succ_ne_zero : ∀ (a : ℕ), succ a ≠ 0
\`\`\`

Il a l’air anodin, il est fondamental : sans lui, rien n’empêcherait ℕ de boucler. Un ensemble à trois éléments où \`succ 2 = 0\` satisfait toutes les autres règles que tu as utilisées jusqu’ici. C’est cet axiome — et lui seul — qui rend ℕ infini.

Deux choses à savoir pour l’utiliser :

- \`a ≠ b\` est une **notation** pour \`a = b → False\`. Il n’y a pas de « différent » primitif.
- \`succ_ne_zero\` commence par un \`∀\`, donc \`succ_ne_zero 1\` est déjà une preuve : celle de \`succ 1 ≠ 0\`. On applique un théorème à ses arguments exactement comme une fonction.

Il ne reste qu’à faire coïncider l’objectif avec l’axiome.`,
      examples: [
        { code: 'exact succ_ne_zero 1', note: 'L’axiome, appliqué à `1` : une preuve de `succ 1 ≠ 0`.' },
      ],
      hints: [
        '`2 ≠ 0` se lit `2 = 0 → False`. L’axiome dit exactement cela, mais d’un successeur.',
        'Déplie donc `2` en `succ 1`.',
        'Puis donne l’axiome appliqué au bon argument : `exact succ_ne_zero 1`.',
      ],
      sol: ['rw [two_eq_succ_one]', 'exact succ_ne_zero 1'],
    },
    {
      id: '1.9',
      name: 'simplifier_une_somme',
      title: 'Simplifier des deux côtés',
      ctx: ['a b : ℕ', 'h : a + 1 = b + 1'],
      goal: 'a = b',
      lemmas: [...ADD, ...NUMS, 'succ_inj'],
      tactics: ['rfl', 'rw', 'exact'],
      xp: 35,
      brief: `Le dernier axiome de Peano : \`succ\` est **injective**.

\`\`\`
succ_inj : ∀ (a b : ℕ), succ a = succ b → a = b
\`\`\`

C’est lui qui autorise le geste que tout le monde fait sans y penser : barrer la même chose des deux côtés d’une égalité.

Nouveauté de tactique, et elle va beaucoup servir : \`rw [...] at h\` réécrit **dans une hypothèse** au lieu de l’objectif. Ici, l’objectif \`a = b\` n’a rien à simplifier ; tout le travail est dans \`h\`.

Le plan : transforme \`h\` en \`succ a = succ b\`, puis applique l’injectivité. Note que \`succ_inj\` a une hypothèse — donc \`succ_inj a b h\` est une preuve complète de \`a = b\`, l’axiome appliqué à ses trois arguments.`,
      examples: [
        { code: 'rw [add_zero] at h', note: 'Réécrit dans l’hypothèse `h`, pas dans l’objectif.' },
        { code: 'exact succ_inj a b h', note: 'L’injectivité, appliquée à ses arguments et à la preuve.' },
      ],
      hints: [
        'Tout se passe dans `h` : ajoute `at h` à tes réécritures.',
        'Déplie `1`, puis sors les deux `succ` avec `add_succ`, puis nettoie les `+ 0`.',
        '`h` vaut alors `succ a = succ b` : conclus par `exact succ_inj a b h`.',
      ],
      sol: [
        'rw [one_eq_succ_zero] at h',
        'rw [add_succ, add_succ] at h',
        'rw [add_zero, add_zero] at h',
        'exact succ_inj a b h',
      ],
    },
  ],
};

export const WORLD_RECURRENCE = {
  num: 2,
  id: 'recurrence',
  title: 'La Récurrence',
  subtitle: 'Prouver une infinité de choses',
  glyph: '↻',
  intro: `Jusqu’ici tu as calculé. Maintenant il faut **raisonner** : prouver un énoncé pour tous les entiers, alors qu’il y en a une infinité. La récurrence est le seul outil, et dans Lean elle porte un nom de tactique : \`induction\`.`,
  levels: [
    {
      id: '2.1',
      name: 'zero_add',
      title: 'Zéro à gauche',
      ctx: ['a : ℕ'],
      goal: '0 + a = a',
      lemmas: [...ADD],
      tactics: T_REC,
      xp: 30,
      brief: `Surprise : \`0 + a = a\` n’est **pas** \`add_zero\`. L’addition est définie par récursion sur son deuxième argument ; quand le zéro est à gauche, aucune des deux équations ne s’applique. Il faut une récurrence.

\`induction a\` coupe l’objectif en deux :

- le **cas de base**, où \`a\` vaut \`0\` ;
- le **cas successeur**, où l’on peut supposer le résultat pour \`a\` — c’est l’hypothèse de récurrence, que le jeu nomme \`ih\` — et où il faut le montrer pour \`succ a\`.

Deux objectifs apparaissent dans la fenêtre. Les tactiques s’appliquent toujours au **premier** ; quand il se ferme, le suivant prend sa place.`,
      examples: [
        { code: 'induction a', note: 'Ouvre le cas `0` puis le cas `succ a`, avec `ih` en hypothèse.' },
        { code: 'rw [ih]', note: 'L’hypothèse de récurrence se réécrit comme n’importe quelle égalité.' },
      ],
      hints: [
        'Commence par `induction a`.',
        'Cas de base : `0 + 0 = 0`, c’est `add_zero`.',
        'Cas successeur : sors le `succ` avec `add_succ`, puis utilise `ih`.',
      ],
      sol: ['induction a', 'rw [add_zero]', 'rw [add_succ]', 'rw [ih]'],
    },
    {
      id: '2.2',
      name: 'succ_add',
      title: 'Le successeur à gauche',
      ctx: ['a b : ℕ'],
      goal: 'succ a + b = succ (a + b)',
      lemmas: [...ADD, 'zero_add'],
      tactics: T_REC,
      xp: 35,
      brief: `Même asymétrie : \`add_succ\` gère le \`succ\` **à droite** du \`+\`. À gauche, il faut le démontrer.

Question de stratégie, et elle revient à chaque récurrence : sur quelle variable ? Ici \`a\` est bloqué dans un \`succ\` des deux côtés, alors que \`b\` occupe la place où l’addition sait calculer. C’est donc \`induction b\`.

Choisir la bonne variable, c’est la moitié du travail d’une preuve par récurrence.`,
      examples: [{ code: 'induction b', note: 'La variable de récurrence n’est pas toujours la première.' }],
      hints: [
        'Fais la récurrence sur `b`, pas sur `a`.',
        'Cas de base : deux `add_zero`.',
        'Cas successeur : `add_succ`, puis `ih`, puis encore `add_succ`.',
      ],
      sol: ['induction b', 'rw [add_zero, add_zero]', 'rw [add_succ]', 'rw [ih]', 'rw [add_succ]'],
    },
    {
      id: '2.3',
      name: 'add_assoc',
      title: 'Associativité',
      ctx: ['a b c : ℕ'],
      goal: 'a + b + c = a + (b + c)',
      lemmas: [...ADD, 'zero_add', 'succ_add'],
      tactics: T_REC,
      xp: 40,
      brief: `Le premier théorème qui ressemble à des mathématiques : déplacer les parenthèses ne change pas la somme.

Trois variables, un seul choix raisonnable de récurrence : celle sur laquelle l’addition sait travailler des deux côtés, c’est-à-dire \`c\`.

Dans le cas successeur, tu vas voir \`add_succ\` s’appliquer à plusieurs endroits différents. \`rw\` prend **la première occurrence** qu’il rencontre, en parcourant le terme de l’extérieur vers l’intérieur, de gauche à droite. Répéter la règle avance donc pas à pas.`,
      examples: [{ code: 'rw [add_succ, add_succ, add_succ]', note: 'La même règle, trois endroits différents.' }],
      hints: [
        '`induction c`.',
        'Cas de base : deux `add_zero`.',
        'Cas successeur : trois `add_succ` amènent tout en surface, puis `ih` conclut.',
      ],
      sol: ['induction c', 'rw [add_zero, add_zero]', 'rw [add_succ, add_succ, add_succ]', 'rw [ih]'],
    },
    {
      id: '2.4',
      name: 'succ_add_eq_add_succ',
      title: 'Faire glisser un succ',
      ctx: ['a b : ℕ'],
      goal: 'a + succ b = succ a + b',
      lemmas: [...ADD, 'zero_add', 'succ_add', 'add_assoc'],
      tactics: T_REC,
      xp: 25,
      brief: `Court, et pas besoin de récurrence : tu as déjà tout. \`add_succ\` d’un côté, \`succ_add\` de l’autre, et les deux membres se rencontrent au milieu.

C’est le moment de remarquer une chose : chaque théorème démontré devient une **arme réutilisable**. Le Grimoire garde la liste de tout ce que tu as débloqué.`,
      examples: [{ code: 'rw [succ_add]', note: '`succ a + b` devient `succ (a + b)`.' }],
      hints: ['Une réécriture de chaque côté.', 'rw [add_succ], puis rw [succ_add]'],
      sol: ['rw [add_succ]', 'rw [succ_add]'],
    },
    {
      id: '2.5',
      name: 'add_comm',
      title: 'Commutativité',
      boss: true,
      ctx: ['a b : ℕ'],
      goal: 'a + b = b + a',
      lemmas: [...ADD, 'zero_add', 'succ_add', 'add_assoc'],
      tactics: T_REC,
      xp: 70,
      brief: `« L’ordre des termes ne compte pas. » On l’apprend à sept ans, on ne le démontre jamais. Le voici, boss du monde 2.

Tu as maintenant les deux lemmes asymétriques qu’il te fallait : \`zero_add\` pour le cas de base, \`succ_add\` pour le cas successeur. La récurrence fait le reste.

Prends un instant pour mesurer ce qui se passe : la commutativité de l’addition n’est pas une évidence, c’est une **conséquence** de la définition de \`+\` et de la structure de ℕ. Cinq lignes, et rien d’admis.`,
      examples: [{ code: 'rw [add_zero, zero_add]', note: 'Le cas de base tient en une ligne.' }],
      hints: [
        '`induction b` — le côté droit est celui qui bouge.',
        'Cas de base : `add_zero` puis `zero_add`.',
        'Cas successeur : `add_succ`, `succ_add`, puis `ih`.',
      ],
      sol: ['induction b', 'rw [add_zero, zero_add]', 'rw [add_succ, succ_add]', 'rw [ih]'],
    },
    {
      id: '2.6',
      name: 'add_right_comm',
      title: 'Ranger une somme',
      ctx: ['a b c : ℕ'],
      goal: 'a + b + c = a + c + b',
      lemmas: [...ADD, 'zero_add', 'succ_add', 'add_assoc', 'add_comm'],
      tactics: T_REC,
      xp: 35,
      brief: `Après le boss, un outil d’entretien. Échanger les deux derniers termes d’une somme sert constamment, et il vaut mieux un lemme que trois \`add_comm\` mal placés.

Nouveauté utile : on peut **donner ses arguments** à un lemme. \`rw [add_comm b c]\` ne réécrit que \`b + c\` en \`c + b\`, au lieu de laisser \`rw\` attraper la première somme qui passe. Quand une réécriture part dans la mauvaise direction, c’est le premier réflexe à avoir.`,
      examples: [
        { code: 'rw [add_comm b c]', note: 'Cible précisément `b + c`.' },
        { code: 'rw [← add_assoc]', note: 'Re-parenthèse vers la gauche.' },
      ],
      hints: [
        'Ouvre les parenthèses à droite avec `add_assoc`.',
        'Échange les deux termes visés avec `add_comm b c`.',
        'Referme avec `← add_assoc`.',
      ],
      sol: ['rw [add_assoc]', 'rw [add_comm b c]', 'rw [← add_assoc]'],
    },
  ],
};

export const WORLD_PRODUIT = {
  num: 3,
  id: 'produit',
  title: 'Le Produit',
  subtitle: 'L’addition répétée',
  glyph: '×',
  intro: `La multiplication se définit exactement comme l’addition : deux équations, une récursion sur le deuxième argument. Toute la théorie de \`*\` va se construire sur celle de \`+\` — et tu vas voir tes anciens théorèmes servir d’outils.`,
  levels: [
    {
      id: '3.1',
      name: 'mul_one',
      title: 'Multiplier par un',
      ctx: ['a : ℕ'],
      goal: 'a * 1 = a',
      lemmas: [...ADD_ALL, ...MUL, ...NUMS],
      tactics: T_REC,
      xp: 25,
      brief: `Les deux équations de définition :

\`\`\`
mul_zero : ∀ (a : ℕ), a * 0 = 0
mul_succ : ∀ (a b : ℕ), a * succ b = a * b + a
\`\`\`

La seconde dit tout : une multiplication, c’est une addition qu’on répète. Chaque \`succ\` retiré à droite laisse un \`+ a\` derrière lui.

Pour \`a * 1\`, déplie \`1\` en \`succ 0\`, applique \`mul_succ\`, et regarde ce qui reste.`,
      examples: [{ code: 'rw [mul_succ]', note: '`x * succ y` devient `x * y + x`.' }],
      hints: ['Déplie `1` en `succ 0`.', '`mul_succ` fait apparaître `a * 0 + a`.', '`mul_zero` puis `zero_add`.'],
      sol: ['rw [one_eq_succ_zero]', 'rw [mul_succ]', 'rw [mul_zero]', 'rw [zero_add]'],
    },
    {
      id: '3.2',
      name: 'zero_mul',
      title: 'Zéro absorbe',
      ctx: ['a : ℕ'],
      goal: '0 * a = a * 0',
      lemmas: [...ADD_ALL, ...MUL],
      tactics: T_REC,
      xp: 30,
      brief: `\`a * 0\` est immédiat — c’est un axiome. \`0 * a\` ne l’est pas : encore une fois, le zéro est du mauvais côté.

Le double objectif de ce niveau est un cas de figure fréquent : le membre droit se simplifie tout de suite, le gauche demande une récurrence. Simplifie d’abord ce qui est gratuit, ça éclaircit le tableau.`,
      examples: [{ code: 'rw [mul_zero]', note: 'Utilisable des deux côtés du `=`.' }],
      hints: [
        'Simplifie `a * 0` en `0` avec `mul_zero`, puis fais `induction a`.',
        'Cas de base : `mul_zero`.',
        'Cas successeur : `mul_succ`, puis `ih`, puis `add_zero`.',
      ],
      sol: ['rw [mul_zero]', 'induction a', 'rw [mul_zero]', 'rw [mul_succ]', 'rw [ih]', 'rw [add_zero]'],
    },
    {
      id: '3.3',
      name: 'two_mul',
      title: 'Le double',
      ctx: ['a : ℕ'],
      goal: '2 * a = a + a',
      lemmas: [...ADD_ALL, ...MUL, 'zero_mul', 'succ_mul', 'mul_one', 'one_mul', ...NUMS],
      tactics: T_REC,
      xp: 30,
      brief: `Un lemme dont tu auras besoin au dernier boss du jeu : multiplier par deux, c’est additionner à soi-même.

Tu disposes maintenant de \`succ_mul : succ a * b = a * b + b\`, la version gauche de \`mul_succ\`. Elle se démontre comme \`succ_add\`, par récurrence — le jeu te l’offre pour ne pas répéter deux fois le même exercice.`,
      examples: [{ code: 'rw [succ_mul]', note: '`succ a * b` devient `a * b + b`.' }],
      hints: ['Déplie `2` en `succ 1`.', '`succ_mul` fait apparaître `1 * a + a`.', 'Termine avec `one_mul`.'],
      sol: ['rw [two_eq_succ_one]', 'rw [succ_mul]', 'rw [one_mul]'],
    },
    {
      id: '3.4',
      name: 'mul_add',
      title: 'Distributivité',
      ctx: ['a b c : ℕ'],
      goal: 'a * (b + c) = a * b + a * c',
      lemmas: [...ADD_ALL, ...MUL, 'zero_mul', 'succ_mul', 'mul_one', 'one_mul'],
      tactics: T_REC,
      xp: 45,
      brief: `Le pont entre l’addition et la multiplication. C’est le lemme qui fait de ℕ un **semi-anneau**, et sans lui aucun calcul algébrique n’est possible.

Récurrence sur \`c\`, puis un enchaînement où \`add_assoc\` vient conclure : c’est le premier niveau où un théorème du monde 2 te sauve la mise.`,
      examples: [{ code: 'rw [add_assoc]', note: 'Le vieux théorème du monde 2, réutilisé tel quel.' }],
      hints: [
        '`induction c`.',
        'Cas de base : `add_zero`, `mul_zero`, `add_zero`.',
        'Cas successeur : `add_succ`, `mul_succ`, `ih`, `mul_succ`, et enfin `add_assoc`.',
      ],
      sol: ['induction c', 'rw [add_zero, mul_zero, add_zero]',
        'rw [add_succ]', 'rw [mul_succ]', 'rw [ih]', 'rw [mul_succ]', 'rw [add_assoc]'],
    },
    {
      id: '3.5',
      name: 'mul_comm',
      title: 'Commutativité du produit',
      boss: true,
      ctx: ['a b : ℕ'],
      goal: 'a * b = b * a',
      lemmas: [...ADD_ALL, ...MUL, 'zero_mul', 'succ_mul', 'mul_one', 'one_mul', 'mul_add'],
      tactics: T_REC,
      xp: 70,
      brief: `Le boss du monde 3, et le jumeau de celui du monde 2. Même structure de preuve, mêmes ingrédients : une version gauche (\`succ_mul\`), une version droite (\`mul_succ\`), et une récurrence qui les fait se rejoindre.

Si tu as compris \`add_comm\`, tu tiens celui-ci en trois lignes. C’est le signe qu’une méthode est bien apprise : la deuxième fois, c’est presque de la routine.

Regarde quand même ce que tu es en train d’utiliser, parce que c’est le cœur du monde 3 : \`zero_mul\` et \`succ_mul\` ne sont pas des axiomes. Tu les as démontrés, par récurrence, à partir des deux seules équations de définition de \`*\`. Le cas de base de cette preuve-ci repose donc sur une récurrence antérieure, et le cas successeur sur une autre. C’est une pile, pas une liste.

Un mot sur ce que la commutativité *n’est pas*. Ce n’est pas une évidence sur les nombres : c’est une propriété de la définition. Si tu définissais \`a * b\` comme « a répété b fois » sur des mots au lieu d’entiers — la concaténation — l’associativité tiendrait encore, et la commutativité tomberait. Formaliser, c’est apprendre lesquelles de nos évidences dépendent de quoi.`,
      examples: [{ code: 'induction b', note: 'Comme pour `add_comm` : la récurrence porte sur la seconde variable.' }],
      hints: [
        '`induction b`.',
        'Cas de base : `mul_zero` puis `zero_mul`.',
        'Cas successeur : `mul_succ`, `succ_mul`, `ih`.',
      ],
      sol: ['induction b', 'rw [mul_zero, zero_mul]', 'rw [mul_succ, succ_mul]', 'rw [ih]'],
    },
    {
      id: '3.6',
      name: 'mul_assoc',
      title: 'Associativité du produit',
      ctx: ['a b c : ℕ'],
      goal: 'a * b * c = a * (b * c)',
      lemmas: [...ADD_ALL, ...MUL_ALL],
      tactics: T_REC,
      xp: 45,
      brief: `Le dernier axiome de semi-anneau qui manquait. Avec \`mul_add\`, \`mul_comm\`, \`add_assoc\` et celui-ci, ℕ a toute sa structure algébrique — et la tactique \`ring\` du monde suivant devient possible.

Récurrence sur \`c\`. Dans le cas successeur, \`mul_add\` (la distributivité) est la clé : elle ouvre le \`a * (b * c + b)\` qui apparaît à droite.`,
      examples: [{ code: 'rw [mul_add]', note: 'Distribue `a` sur une somme, où qu’elle soit.' }],
      hints: [
        '`induction c`.',
        'Cas de base : trois `mul_zero`.',
        'Cas successeur : `mul_succ`, `mul_succ`, `mul_add`, `ih`.',
      ],
      sol: ['induction c', 'rw [mul_zero, mul_zero, mul_zero]',
        'rw [mul_succ]', 'rw [mul_succ]', 'rw [mul_add]', 'rw [ih]'],
    },
    {
      id: '3.7',
      name: 'preuve_lisible',
      title: 'Une preuve qui se lit',
      ctx: ['a b c : ℕ'],
      goal: '(a + b) * c = c * a + c * b',
      lemmas: [...ADD_ALL, ...MUL_ALL],
      tactics: [...T_REC, 'calc'],
      xp: 40,
      brief: `Relis la preuve du niveau précédent. Six lignes de \`rw\`, et pour savoir ce qu’elles font il faut les rejouer une par une dans sa tête. C’est du code qui marche et qui ne s’explique pas.

Voici le remède, et c’est une des plus belles constructions de Lean :

\`\`\`
calc (a + b) * c = a * c + b * c := by rw [add_mul]
  _ = c * a + b * c := by rw [mul_comm a c]
\`\`\`

Chaque ligne annonce **où elle arrive**, puis justifie le pas après \`:=\`. Le \`_\` reprend le membre droit de la ligne précédente — c’est ce qui donne à la preuve sa forme d’escalier. La transitivité de l’égalité est implicite : c’est \`calc\` qui l’applique pour toi.

Trois choses à savoir :

- après \`:=\`, tu écris \`by\` suivi d’une tactique (plusieurs, séparées par \`;\`) — ou directement un terme de preuve, comme une hypothèse ;
- la chaîne doit arriver **exactement** sur l’objectif, sinon \`calc\` le dit ;
- chaque étape est vérifiée séparément, donc l’erreur est toujours localisée.

C’est la différence entre une preuve que la machine accepte et une preuve qu’un humain relit. Mathlib est écrite comme ça.`,
      examples: [
        { code: 'calc a = b := h1', note: 'Première étape : elle nomme son point de départ.' },
        { code: '_ = c := by rw [h2]', note: 'Le `_` reprend le `b` de la ligne d’avant.' },
      ],
      hints: [
        'Développe d’abord avec `add_mul` : tu arrives à `a * c + b * c`.',
        'Puis remets chaque produit dans l’ordre voulu, un à la fois, avec `mul_comm` et ses arguments.',
        'Trois étapes suffisent. Et si tu préfères, la même preuve en trois `rw` marche aussi — compare les deux à la relecture.',
      ],
      sol: [
        'calc (a + b) * c = a * c + b * c := by rw [add_mul]',
        '  _ = c * a + b * c := by rw [mul_comm a c]',
        '  _ = c * a + c * b := by rw [mul_comm b c]',
      ],
    },
  ],
};

export const WORLD_PUISSANCES = {
  num: 4,
  id: 'puissances',
  title: 'Les Puissances',
  subtitle: 'Et la première machine',
  glyph: '^',
  intro: `Troisième étage de la tour : la puissance est un produit répété, comme le produit était une addition répétée. Puis, à la fin de ce monde, tu rencontres \`ring\` — la première tactique qui *décide* au lieu de réécrire.`,
  levels: [
    {
      id: '4.1',
      name: 'pow_one',
      title: 'Puissance un',
      ctx: ['a : ℕ'],
      goal: 'a ^ 1 = a',
      lemmas: [...ADD_ALL, ...MUL_ALL, 'pow_zero', 'pow_succ', ...NUMS],
      tactics: T_REC,
      xp: 25,
      brief: `Les deux équations, sans surprise :

\`\`\`
pow_zero : ∀ (a : ℕ), a ^ 0 = 1
pow_succ : ∀ (a b : ℕ), a ^ succ b = a ^ b * a
\`\`\`

Note que \`0 ^ 0 = 1\` d’après la première. C’est une convention, et Lean l’assume — dans un système formel, il faut bien choisir, et ce choix rend \`pow_add\` vrai sans exception.`,
      examples: [{ code: 'rw [pow_succ]', note: '`a ^ succ b` devient `a ^ b * a`.' }],
      hints: ['Déplie `1`, applique `pow_succ`.', 'Il reste `a ^ 0 * a` : `pow_zero` puis `one_mul`.'],
      sol: ['rw [one_eq_succ_zero]', 'rw [pow_succ]', 'rw [pow_zero]', 'rw [one_mul]'],
    },
    {
      id: '4.2',
      name: 'pow_two',
      title: 'Le carré',
      ctx: ['a : ℕ'],
      goal: 'a ^ 2 = a * a',
      lemmas: [...ADD_ALL, ...MUL_ALL, 'pow_zero', 'pow_succ', ...NUMS],
      tactics: T_REC,
      xp: 30,
      brief: `« Le carré, c’est le nombre fois lui-même. » Encore une évidence à démontrer.

Deux \`succ\` à descendre, donc deux \`pow_succ\`. Tu commences à reconnaître le rythme : déplier le chiffre, appliquer l’équation, nettoyer le neutre.`,
      examples: [{ code: 'rw [two_eq_succ_one, one_eq_succ_zero]', note: 'Descendre `2` jusqu’à `0` d’un coup.' }],
      hints: ['Déplie `2` puis `1`.', 'Deux `pow_succ`, un `pow_zero`, un `one_mul`.'],
      sol: ['rw [two_eq_succ_one, one_eq_succ_zero]', 'rw [pow_succ, pow_succ]',
        'rw [pow_zero]', 'rw [one_mul]'],
    },
    {
      id: '4.3',
      name: 'pow_add',
      title: 'Additionner les exposants',
      boss: true,
      ctx: ['a m n : ℕ'],
      goal: 'a ^ (m + n) = a ^ m * a ^ n',
      lemmas: [...ADD_ALL, ...MUL_ALL, 'pow_zero', 'pow_succ'],
      tactics: T_REC,
      xp: 65,
      brief: `Le boss du monde : la règle que tout le monde connaît, \`aᵐ⁺ⁿ = aᵐ · aⁿ\`.

Récurrence sur \`n\`. Le cas de base a besoin de \`mul_one\`, le cas successeur de \`mul_assoc\` — deux théorèmes du monde précédent. À ce stade tu ne prouves plus des choses à partir de rien : tu **empiles**. C’est exactement comme ça qu’est construite Mathlib, la bibliothèque de mathématiques de Lean : environ un million de lignes, toutes posées sur les précédentes.`,
      examples: [{ code: 'rw [mul_assoc]', note: 'Le théorème du monde 3, réutilisé au monde 4.' }],
      hints: [
        '`induction n`.',
        'Cas de base : `add_zero`, `pow_zero`, `mul_one`.',
        'Cas successeur : `add_succ`, `pow_succ`, `ih`, `pow_succ`, `mul_assoc`.',
      ],
      sol: ['induction n', 'rw [add_zero, pow_zero, mul_one]',
        'rw [add_succ]', 'rw [pow_succ]', 'rw [ih]', 'rw [pow_succ]', 'rw [mul_assoc]'],
    },
    {
      id: '4.4',
      name: 'ring_artefact',
      title: 'L’artefact : ring',
      ctx: ['a b : ℕ'],
      goal: '(a + b) ^ 2 = a ^ 2 + 2 * (a * b) + b ^ 2',
      lemmas: [...ADD_ALL, ...MUL_ALL, 'pow_zero', 'pow_succ', ...NUMS],
      tactics: T_REC_RING,
      xp: 40,
      arith: true,
      brief: `Tu as construit, à la main, tous les axiomes de semi-anneau de ℕ. Voici ta récompense.

\`ring\` ne réécrit pas : elle **décide**. Elle développe les deux membres en polynôme normalisé — les monômes triés, les coefficients additionnés — et compare. Si les deux formes normales coïncident, l’égalité est vraie dans *tout* semi-anneau commutatif, et la tactique conclut.

C’est un changement de nature. Une tactique de réécriture suit tes ordres ; une procédure de décision remplace ton raisonnement par un algorithme. Mathlib en regorge : \`ring\`, \`linarith\` pour les inégalités linéaires, \`omega\` pour l’arithmétique entière, \`decide\` pour tout ce qui est fini.

Un mot d’honnêteté, parce que c’est le bon moment : \`ring\` telle qu’implémentée ici est ma propre normalisation polynomiale, pas celle de Lean. Le vrai \`ring\` construit un **terme de preuve** que le noyau revérifie ligne à ligne. Ici, tu me fais confiance. Dans Lean, tu ne fais confiance à personne — c’est tout l’intérêt.

Alors essaie l’identité remarquable en une ligne. Puis va la retaper dans le vrai Lean avec le bouton du bas.`,
      examples: [{ code: 'ring', note: 'Une identité polynomiale, une ligne.' }],
      hints: ['Une seule tactique.', 'ring'],
      sol: ['ring'],
      lean: `-- Dans le vrai Lean 4 avec Mathlib :\nexample (a b : ℕ) : (a + b) ^ 2 = a ^ 2 + 2 * (a * b) + b ^ 2 := by\n  ring`,
    },
  ],
};

export const NAT_WORLDS = [WORLD_TABLEAU, WORLD_PEANO, WORLD_RECURRENCE,
  WORLD_PRODUIT, WORLD_PUISSANCES];
