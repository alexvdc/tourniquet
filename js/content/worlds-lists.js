// Monde 9 : les listes. Deuxième structure inductive du jeu — l'occasion de
// montrer que la récurrence n'est pas une astuce sur les entiers.

const T_LIST = ['rfl', 'exact', 'rw', 'induction', 'calc', 'simp'];

const NAT = ['add_zero', 'add_succ', 'zero_add', 'succ_add', 'add_assoc', 'add_comm'];
const DEFS = ['nil_append', 'cons_append', 'length_nil', 'length_cons',
  'reverse_nil', 'reverse_cons'];

export const WORLD_LISTES = {
  num: 9,
  id: 'listes',
  title: 'Les Listes',
  subtitle: 'La récurrence, mais sur autre chose',
  glyph: '::',
  intro: `Une liste se construit comme un entier : il y a un cas vide, \`[]\`, et une machine qui ajoute un élément devant, \`x :: l\`. Deux constructeurs, donc une récurrence — la même que sur ℕ, avec deux cas au lieu de deux cas. Tout ce que tu as appris au monde 2 se transporte tel quel, et c’est précisément ce qu’il faut retenir : la récurrence n’était pas une astuce sur les nombres.`,
  levels: [
    {
      id: '9.1',
      name: 'append_nil',
      title: 'Concaténer du vide',
      ctx: ['l : List ℕ'],
      goal: 'l ++ [] = l',
      lemmas: [...DEFS, ...NAT],
      tactics: T_LIST,
      xp: 35,
      brief: `Une liste d’entiers, \`List ℕ\`, c’est soit \`[]\`, soit \`x :: l\` — un élément devant une liste plus courte. \`[1, 2, 3]\` n’est qu’une écriture pour \`1 :: (2 :: (3 :: []))\`.

La concaténation \`++\` se définit par récursion sur sa liste **de gauche** :

\`\`\`
nil_append  : ∀ (l : List ℕ), [] ++ l = l
cons_append : ∀ (x : ℕ) (l m : List ℕ), (x :: l) ++ m = x :: (l ++ m)
\`\`\`

Note l’asymétrie, elle est l’exact miroir de celle de l’addition : \`+\` récursait sur son argument **droit**, \`++\` récurse à gauche. D’où le fait que \`[] ++ l = l\` soit un axiome, et que \`l ++ [] = l\` — l’énoncé de ce niveau — demande une récurrence. Souviens-toi de \`add_zero\` et \`zero_add\` : c’est la même histoire, dans l’autre sens.

\`induction l\` ouvre les deux cas : la liste vide, puis \`x :: l\` avec l’hypothèse de récurrence \`ih\` sur la queue.`,
      examples: [
        { code: 'induction l', note: 'Ouvre le cas `[]` puis le cas `x :: l`.' },
        { code: 'rw [cons_append]', note: 'Fait sortir la tête de la concaténation.' },
      ],
      hints: [
        '`induction l` — et remarque que le cas de base est `[] ++ [] = []`.',
        'Le cas de base est exactement `nil_append`.',
        'Cas `x :: l` : sors la tête avec `cons_append`, puis utilise `ih`.',
      ],
      sol: ['induction l', 'rw [nil_append]', 'rw [cons_append]', 'rw [ih]'],
    },
    {
      id: '9.2',
      name: 'append_assoc_liste',
      title: 'Associativité de la concaténation',
      ctx: ['l m n : List ℕ'],
      goal: '(l ++ m) ++ n = l ++ (m ++ n)',
      lemmas: [...DEFS, ...NAT, 'append_nil'],
      tactics: T_LIST,
      xp: 40,
      brief: `Concaténer trois listes : les parenthèses ne comptent pas. C’est \`add_assoc\`, transposé.

Sur quelle variable faire la récurrence ? La même question qu’au monde 2, et la même réponse : celle sur laquelle la définition sait travailler. \`++\` récurse à gauche, donc c’est \`l\`.

Une chose que ce niveau ne dit pas et qui mérite d’être notée : la concaténation est associative mais **pas commutative**. \`[1, 2] ++ [3]\` et \`[3] ++ [1, 2]\` sont deux listes différentes. L’ordre est exactement l’information qu’une liste retient et qu’un ensemble oublie — c’est pour ça que les deux existent.`,
      examples: [{ code: 'rw [cons_append, cons_append, cons_append]', note: 'Trois occurrences à faire sortir, dans l’ordre où `rw` les trouve.' }],
      hints: [
        '`induction l`.',
        'Cas de base : deux `nil_append` suffisent.',
        'Cas `x :: l` : trois `cons_append` amènent tout en surface, puis `ih` conclut.',
      ],
      sol: ['induction l', 'rw [nil_append, nil_append]',
        'rw [cons_append, cons_append, cons_append]', 'rw [ih]'],
    },
    {
      id: '9.3',
      name: 'length_append',
      title: 'La longueur est un morphisme',
      ctx: ['l m : List ℕ'],
      goal: 'length (l ++ m) = length l + length m',
      lemmas: [...DEFS, ...NAT, 'append_nil', 'append_assoc'],
      tactics: T_LIST,
      xp: 45,
      brief: `Le pont entre ce monde et tous les précédents. \`length\` envoie une liste vers un entier :

\`\`\`
length_nil  : length [] = 0
length_cons : ∀ (x : ℕ) (l : List ℕ), length (x :: l) = succ (length l)
\`\`\`

Et l’énoncé de ce niveau dit quelque chose de fort : \`length\` transforme la **concaténation** en **addition**. Une opération d’un côté, une autre de l’autre, et une fonction qui respecte la structure. En algèbre, ça s’appelle un *morphisme*, et c’est l’une des idées les plus rentables des mathématiques : dès qu’on en tient un, tout ce qu’on sait de l’arrivée se rapatrie au départ.

Concrètement, tu vas voir ta preuve sur les listes se terminer par un lemme d’arithmétique du monde 2. Les deux mondes se parlent.`,
      examples: [
        { code: 'rw [length_cons]', note: '`length (x :: l)` devient `succ (length l)`.' },
        { code: 'rw [succ_add]', note: 'Un lemme du monde 2, réutilisé tel quel.' },
      ],
      hints: [
        '`induction l`.',
        'Cas de base : `nil_append`, puis `length_nil`, puis un lemme du monde 2 pour le `0 +`.',
        'Cas `x :: l` : `cons_append`, deux `length_cons`, puis `succ_add` avant d’appliquer `ih`.',
      ],
      sol: ['induction l', 'rw [nil_append, length_nil, zero_add]',
        'rw [cons_append, length_cons, length_cons, succ_add, ih]'],
    },
    {
      id: '9.4',
      name: 'reverse_append',
      title: 'Retourner une concaténation',
      ctx: ['l m : List ℕ'],
      goal: 'reverse (l ++ m) = reverse m ++ reverse l',
      lemmas: [...DEFS, ...NAT, 'append_nil', 'append_assoc'],
      tactics: T_LIST,
      xp: 50,
      brief: `\`reverse\` se définit en envoyant la tête à la fin :

\`\`\`
reverse_nil  : reverse [] = []
reverse_cons : ∀ (x : ℕ) (l : List ℕ), reverse (x :: l) = reverse l ++ [x]
\`\`\`

Regarde bien l’énoncé du niveau : les deux listes **s’échangent**. Retourner « A puis B » donne « B retourné puis A retourné ». C’est évident quand on y pense avec les mains, et c’est le genre d’évidence qui se démontre en quatre lignes.

Au passage, une remarque de programmeur : cette définition de \`reverse\` est *quadratique*. Chaque \`reverse_cons\` fabrique une concaténation, et concaténer coûte la longueur de la liste de gauche. Le vrai Lean définit \`List.reverse\` avec un accumulateur, en temps linéaire, et démontre ensuite que les deux coïncident. Écrire d’abord la version claire, la version rapide ensuite, et prouver qu’elles sont égales : c’est exactement ce que les assistants de preuve permettent.`,
      examples: [{ code: 'rw [append_assoc]', note: 'Le théorème du niveau 9.2, réutilisé pour ranger la fin.' }],
      hints: [
        '`induction l`.',
        'Cas de base : `nil_append`, `reverse_nil`, puis `append_nil`.',
        'Cas `x :: l` : `cons_append`, `reverse_cons`, `ih`, `reverse_cons`, et `append_assoc` pour finir.',
      ],
      sol: ['induction l', 'rw [nil_append, reverse_nil, append_nil]',
        'rw [cons_append, reverse_cons, ih, reverse_cons, append_assoc]'],
    },
    {
      id: '9.5',
      name: 'reverse_reverse',
      title: 'Retourner deux fois',
      boss: true,
      ctx: ['l : List ℕ'],
      goal: 'reverse (reverse l) = l',
      lemmas: [...DEFS, ...NAT, 'append_nil', 'append_assoc', 'reverse_append'],
      tactics: T_LIST,
      xp: 90,
      brief: `**Boss du monde.** Retourner une liste deux fois la laisse intacte. Personne n’en doute ; le démontrer est une autre affaire, et c’est le plus bel enchaînement du jeu.

Le cas de base tient en deux réécritures — attention, il en faut bien **deux** : \`reverse (reverse [])\` a deux \`reverse\` à effacer, et \`rw\` n’en efface qu’un à la fois.

Le cas \`x :: l\` est un petit chef-d’œuvre de plomberie. Déroule-le lentement, en lisant la fenêtre après chaque pas :

1. \`reverse_cons\` fait apparaître un \`reverse (reverse l ++ [x])\` ;
2. \`reverse_append\` échange les deux morceaux — c’est le théorème du niveau précédent, et c’est lui qui débloque tout ;
3. \`ih\` remplace \`reverse (reverse l)\` par \`l\` ;
4. il reste à simplifier \`reverse [x]\`, qui n’est qu’une liste à un élément : \`reverse_cons\`, \`reverse_nil\`, \`nil_append\` ;
5. et à recoller \`[x] ++ l\` en \`x :: l\` avec \`cons_append\` puis \`nil_append\`.

Huit réécritures dans le cas successeur. Prends-les une par une : chacune est petite, et la fenêtre te dit toujours où tu en es. Si tu veux une preuve dont tu seras fier, \`calc\` est autorisée.`,
      examples: [
        { code: 'rw [reverse_nil, reverse_nil]', note: 'Deux `reverse` à effacer, deux réécritures.' },
        { code: 'rw [reverse_append]', note: 'Le théorème du niveau 9.4 : c’est la clé du boss.' },
      ],
      hints: [
        '`induction l`. Le cas de base demande deux `reverse_nil`.',
        'Cas `x :: l` : commence par `reverse_cons`, puis `reverse_append`.',
        'Tu peux alors appliquer `ih`. Il ne reste plus qu’à simplifier `reverse [x]`.',
        '`reverse [x]` se déplie avec `reverse_cons` puis `reverse_nil` puis `nil_append` ; termine par `cons_append` et `nil_append`.',
      ],
      sol: ['induction l', 'rw [reverse_nil, reverse_nil]',
        'rw [reverse_cons, reverse_append, ih, reverse_cons, reverse_nil, nil_append, cons_append, nil_append]'],
      lean: `-- Dans le vrai Lean 4, avec Mathlib, ce théorème existe déjà :\nexample (l : List ℕ) : (l.reverse).reverse = l := by\n  simp\n\n-- Et sa démonstration, si on la refait à la main :\nexample (l : List ℕ) : (l.reverse).reverse = l := by\n  induction l with\n  | nil => rfl\n  | cons x t ih => rw [List.reverse_cons, List.reverse_append, ih]; rfl`,
    },
    {
      id: '9.6',
      name: 'length_reverse',
      title: 'Retourner ne change pas la longueur',
      ctx: ['l : List ℕ'],
      goal: 'length (reverse l) = length l',
      lemmas: [...DEFS, ...NAT, 'append_nil', 'append_assoc', 'reverse_append',
        'length_append', 'reverse_reverse'],
      tactics: T_LIST,
      xp: 45,
      brief: `Épilogue du monde, et un énoncé qui a l’air encore plus évident que le boss : retourner une liste ne change pas le nombre de ses éléments.

Tu as maintenant tout ce qu’il faut, et notamment \`length_append\` — le morphisme du niveau 9.3. C’est lui qui fait le travail : \`reverse\` fabrique une concaténation, et \`length\` la transforme en somme.

Ce niveau illustre une habitude qu’on prend en formalisant : les théorèmes utiles ne sont presque jamais ceux qu’on visait, ce sont les **lemmes de liaison** entre deux notions. \`length_append\` n’est pas un résultat impressionnant ; c’est celui qu’on réutilise dix fois.

Regarde aussi ce que ça donne dans le vrai Lean, avec le bouton du bas : \`simp\` referme cet énoncé d’un coup, parce que quelqu’un a marqué les bons lemmes \`@[simp]\` avant toi.`,
      examples: [
        { code: 'rw [length_append]', note: 'Le morphisme du niveau 9.3 : la clé de ce niveau.' },
        { code: 'rw [length_cons, length_nil]', note: 'Pour évaluer `length [x]`, qui vaut `succ 0`.' },
      ],
      hints: [
        '`induction l` — le cas de base se ferme avec un seul `reverse_nil`.',
        'Cas `x :: l` : `reverse_cons` fait apparaître une concaténation, donc `length_append`.',
        'Après `ih`, il reste à calculer `length [x]` : deux `length_cons`, un `length_nil`.',
        'Termine avec `add_succ` puis `add_zero`.',
      ],
      sol: ['induction l', 'rw [reverse_nil]',
        'rw [reverse_cons, length_append, ih, length_cons, length_cons, length_nil, add_succ, add_zero]'],
      lean: `-- Dans le vrai Lean, les bons lemmes sont déjà marqués @[simp] :\nexample (l : List ℕ) : (l.reverse).length = l.length := by\n  simp`,
    },
  ],
};

export const LIST_WORLDS = [WORLD_LISTES];
