// Routeur et coquille. Un routeur à fragment (#/…) : le site reste un dossier
// de fichiers statiques, sans règle de réécriture côté serveur.

import { renderAtlas, renderFeats } from './ui/atlas.js';
import { renderLevel } from './ui/level.js';
import { renderGrimoire, renderSandbox } from './ui/grimoire.js';
import { renderLexique } from './ui/lexique.js';
import { TOTAL_XP, rankFor } from './content/index.js';
import * as store from './state.js';

const app = document.getElementById('app');
let teardown = () => {};

const ROUTES = [
  { re: /^#?\/?$/, name: 'atlas', run: (host) => renderAtlas(host) },
  { re: /^#\/niveau\/(.+)$/, name: 'level', run: (host, m) => renderLevel(host, decodeURIComponent(m[1])) },
  { re: /^#\/lexique$/, name: 'lexique', run: (host) => renderLexique(host) },
  { re: /^#\/grimoire$/, name: 'grimoire', run: (host) => renderGrimoire(host) },
  { re: /^#\/bac-a-sable$/, name: 'sandbox', run: (host) => renderSandbox(host) },
  { re: /^#\/hauts-faits$/, name: 'feats', run: (host) => renderFeats(host) },
];

function route() {
  const hash = location.hash || '#/';
  const found = ROUTES.find((r) => r.re.test(hash));

  teardown();
  teardown = () => {};

  if (!found) {
    app.replaceChildren();
    app.append(document.createRange().createContextualFragment(
      '<div class="view"><h1 class="title-display">Page introuvable</h1>'
      + '<p class="lede">Ce chemin ne mène nulle part. '
      + '<a href="#/">Retour à l’Atlas</a>.</p></div>'));
    markNav(null);
    return;
  }

  const cleanup = found.run(app, hash.match(found.re));
  if (typeof cleanup === 'function') teardown = cleanup;
  markNav(found.name === 'level' ? 'atlas' : found.name);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function markNav(name) {
  for (const link of document.querySelectorAll('.mainnav__link')) {
    if (link.dataset.route === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function paintStanding(p = store.progress()) {
  const rank = rankFor(p.xp);
  const nameEl = document.getElementById('rank-name');
  const barEl = document.getElementById('xp-bar');
  const xpEl = document.getElementById('xp-count');
  if (nameEl) nameEl.textContent = rank.name;
  if (barEl) { barEl.value = p.xp; barEl.max = TOTAL_XP; }
  if (xpEl) xpEl.textContent = `${p.xp} / ${TOTAL_XP} XP`;
}

store.subscribe(paintStanding);
window.addEventListener('hashchange', route);

paintStanding();
route();
