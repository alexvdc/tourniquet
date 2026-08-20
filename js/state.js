// Progression, stockée en local. Aucun compte, aucun serveur : le site est
// entièrement statique, la sauvegarde vit dans le navigateur.

const KEY = 'tourniquet.v1';

const EMPTY = { done: [], xp: 0, hinted: [], revealed: [], drafts: {}, updated: null };

const listeners = new Set();
let cache = null;

function read() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

function write(next) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...next, updated: new Date().toISOString() }));
  } catch {
    /* mode privé, quota plein : le jeu reste jouable, il oublie juste. */
  }
  for (const fn of listeners) fn(progress());
}

/** Vue pratique de la progression (les listes deviennent des Set). */
export function progress() {
  const raw = read();
  return {
    done: new Set(raw.done),
    hinted: raw.hinted,
    revealed: raw.revealed,
    xp: raw.xp,
    drafts: raw.drafts,
  };
}

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// Deux onglets ouverts sur le site écrivaient chacun depuis leur cache mémoire :
// le dernier à sauvegarder effaçait les preuves de l'autre. On écoute donc les
// modifications venues d'ailleurs pour invalider le cache.
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== KEY) return;
    cache = null;
    for (const fn of listeners) fn(progress());
  });
}

export const isDone = (id) => read().done.includes(id);

/** @returns {boolean} vrai si c'est la première résolution (XP gagnée) */
export function markSolved(id, xp) {
  const raw = read();
  if (raw.done.includes(id)) return false;
  write({ ...raw, done: [...raw.done, id], xp: raw.xp + xp });
  return true;
}

export function markHinted(id) {
  const raw = read();
  if (raw.hinted.includes(id)) return;
  write({ ...raw, hinted: [...raw.hinted, id] });
}

export function markRevealed(id) {
  const raw = read();
  if (raw.revealed.includes(id)) return;
  write({ ...raw, revealed: [...raw.revealed, id], hinted: [...new Set([...raw.hinted, id])] });
}

export function saveDraft(id, code) {
  const raw = read();
  if (raw.drafts[id] === code) return;
  write({ ...raw, drafts: { ...raw.drafts, [id]: code } });
}

export const draftFor = (id) => read().drafts[id] ?? '';

export function resetAll() {
  write({ ...EMPTY });
}

/** Export/import : pour ne pas perdre 68 preuves en changeant de navigateur. */
export const exportSave = () => JSON.stringify(read(), null, 2);

export function importSave(json) {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.done)) throw new Error('sauvegarde illisible');
  write({ ...EMPTY, ...parsed });
}
