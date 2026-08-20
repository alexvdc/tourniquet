// Un DOM minimal, juste assez pour rendre les vues hors navigateur. Ça n'est
// pas jsdom : ça n'en a pas l'ambition. Le but est d'attraper les erreurs
// d'exécution (import cassé, propriété absente, null déréférencé) dans les
// tests, sans ajouter de dépendance au projet.

const byId = new Map();

class Node {
  constructor(nodeType) {
    this.nodeType = nodeType;
    this.childNodes = [];
    this.parentNode = null;
  }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1); }
  append(...nodes) {
    for (const n of nodes.flat(6)) {
      if (n === null || n === undefined) continue;
      const node = typeof n === 'object' && n.nodeType ? n : new Text(String(n));
      if (node.nodeType === 11) { this.append(...node.childNodes); continue; }
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }
  replaceChildren(...nodes) {
    this.childNodes = [];
    if (nodes.length) this.append(...nodes);
  }
  remove() {
    const p = this.parentNode;
    if (!p) return;
    p.childNodes = p.childNodes.filter((c) => c !== this);
    this.parentNode = null;
  }
  get textContent() {
    return this.childNodes.map((c) => c.textContent).join('');
  }
  set textContent(v) {
    this.childNodes = [];
    if (v !== '' && v !== null && v !== undefined) this.append(new Text(String(v)));
  }
}

class Text extends Node {
  constructor(text) { super(3); this._text = String(text); }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
}

class Fragment extends Node {
  constructor() { super(11); }
}

class Element extends Node {
  constructor(tag) {
    super(1);
    this.tagName = tag.toUpperCase();
    this.attributes = {};
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.listeners = {};
    this.value = '';
    this.rows = 2;
    this.disabled = false;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this._html = null;
    this._class = '';
  }
  get className() { return this._class; }
  set className(v) { this._class = String(v ?? ''); }
  get classList() {
    const self = this;
    return {
      add: (...cs) => { self._class = [...new Set([...self._class.split(' ').filter(Boolean), ...cs])].join(' '); },
      remove: (...cs) => { self._class = self._class.split(' ').filter((c) => c && !cs.includes(c)).join(' '); },
      contains: (c) => self._class.split(' ').includes(c),
    };
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === 'id') byId.set(String(v), this);
    if (k === 'class') this._class = String(v);
  }
  getAttribute(k) { return this.attributes[k] ?? null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return k in this.attributes; }
  set innerHTML(html) {
    this._html = String(html);
    // On ne parse pas : le contenu HTML est du texte pour ce stub.
    this.childNodes = [new Text(stripTags(this._html))];
  }
  get innerHTML() { return this._html ?? this.textContent; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== fn);
  }
  /** Déclenche un évènement — utilisé par les tests pour simuler la frappe. */
  fire(type, event = {}) {
    for (const fn of this.listeners[type] ?? []) fn({ type, target: this, currentTarget: this, preventDefault() {}, ...event });
  }
  focus() {}
  blur() {}
  select() {}
  scrollTo() {}
  setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b ?? a; }
  setRangeText(text, start = this.selectionStart, end = this.selectionEnd) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    this.selectionStart = this.selectionEnd = start + text.length;
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  closest() { return null; }
  /** Tout le texte rendu, pour les assertions. */
  get flatText() { return this.textContent; }
}

const stripTags = (html) => html.replace(/<[^>]*>/g, '');

function createElement(tag) { return new Element(tag); }

export function installDom() {
  const store = new Map();

  const document = {
    createElement,
    createTextNode: (t) => new Text(t),
    createDocumentFragment: () => new Fragment(),
    createRange: () => ({
      createContextualFragment(html) {
        const f = new Fragment();
        f.append(new Text(stripTags(html)));
        return f;
      },
    }),
    getElementById: (id) => byId.get(id) ?? null,
    querySelectorAll: () => [],
    querySelector: () => null,
    body: createElement('body'),
  };

  const mk = (id, tag = 'div') => {
    const el = createElement(tag);
    el.setAttribute('id', id);
    return el;
  };
  const app = mk('app');
  document.body.append(app, mk('toaster'), mk('rank-name', 'span'),
    mk('xp-bar', 'progress'), mk('xp-count', 'span'));

  const window = {
    document,
    location: { hash: '#/' },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {},
    confirm: () => true,
    prompt: () => null,
    getComputedStyle: () => ({}),
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
  };

  globalThis.window = window;
  globalThis.document = document;
  globalThis.localStorage = window.localStorage;
  // `navigator` n'a qu'un accesseur en lecture sous Node : on le redéfinit.
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async () => {} } },
  });
  globalThis.location = window.location;
  globalThis.HTMLElement = Element;

  return { window, document, app, byId };
}

/** Premier descendant satisfaisant le prédicat (parcours en profondeur). */
export function find(root, pred) {
  for (const child of root.childNodes) {
    if (child.nodeType === 1) {
      if (pred(child)) return child;
      const hit = find(child, pred);
      if (hit) return hit;
    }
  }
  return null;
}

export const findByTag = (root, tag) =>
  find(root, (el) => el.tagName === tag.toUpperCase());

export const findByClass = (root, cls) =>
  find(root, (el) => el.className.split(' ').includes(cls));

export { Element, Text, Fragment };
