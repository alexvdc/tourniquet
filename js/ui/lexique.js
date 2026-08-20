// Le Lexique : les symboles et les mots. Volontairement séparé du Grimoire —
// celui-ci répond à « comment m'en servir ? », celui-là à « qu'est-ce que ce
// signe ? », et ce ne sont pas les mêmes moments.

import { h, mount, md, mdInline } from './dom.js';
import { SYMBOLES, VOCABULAIRE } from '../content/lexique.js';
import { LEVELS } from '../content/index.js';

const firstLevelOfWorld = (num) => LEVELS.find((l) => l.world === num);

function symbolCard(s) {
  const level = firstLevelOfWorld(s.monde);
  return h('article.glyphcard',
    h('div.glyphcard__face',
      h('span.glyphcard__glyph', { text: s.glyph }),
      h('span.glyphcard__type', { text: s.type })),
    h('div.glyphcard__body',
      h('h3.glyphcard__name', { text: s.name }),
      h('p.glyphcard__lire', { text: s.lire }),
      h('div.entry__doc', { html: md(s.sens) }),
      h('pre.glyphcard__ex', { text: s.exemple }),
      level
        ? h('a.glyphcard__link', { href: `#/niveau/${level.id}` },
          `On s’en sert au monde ${s.monde} →`)
        : null));
}

const wordCard = (v) => h('article.entry',
  h('div.entry__head',
    h('span.entry__name', { text: v.terme }),
    v.aussi ? h('span.chip__note', { text: `en anglais : ${v.aussi}` }) : null),
  h('div.entry__doc', { html: md(v.def) }));

export function renderLexique(host) {
  const query = h('input', {
    type: 'search',
    placeholder: '∀, tourniquet, récurrence, noyau…',
    'aria-label': 'Rechercher dans le lexique',
  });
  const results = h('div.view');

  function draw() {
    const q = query.value.trim().toLowerCase();
    const hit = (...fields) => !q || fields.filter(Boolean).join(' ').toLowerCase().includes(q);

    const symboles = SYMBOLES.filter((s) => hit(s.glyph, s.name, s.type, s.lire, s.sens, s.exemple));
    const mots = VOCABULAIRE.filter((v) => hit(v.terme, v.aussi, v.def));

    mount(results,
      h('section',
        h('span.eyebrow', { text: `${symboles.length} signe${symboles.length > 1 ? 's' : ''}` }),
        h('h2.title-section', 'Les symboles'),
        h('p.lede', 'Chaque signe, comment le taper, ce qu’il veut dire, et où tu le rencontreras.'),
        symboles.length
          ? h('div.glyphgrid', ...symboles.map(symbolCard))
          : h('p.lede', 'Aucun symbole ne correspond.')),
      h('section',
        h('span.eyebrow', { text: `${mots.length} mot${mots.length > 1 ? 's' : ''}` }),
        h('h2.title-section', 'Le vocabulaire'),
        h('p.lede', 'Les mots que ce site emploie partout — et que personne ne définit jamais.'),
        mots.length
          ? h('div.entrylist', ...mots.map(wordCard))
          : h('p.lede', 'Aucun mot ne correspond.')));
  }

  query.addEventListener('input', draw);

  mount(host, h('div.view',
    h('div',
      h('span.eyebrow', 'Pour commencer'),
      h('h1.title-display', 'Lexique'),
      h('p.lede', { html: mdInline('Personne ne naît en sachant lire `∀`. Cette page est là pour être ouverte à côté d’un niveau, pas lue d’un bout à l’autre — et le [Grimoire](#/grimoire) prend le relais quand il s’agit de *s’en servir*.') })),
    h('div.searchbar', h('span.searchbar__glyph', '⌕'), query),
    results));

  draw();
  return () => {};
}
