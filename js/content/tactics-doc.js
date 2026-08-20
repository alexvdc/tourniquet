// Documentation des tactiques. Le Grimoire l'affiche, et chaque entrée dit
// aussi ce que le moteur du site ne fait *pas* — mieux vaut le savoir avant
// d'ouvrir le vrai Lean.

export const TACTIC_DOCS = [
  {
    name: 'rfl',
    group: 'Fondations',
    world: 0,
    syntax: ['rfl'],
    doc: `Clôt un objectif de la forme \`a = a\`, quand les deux membres sont *le même terme*. Dans les mondes de Peano, « le même » veut dire syntaxiquement identique : \`2 + 2\` et \`4\` ne le sont pas. À partir du monde 7, le moteur s’autorise à calculer sur les chiffres, et \`rfl\` accepte alors les égalités numériques.

Dans le vrai Lean, \`rfl\` teste l’égalité *définitionnelle*, ce qui inclut le calcul : \`2 + 2 = 4\` s’y ferme d’un coup. Ce jeu bride volontairement cette capacité au début, sinon le monde 1 n’aurait rien à enseigner.`,
  },
  {
    name: 'exact',
    group: 'Fondations',
    world: 0,
    syntax: ['exact h', 'exact hqr (hpq hp)', 'exact ⟨hp, hq⟩', 'exact h 3'],
    doc: `« L’objectif est exactement ce terme-là. » On donne la preuve, pas une piste : \`exact\` ne cherche rien.

C’est la tactique qui rappelle le mieux ce qu’est Lean : une preuve est un terme, un terme a un type, et le type d’une preuve est l’énoncé qu’elle démontre. \`exact\` vérifie simplement que le type du terme donné est celui de l’objectif.`,
  },
  {
    name: 'rw',
    group: 'Réécriture',
    world: 0,
    syntax: ['rw [add_zero]', 'rw [h1, h2]', 'rw [← two_eq_succ_one]', 'rw [add_comm b c]', 'rw [le_iff_exists_add] at h'],
    doc: `La tactique la plus utilisée du jeu. \`rw [h]\` cherche le membre gauche de l’égalité \`h\` dans l’objectif et le remplace par le membre droit.

Trois détails qui expliquent 90 % des surprises :

- **Sens.** \`←\` retourne la règle. \`rw [← h]\` remplace le membre droit par le gauche.
- **Occurrences.** Lean instancie la règle sur la *première* occurrence rencontrée, puis remplace *toutes* les occurrences de cette instance. Réécrire \`2\` change les deux \`2\` d’un coup.
- **Cible.** \`at h\` réécrit dans une hypothèse au lieu de l’objectif.

Et un cadeau : après chaque réécriture, \`rw\` tente \`rfl\`. Si les deux membres deviennent identiques, l’objectif se ferme sans qu’on l’écrive.

Quand \`rw\` part dans la mauvaise direction, donne-lui ses arguments : \`rw [add_comm b c]\` au lieu de \`rw [add_comm]\`.`,
  },
  {
    name: 'intro',
    group: 'Structure',
    world: 5,
    syntax: ['intro hp', 'intro a b h', 'intros'],
    doc: `Pour prouver \`p → q\`, on suppose \`p\` : \`intro hp\` déplace l’hypothèse de gauche dans le contexte et la nomme.

La même tactique introduit un \`∀\` — « soit \`n\` un entier quelconque » — parce que dans Lean, une implication *est* un ∀ dont la variable ne sert pas. Elle fonctionne aussi sur \`¬p\`, qui n’est qu’une notation pour \`p → False\`.

\`intros\` introduit tout ce qui peut l’être, sans nommer. Pratique, mais les noms générés rendent la preuve illisible : à éviter dans du code qu’on relira.`,
  },
  {
    name: 'apply',
    group: 'Structure',
    world: 5,
    syntax: ['apply hqr', 'apply le_trans a b (succ b)'],
    doc: `Le raisonnement à reculons. Si l’objectif est \`r\` et que \`h : q → r\`, alors \`apply h\` remplace l’objectif par \`q\` : « il me suffit de prouver \`q\` ».

Avec un lemme à plusieurs hypothèses, \`apply\` ouvre autant d’objectifs, dans l’ordre. Tes tactiques suivantes s’adressent au premier.

Limite volontaire de ce moteur : si une variable du lemme n’apparaît pas dans la conclusion — le maillon du milieu de \`le_trans\`, typiquement — il refuse de deviner et te demande de la donner. Le vrai Lean créerait une métavariable et attendrait plus tard ; le réflexe de la remplir à la main reste bon.`,
  },
  {
    name: 'induction',
    group: 'Récurrence',
    world: 2,
    syntax: ['induction n', 'induction n with k ih'],
    doc: `La récurrence sur ℕ. Coupe l’objectif en deux : le cas \`0\`, puis le cas \`succ k\` où l’on dispose de l’hypothèse de récurrence — nommée \`ih\` par défaut.

Tout l’art est de choisir la bonne variable. L’addition et la multiplication sont définies par récursion sur leur *deuxième* argument : c’est presque toujours celle-là qu’il faut ouvrir.

Dans le vrai Lean 4, la syntaxe est structurée par cas :

\`\`\`
induction n with
| zero => simp
| succ k ih => rw [add_succ, ih]
\`\`\`

Ici les deux objectifs s’enchaînent simplement dans la liste, comme dans les anciennes versions.`,
  },
  {
    name: 'cases',
    group: 'Structure',
    world: 6,
    syntax: ['cases h', 'cases h with hp hq', 'cases h with n hn'],
    doc: `Décompose une hypothèse selon sa structure :

- \`h : p ∧ q\` → deux hypothèses, en un seul objectif ;
- \`h : p ∨ q\` → un seul type d’hypothèse, mais **deux objectifs** ;
- \`h : ∃ x, p x\` → le témoin et sa propriété ;
- \`h : p ↔ q\` → les deux implications ;
- \`n : ℕ\` → le cas \`0\` et le cas \`succ k\`, sans hypothèse de récurrence ;
- \`h : False\` → plus rien à prouver.

La règle générale : un « et » se lit, un « ou » se traite deux fois. Dans Mathlib on écrirait plutôt \`obtain ⟨hp, hq⟩ := h\`, ou \`rcases\`, qui savent décomposer en profondeur.`,
  },
  {
    name: 'constructor',
    group: 'Structure',
    world: 6,
    syntax: ['constructor'],
    doc: `L’inverse de \`cases\`, côté objectif. Un \`p ∧ q\` devient deux objectifs \`p\` et \`q\` ; un \`p ↔ q\` devient les deux implications ; \`True\` se ferme.

Pour un \`∧\`, le raccourci \`exact ⟨hp, hq⟩\` est souvent plus lisible. Pour un \`∃\`, ce n’est pas \`constructor\` mais \`use\`.`,
  },
  {
    name: 'left / right',
    key: 'left',
    group: 'Structure',
    world: 6,
    syntax: ['left', 'right'],
    doc: `Choisit un côté d’un \`∨\` dans l’objectif. Prouver une disjonction, en logique constructive, ce n’est pas montrer qu’« au moins l’une est vraie » : c’est dire **laquelle** et la prouver.

D’où le fait que \`p ∨ ¬p\` ne soit pas démontrable sans axiome — il faudrait décider, pour tout énoncé, s’il est vrai. Le tiers exclu (\`em\` dans le Grimoire) est exactement l’axiome qui l’autorise.`,
  },
  {
    name: 'use',
    group: 'Quantificateurs',
    world: 7,
    syntax: ['use 3', 'use a', 'use x + y'],
    doc: `Fournit le témoin d’un \`∃\`. L’objectif \`∃ x, p x\` devient \`p e\` pour le \`e\` que tu donnes.

Comme dans Mathlib, \`use\` tente ensuite de conclure tout seul si ce qui reste est immédiat — une égalité vraie par calcul, ou une hypothèse déjà présente. Ne t’étonne pas de voir l’objectif disparaître d’un coup.`,
  },
  {
    name: 'exfalso',
    group: 'Négation',
    world: 6,
    syntax: ['exfalso'],
    doc: `Remplace l’objectif par \`False\`. Utile quand tu sais que tu vas conclure par l’absurde : de \`False\` on déduit n’importe quoi, donc prouver \`False\` prouve tout.

C’est \`False.elim\` déguisé en tactique.`,
  },
  {
    name: 'contradiction',
    group: 'Négation',
    world: 6,
    syntax: ['contradiction'],
    doc: `Cherche seule une contradiction dans le contexte : un \`False\`, une paire \`p\` et \`¬p\`, une égalité entre deux chiffres différents. Si elle en trouve une, l’objectif tombe.`,
  },
  {
    name: 'trivial',
    group: 'Fondations',
    world: 6,
    syntax: ['trivial'],
    doc: `Le fourre-tout des cas immédiats : \`True\`, une égalité réflexive, ou une hypothèse qui est exactement l’objectif.`,
  },
  {
    name: 'have',
    group: 'Structure',
    world: 9,
    syntax: ['have hq : q := hpq hp'],
    doc: `Avance **en avant** au lieu de reculer. \`have h : T := preuve\` établit un résultat intermédiaire, le nomme, et l’ajoute au contexte.

C’est le geste qui rend une preuve lisible par un humain, et le plus regretté quand on relit son propre code six mois plus tard. Sa symétrique \`suffices\` réduit l’objectif à un énoncé plus simple.`,
  },
  {
    name: 'revert',
    group: 'Structure',
    world: 9,
    syntax: ['revert h'],
    doc: `L’inverse de \`intro\` : renvoie une hypothèse du contexte dans l’objectif, sous forme d’implication. Sert surtout à généraliser avant une récurrence, quand une hypothèse parle de la variable sur laquelle on veut raisonner.`,
  },
  {
    name: 'unfold',
    group: 'Réécriture',
    world: 9,
    syntax: ['unfold Nat.add', 'unfold Nat.le at h'],
    doc: `Remplace une définition par ses équations. Dans ce jeu : \`Nat.add\`, \`Nat.mul\`, \`Nat.pow\`, \`Nat.le\`, ainsi que \`Not\` et \`Ne\` qui se déplient toujours.

Dans le vrai Lean, \`unfold\`, \`simp only [Nat.add]\` et \`show\` font des choses subtilement différentes ; l’usage courant préfère les lemmes d’équation aux dépliages sauvages.`,
  },
  {
    name: 'simp',
    group: 'Automatisation',
    world: 9,
    syntax: ['simp', 'simp [mul_one]', 'simp only [add_zero]', 'simp at h'],
    doc: `Applique en boucle toutes les règles marquées \`@[simp]\` jusqu’à ce que plus rien ne bouge. C’est la tactique la plus utilisée de Mathlib.

Elle nettoie, elle ne pense pas : les neutres, les projections, le bruit administratif. Si \`simp\` ferme ton objectif principal, c’est souvent que l’objectif était administratif.

Bonne pratique : \`simp only [...]\` dans du code qu’on garde. \`simp\` tout court dépend de l’ensemble des règles du moment, et une mise à jour de la bibliothèque peut casser la preuve.`,
  },
  {
    name: 'ring',
    group: 'Automatisation',
    world: 4,
    syntax: ['ring'],
    doc: `Décide les identités valables dans tout semi-anneau commutatif : elle normalise les deux membres en polynômes et compare.

Elle ne connaît pas les nombres, elle connaît les axiomes — associativité, commutativité, distributivité, neutres — ceux que tu démontres un par un dans les mondes 2 à 4. Toute automatisation de Mathlib est un raisonnement humain qu’on a fini de comprendre.

Dans le vrai Lean, \`ring\` produit un terme de preuve que le noyau revérifie. Ici, c’est ma normalisation polynomiale qui tranche, sans certificat : c’est la principale différence de nature entre ce jeu et l’outil réel.`,
  },
  {
    name: 'norm_num',
    group: 'Automatisation',
    world: 7,
    syntax: ['norm_num', 'decide'],
    doc: `Calcule. Évalue les expressions numériques closes, compare, et clôt l’objectif — ou échoue en disant que c’est faux. Gère aussi les inégalités entre chiffres.

\`decide\` est un cousin : elle s’applique aux énoncés *décidables*, c’est-à-dire ceux pour lesquels un algorithme peut répondre en temps fini. Dans Mathlib, \`omega\` (arithmétique linéaire entière) et \`linarith\` (inégalités linéaires) sont les deux autres à connaître absolument.`,
  },
  {
    name: 'repeat',
    group: 'Automatisation',
    world: 9,
    syntax: ['repeat rw [add_succ]'],
    doc: `Applique une tactique tant qu’elle réussit. Commode pour éplucher une pile de \`succ\`, mais elle rend les preuves fragiles : si la bibliothèque change, le nombre d’itérations change avec elle.`,
  },
  {
    name: 'sorry',
    group: 'Automatisation',
    world: 9,
    syntax: ['sorry'],
    doc: `Ferme n’importe quel objectif sans le prouver. C’est une dette, pas une preuve : le niveau ne compte pas, et dans le vrai Lean le fichier compile avec un avertissement bien visible.

Utilisée correctement, c’est un excellent outil de travail : on écrit le squelette d’une preuve avec des \`sorry\` partout, on vérifie que la structure tient, puis on les remplace un par un. \`#print axioms mon_theoreme\` dit ensuite si un \`sorry\` traîne encore.`,
  },
];

/** Notes de syntaxe : ce qu'il faut savoir lire avant d'ouvrir un fichier Lean. */
export const SYNTAX_NOTES = [
  {
    title: 'Prop et Type',
    body: `\`Prop\` est l’univers des énoncés, \`Type\` celui des données. \`2 + 2 = 4\` est un \`Prop\` ; \`ℕ\` est un \`Type\`. Un élément d’un \`Prop\` est une **preuve** de cet énoncé ; un élément de \`ℕ\` est un entier. Même mécanisme, deux usages — c’est ce qui permet à Lean d’être à la fois un langage de programmation et un langage de démonstration.`,
  },
  {
    title: 'Le type Π, et pourquoi tout est une fonction',
    body: `\`p → q\`, \`∀ (n : ℕ), P n\` et \`ℕ → ℕ\` sont la même construction : un type Π. Une preuve de \`∀ n, P n\` est une fonction qui prend un entier et rend une preuve. Une preuve de \`p → q\` est le cas où la variable ne sert pas. D’où le fait que \`intro\` et \`apply\` marchent indifféremment sur les trois.`,
  },
  {
    title: 'Arguments explicites, implicites, instances',
    body: `\`(a : ℕ)\` est un argument explicite : on le donne. \`{a : ℕ}\` est implicite : Lean le devine par unification. \`[Group G]\` est un argument d’instance : Lean le cherche dans sa base de structures algébriques. Comprendre quelle sorte d’argument attend un lemme évite les trois quarts des messages d’erreur incompréhensibles.`,
  },
  {
    title: 'Mode terme et mode tactique',
    body: `\`:= by\` ouvre le mode tactique ; sans \`by\`, on écrit directement le terme de preuve. Les deux sont interchangeables : \`fun hp => hqr (hpq hp)\` et \`intro hp; exact hqr (hpq hp)\` produisent exactement le même objet. Les tactiques ne sont qu’un moyen confortable de fabriquer un terme.`,
  },
  {
    title: 'Les noms de Mathlib',
    body: `Les noms se lisent comme des phrases : \`add_comm\` = « add is commutative », \`mul_le_mul_left\`, \`Nat.succ_ne_zero\`. La convention décrit la **forme de l’énoncé**, dans l’ordre de lecture. Une fois la grammaire attrapée, on devine le nom d’un lemme avant de le chercher — et \`exact?\` trouve le reste.`,
  },
  {
    title: 'Ce que ce moteur ne fait pas',
    body: `Pas de noyau, donc pas de terme de preuve vérifié. Unification du premier ordre seulement : les motifs d’ordre supérieur (\`?f x\`) ne s’unifient pas. Pas de classes de types, pas d’univers, pas de structures, un seul type de données (ℕ) et les propositions. \`ring\` et \`norm_num\` décident sans produire de certificat. Tout le reste — la façon de lire un objectif, le rôle des tactiques, la discipline des noms — se transfère tel quel au vrai Lean.`,
  },
];
