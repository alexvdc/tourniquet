// Petits utilitaires de rendu. Pas de framework : le DOM suffit largement pour
// cinq vues, et ça garde le site déployable en copiant un dossier.

/**
 * h('div.classe', {attrs}, ...enfants)
 * Le tag accepte `tag.classe1.classe2`.
 */
export function h(spec, props = null, ...children) {
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props && (props.nodeType || typeof props === 'string')) {
    children.unshift(props);
    props = null;
  }
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = el.className ? `${el.className} ${v}` : v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(4)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const frag = (...children) => {
  const f = document.createDocumentFragment();
  for (const c of children.flat(4)) if (c) f.append(c.nodeType ? c : document.createTextNode(String(c)));
  return f;
};

export function mount(el, ...children) {
  el.replaceChildren();
  el.append(frag(...children));
  return el;
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Rendu d'un sous-ensemble de Markdown, suffisant pour les consignes :
 * titres ###, listes, blocs ``` , **gras**, *italique*, `code`, [lien](url),
 * et citations >.
 */
export function md(src) {
  const lines = String(src ?? '').split('\n');
  const out = [];
  let i = 0;

  const inline = (t) => escapeHtml(t)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    if (/^```/.test(line.trim())) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const head = line.match(/^(#{2,4})\s+(.*)$/);
    if (head) { out.push(`<h3>${inline(head[2])}</h3>`); i++; continue; }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    const buf = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^```/.test(lines[i].trim())
           && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])
           && !/^(#{2,4})\s+/.test(lines[i]) && !/^\s*>\s?/.test(lines[i])) {
      buf.push(lines[i++]);
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

/** Balise le code d'une seule ligne, en mono, sans HTML. */
export const codeSpan = (text) => h('code', { text });

/* ─────────────────────────────────── abréviations d'entrée à la Lean */

export const ABBREVS = [
  ['\\to', '→'], ['\\r', '→'], ['\\imp', '→'],
  ['\\l', '←'], ['\\gets', '←'],
  ['\\iff', '↔'], ['\\lr', '↔'],
  ['\\all', '∀'], ['\\forall', '∀'],
  ['\\ex', '∃'], ['\\exists', '∃'],
  ['\\and', '∧'], ['\\wedge', '∧'],
  ['\\or', '∨'], ['\\vee', '∨'],
  ['\\not', '¬'], ['\\neg', '¬'],
  ['\\le', '≤'], ['\\ge', '≥'], ['\\ne', '≠'],
  ['\\nat', 'ℕ'], ['\\N', 'ℕ'], ['\\Z', 'ℤ'], ['\\Q', 'ℚ'], ['\\R', 'ℝ'],
  ['\\<', '⟨'], ['\\>', '⟩'],
  ['\\lam', 'λ'], ['\\fun', 'λ'],
  ['\\qed', '∎'], ['\\vdash', '⊢'],
  ['\\o', '∘'], ['\\cdot', '·'],
  ['\\alpha', 'α'], ['\\beta', 'β'], ['\\gamma', 'γ'], ['\\eps', 'ε'], ['\\delta', 'δ'],
];

const BY_LENGTH = [...ABBREVS].sort((a, b) => b[0].length - a[0].length);

/**
 * Remplace l'abréviation qui précède le curseur, comme le fait l'extension
 * VS Code de Lean. Renvoie null si rien ne correspond.
 */
export function expandAbbrev(value, caret) {
  const before = value.slice(0, caret);
  for (const [seq, out] of BY_LENGTH) {
    if (before.endsWith(seq)) {
      const start = caret - seq.length;
      return {
        value: value.slice(0, start) + out + value.slice(caret),
        caret: start + out.length,
      };
    }
  }
  return null;
}

/* ─────────────────────────────────── notifications */

export function toast(message, kind = '') {
  const host = document.getElementById('toaster');
  if (!host) return;
  const el = h('div.toast', { class: kind, html: md(message).replace(/^<p>|<\/p>$/g, '') });
  host.append(el);
  setTimeout(() => el.remove(), 4200);
}

/** Copie dans le presse-papier, avec repli si l'API est indisponible. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { text });
    ta.setAttribute('readonly', '');
    ta.classList.add('visually-hidden');
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand?.('copy') ?? false;
    ta.remove();
    return ok;
  }
}

/** URL du playground Lean 4 officiel, code inclus. */
export const playgroundUrl = (code) =>
  `https://live.lean-lang.org/#code=${encodeURIComponent(code)}`;
