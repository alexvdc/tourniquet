// Le lexique : les symboles et les mots. Rien de ce qui est écrit ailleurs sur
// le site ne devrait rester opaque après un passage ici.

/**
 * Symboles. `type` dit comment le taper dans l'éditeur (les abréviations de
 * Lean fonctionnent : la séquence, puis un espace).
 */
export const SYMBOLES = [
  {
    glyph: '⊢', name: 'le tourniquet', type: '\\vdash',
    lire: '« il reste à démontrer »',
    sens: `Sépare ce qu’on sait de ce qu’on doit prouver. Tout ce qui est au-dessus est acquis ; ce qui suit le tourniquet est le travail restant. Le nom vient du tourniquet d’entrée d’un métro : on ne passe que dans un sens.`,
    exemple: 'hp : p\n⊢ p ∧ q',
    monde: 0,
  },
  {
    glyph: '∀', name: 'quantificateur universel', type: '\\all',
    lire: '« pour tout »',
    sens: `\`∀ (n : ℕ), P n\` se lit « pour tout entier n, P est vrai de n ». Dans Lean, une preuve d’un ∀ est une **fonction** : donne-lui un objet, elle rend une preuve à son sujet. Pour en prouver un, on écrit \`intro n\` — « soit n quelconque ».`,
    exemple: '∀ (a b : ℕ), a + b = b + a',
    monde: 7,
  },
  {
    glyph: '∃', name: 'quantificateur existentiel', type: '\\ex',
    lire: '« il existe »',
    sens: `\`∃ (n : ℕ), P n\` se lit « il existe un entier n tel que P ». Une preuve est une **paire** : un témoin, et la preuve qu’il convient. Pas de « il en existe forcément un » : il faut le montrer. La tactique \`use\` fournit le témoin.`,
    exemple: '∃ (n : ℕ), n + 2 = 5',
    monde: 7,
  },
  {
    glyph: '→', name: 'implication', type: '\\to',
    lire: '« implique », ou « si… alors »',
    sens: `\`p → q\` : si p, alors q. Une preuve est une fonction qui transforme une preuve de p en preuve de q — c’est le même objet qu’une fonction ordinaire, et c’est le cœur de la correspondance de Curry–Howard. La flèche associe **à droite** : \`p → q → r\` se lit \`p → (q → r)\`.`,
    exemple: 'p → q → p',
    monde: 5,
  },
  {
    glyph: '∧', name: 'conjonction', type: '\\and',
    lire: '« et »',
    sens: `\`p ∧ q\` : les deux à la fois. Une preuve est une **paire**, qu’on construit avec \`⟨hp, hq⟩\` ou \`constructor\`, et qu’on ouvre avec \`obtain ⟨hp, hq⟩\`.`,
    exemple: 'p ∧ q → q ∧ p',
    monde: 6,
  },
  {
    glyph: '∨', name: 'disjonction', type: '\\or',
    lire: '« ou » (inclusif)',
    sens: `\`p ∨ q\` : l’un ou l’autre, éventuellement les deux. Pour le prouver il faut **choisir** un côté (\`left\`, \`right\`) ; pour l’utiliser il faut traiter **les deux** cas (\`obtain hp | hq\`). C’est ce qui le rend plus lourd que le ∧.`,
    exemple: 'p ∨ q → q ∨ p',
    monde: 6,
  },
  {
    glyph: '¬', name: 'négation', type: '\\not',
    lire: '« non »',
    sens: `Ce n’est pas un connecteur primitif : \`¬p\` est une **notation** pour \`p → False\`. Une hypothèse \`hnp : ¬p\` s’utilise donc comme une fonction, et \`hnp hp\` est une preuve de \`False\`.`,
    exemple: '¬(p ∨ q) ↔ ¬p ∧ ¬q',
    monde: 6,
  },
  {
    glyph: '↔', name: 'équivalence', type: '\\iff',
    lire: '« si et seulement si »',
    sens: `\`p ↔ q\` : une paire d’implications. \`constructor\` l’ouvre en deux objectifs. Deux énoncés équivalents étant interchangeables, on peut **réécrire** avec un ↔ exactement comme avec une égalité.`,
    exemple: 'a ≤ b ↔ ∃ c, b = a + c',
    monde: 6,
  },
  {
    glyph: 'ℕ', name: 'les entiers naturels', type: '\\nat',
    lire: '« N », l’ensemble des entiers naturels',
    sens: `0, 1, 2, … Dans ce jeu, ℕ est construit à partir de \`0\` et d’une machine \`succ\` qui donne le suivant. Il n’y a pas de nombre négatif : c’est pour ça que \`0 ≤ a\` est démontrable, et que la soustraction y est tronquée (\`3 - 5 = 0\`).`,
    exemple: '(a : ℕ)',
    monde: 1,
  },
  {
    glyph: 'Prop',
    name: 'l’univers des énoncés', type: 'Prop',
    lire: '« proposition »',
    sens: `Le type des énoncés. \`2 + 2 = 4\` est un \`Prop\`. Un **élément** d’un \`Prop\` est une preuve de cet énoncé — d’où \`hp : p\`, qui se lit « hp est une preuve de p ». À distinguer de \`Type\`, l’univers des données : ℕ est un \`Type\`, ses éléments sont des nombres.`,
    exemple: '(p q : Prop)',
    monde: 5,
  },
  {
    glyph: '=', name: 'égalité', type: '=',
    lire: '« égale »',
    sens: `Deux termes désignent le même objet. Se prouve par \`rfl\` quand les deux côtés sont identiques, et se manipule avec \`rw\`. Attention : dans les premiers mondes, « identiques » veut dire *syntaxiquement* identiques — \`2 + 2\` et \`4\` sont deux termes différents jusqu’à ce que tu les rapproches.`,
    exemple: '2 + 2 = 4',
    monde: 0,
  },
  {
    glyph: '≠', name: 'différence', type: '\\ne',
    lire: '« différent de »',
    sens: `Notation pour \`¬(a = b)\`, c’est-à-dire \`a = b → False\`. Pour prouver \`2 ≠ 0\`, on suppose l’égalité et on en tire une absurdité.`,
    exemple: 'succ a ≠ 0',
    monde: 1,
  },
  {
    glyph: '≤', name: 'inférieur ou égal', type: '\\le',
    lire: '« plus petit ou égal »',
    sens: `Sur ℕ, ce n’est pas un symbole primitif mais une **définition** : \`a ≤ b\` signifie « il existe c tel que b = a + c ». Une inégalité est donc un ∃ déguisé.`,
    exemple: 'a ≤ b ↔ ∃ c, b = a + c',
    monde: 8,
  },
  {
    glyph: 'λ', name: 'lambda', type: '\\lam ou fun',
    lire: '« la fonction qui, à x, associe… »',
    sens: `Construit une fonction sans la nommer. \`fun x => x + 1\` est la fonction qui ajoute un. Comme une preuve d’implication *est* une fonction, \`fun hp => hp\` est une preuve de \`p → p\`.`,
    exemple: 'fun h => h',
    monde: 5,
  },
  {
    glyph: '⟨ ⟩', name: 'constructeur anonyme', type: '\\< et \\>',
    lire: '« la paire », « le couple témoin-preuve »',
    sens: `Construit une structure sans nommer son constructeur : Lean devine lequel grâce au type attendu. \`⟨hp, hq⟩\` prouve un \`∧\`, \`⟨3, h⟩\` prouve un \`∃\`. Les chevrons se replient à droite : \`⟨a, b, c⟩\` veut dire \`⟨a, ⟨b, c⟩⟩\`.`,
    exemple: 'exact ⟨hq, hp⟩',
    monde: 6,
  },
  {
    glyph: '←', name: 'réécriture inversée', type: '\\l',
    lire: '« dans l’autre sens »',
    sens: `Dans \`rw [← h]\`, retourne la règle : au lieu de remplacer le membre gauche par le droit, on remplace le droit par le gauche. C’est la moitié des débogages de \`rw\`.`,
    exemple: 'rw [← add_assoc]',
    monde: 1,
  },
  {
    glyph: '::', name: 'cons', type: '::',
    lire: '« devant », « ajouté en tête »',
    sens: `\`x :: l\` est la liste dont la tête est \`x\` et la queue \`l\`. C’est l’un des deux constructeurs d’une liste, l’autre étant \`[]\`. \`[1, 2]\` n’est qu’une écriture pour \`1 :: 2 :: []\`.`,
    exemple: 'length (x :: l) = succ (length l)',
    monde: 9,
  },
  {
    glyph: '++', name: 'concaténation', type: '++',
    lire: '« suivi de »',
    sens: `Met deux listes bout à bout. Associatif, mais **pas** commutatif : l’ordre est précisément ce qu’une liste retient.`,
    exemple: 'reverse (l ++ m) = reverse m ++ reverse l',
    monde: 9,
  },
  {
    glyph: '∎', name: 'fin de preuve', type: '\\qed',
    lire: '« ce qu’il fallait démontrer »',
    sens: `Le petit carré qui clôt une démonstration, héritier du « QED » latin (*quod erat demonstrandum*). Sur ce site, il apparaît quand la fenêtre d’objectif est vide.`,
    exemple: 'Plus aucun objectif. ∎',
    monde: 0,
  },
  {
    glyph: ':=', name: 'définition', type: ':=',
    lire: '« est défini par », « vaut »',
    sens: `Donne une valeur ou une preuve. \`theorem foo : p := preuve\` ; \`have h : q := hpq hp\` ; et dans un \`calc\`, chaque étape est justifiée après \`:=\`. À ne pas confondre avec \`=\`, qui est un énoncé, pas une affectation.`,
    exemple: 'have hq : q := hpq hp',
    monde: 10,
  },
  {
    glyph: '_', name: 'le trou', type: '_',
    lire: '« devine », ou « le précédent »',
    sens: `Un terme à deviner par le contexte. Dans un \`calc\`, il reprend le membre droit de l’étape précédente ; dans un motif, il ignore une composante.`,
    exemple: '_ = c * a + c * b := by rw [mul_comm b c]',
    monde: 3,
  },
];

/** Vocabulaire. Les mots qu'on emploie partout sans les définir. */
export const VOCABULAIRE = [
  {
    terme: 'objectif',
    aussi: 'goal',
    def: `Ce qu’il reste à démontrer, affiché après le \`⊢\`. Une preuve avance en transformant l’objectif jusqu’à le faire disparaître. Il peut y en avoir plusieurs à la fois — une récurrence en crée deux — et les tactiques s’appliquent toujours au **premier**.`,
  },
  {
    terme: 'hypothèse',
    def: `Ce qu’on a le droit d’utiliser : les lignes au-dessus du tourniquet. \`hp : p\` se lit « hp est une preuve de p ». Le nom à gauche est une étiquette qu’on choisit ; ce qui compte est le type à droite.`,
  },
  {
    terme: 'contexte',
    def: `L’ensemble des hypothèses disponibles à un instant donné. Il grossit avec \`intro\`, \`obtain\` ou \`have\`, et se vide jamais tout seul.`,
  },
  {
    terme: 'tactique',
    def: `Un ordre donné à l’assistant de preuve : « réécris ceci », « suppose cela », « fais une récurrence ». Une tactique ne prouve rien par magie : elle transforme l’état de la preuve, et c’est l’enchaînement qui démontre. Le Grimoire les liste toutes.`,
  },
  {
    terme: 'terme',
    def: `Un objet du langage : un nombre, une fonction, **ou une preuve**. C’est l’idée qui surprend au début : dans Lean, une preuve est un objet comme un autre, qui a un type — et son type est l’énoncé qu’elle démontre.`,
  },
  {
    terme: 'axiome',
    def: `Un énoncé admis sans démonstration. Ce jeu en admet peu et les nomme : les deux équations qui définissent \`+\`, l’injectivité de \`succ\`, le fait que zéro n’est le successeur de personne, et — quand on entre en logique classique — le tiers exclu.`,
  },
  {
    terme: 'lemme, théorème',
    def: `Un énoncé démontré. La différence entre les deux est purement sociale : on appelle « lemme » ce qui sert à autre chose, « théorème » ce dont on est fier. Lean, lui, ne fait aucune différence.`,
  },
  {
    terme: 'récurrence',
    aussi: 'induction',
    def: `La seule façon de démontrer quelque chose sur une infinité d’objets construits pas à pas : on le montre pour le cas de base, puis on le montre pour « le suivant » en supposant qu’il vaut pour le précédent. Cette supposition s’appelle l’**hypothèse de récurrence** — \`ih\` dans ce jeu.`,
  },
  {
    terme: 'réécriture',
    def: `Remplacer un morceau d’énoncé par un autre, égal. C’est le geste de base de \`rw\`. Deux pièges : la règle s’applique dans un sens (\`←\` le retourne), et elle remplace *toutes* les occurrences de ce qu’elle a trouvé.`,
  },
  {
    terme: 'unification',
    def: `L’opération par laquelle Lean fait coïncider un motif avec un terme, en devinant ce que valent les variables. C’est ce qui permet à \`rw [add_zero]\` de savoir tout seul de quel \`a + 0\` on parle. Quand elle échoue, c’est souvent qu’il faut donner les arguments à la main.`,
  },
  {
    terme: 'métavariable',
    def: `Un trou dans un terme, en attente d’être rempli — noté \`?a\` dans les messages. Quand Lean se plaint qu’il « n’arrive pas à déterminer ?b », il demande un argument explicite.`,
  },
  {
    terme: 'définitionnel',
    def: `Deux termes sont *définitionnellement* égaux quand le calcul les rend identiques, sans qu’aucun théorème ne soit nécessaire. \`2 + 2\` et \`4\` le sont dans le vrai Lean. Ce jeu bride volontairement ce calcul dans les premiers mondes : sinon il n’y aurait rien à démontrer.`,
  },
  {
    terme: 'constructif',
    def: `Une preuve est constructive quand elle **construit** ce qu’elle annonce : une preuve de \`∃ x, P x\` fournit un x précis, une preuve de \`p ∨ q\` dit lequel des deux. Toute la logique des mondes 5 à 7 est constructive.`,
  },
  {
    terme: 'classique',
    def: `Par opposition : la logique classique ajoute le tiers exclu (\`p ∨ ¬p\`) comme axiome, ce qui permet de raisonner par l’absurde sans rien construire. Mathlib est classique, et Lean sait suivre à la trace les théorèmes qui en dépendent.`,
  },
  {
    terme: 'décidable',
    def: `Un énoncé est décidable s’il existe un algorithme qui répond en temps fini. \`2 + 2 = 4\` l’est ; \`∀ (n : ℕ), P n\` ne l’est pas en général — on ne peut pas essayer tous les entiers. C’est la frontière entre ce que \`decide\` sait faire et le reste.`,
  },
  {
    terme: 'procédure de décision',
    def: `Une tactique qui ne suit pas tes ordres mais **décide** : elle répond oui ou non par un algorithme. \`ring\` pour les identités polynomiales, \`omega\` pour les inégalités linéaires, \`decide\` pour le fini. Chacune est un raisonnement humain qu’on a fini de comprendre et qu’on a rangé.`,
  },
  {
    terme: 'noyau',
    aussi: 'kernel',
    def: `Le petit programme — quelques milliers de lignes — qui revérifie chaque preuve produite par les tactiques. C’est là que toute la confiance se concentre : une tactique peut être boguée, le noyau refusera sa preuve. **Ce site n’en a pas** : c’est sa principale différence avec le vrai Lean.`,
  },
  {
    terme: 'Mathlib',
    def: `La bibliothèque mathématique de Lean : plus de 200 000 théorèmes écrits par une communauté, de l’arithmétique aux schémas. L’essentiel du travail, en pratique, consiste à trouver le lemme qui existe déjà — d’où l’importance de la convention de nommage, et de la tactique \`exact?\`.`,
  },
  {
    terme: 'sorry',
    def: `Le mot qui ferme un objectif sans le prouver. C’est une dette, pas une preuve : Lean compile avec un avertissement bien visible, et \`#print axioms\` la révèle. Utilisé exprès, c’est un excellent outil : on esquisse la structure d’une preuve avec des \`sorry\`, puis on les remplace un par un.`,
  },
  {
    terme: 'Curry–Howard',
    def: `Le théorème qui identifie preuves et programmes : une implication est un type de fonction, une conjonction un couple, une disjonction une somme. Ce n’est pas une analogie mais une correspondance exacte, et c’est sur elle que Lean est bâti — un seul langage sert à programmer et à démontrer.`,
  },
  {
    terme: 'morphisme',
    def: `Une fonction qui respecte la structure : \`length (l ++ m) = length l + length m\` dit que \`length\` transforme la concaténation en addition. Dès qu’on tient un morphisme, tout ce qu’on sait de l’arrivée se rapatrie au départ — c’est l’une des idées les plus rentables des mathématiques.`,
  },
  {
    terme: 'semi-anneau',
    def: `Une structure avec une addition et une multiplication qui se comportent bien : associatives, commutatives, distributives, avec des neutres. ℕ en est un — et tu le démontres axiome par axiome dans les mondes 2 à 4. C’est exactement ce que la tactique \`ring\` sait exploiter.`,
  },
];
