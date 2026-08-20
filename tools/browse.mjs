// Vérification du rendu dans un vrai Chrome, sans dépendance : Node 22 fournit
// WebSocket et fetch, Chrome fournit tout le reste. Sert à regarder le site pour
// de vrai — captures, débordements, contrastes, console — au lieu de raisonner
// sur le CSS à l'aveugle.
//
//   node tools/browse.mjs audit http://localhost:8123/             --width 360
//   node tools/browse.mjs shoot http://localhost:8123/#/niveau/1.7 --width 1440
//   node tools/browse.mjs play  1.7 --type "rw [four_eq_succ_three]"
//
// Options : --width --height --dpr --out --wait --base --profile
//
// Deux pièges coûteux, documentés ici pour ne pas les repayer :
//   • il faut créer son onglet (Target.createTarget) et s'y attacher. Lister les
//     cibles attrape la page d'arrière-plan d'une extension composant de Chrome,
//     qui n'a aucune surface à peindre : Page.captureScreenshot ne rend alors
//     jamais la main, et toute navigation http finit en net::ERR_ABORTED ;
//   • sous Windows, une fenêtre ne descend pas sous ~500 px. Pour mesurer et
//     photographier un écran de téléphone, c'est Emulation.setDeviceMetricsOverride
//     qui fixe la largeur, pas --window-size.

import { spawn } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/* ─────────────────────────────────────────────── arguments */

const [, , command, target, ...rest] = process.argv;
const flags = {};
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith('--')) continue;
  const key = rest[i].slice(2);
  const next = rest[i + 1];
  if (next && !next.startsWith('--')) { flags[key] = next; i++; } else flags[key] = true;
}

if (!command || !target) {
  console.error(`usage :
  node tools/browse.mjs audit <url> [--width 360]
  node tools/browse.mjs shoot <url> [--width 1440] [--out fichier.png]
  node tools/browse.mjs play  <id de niveau> --type "tactique"`);
  process.exit(2);
}

const width = Number(flags.width ?? 1440);
const height = Number(flags.height ?? 900);
const dpr = Number(flags.dpr ?? 1);
const waitMs = Number(flags.wait ?? 1500);
const base = flags.base ?? 'http://localhost:8123';
const profile = flags.profile ?? join(process.env.TEMP ?? '/tmp', 'tourniquet-chrome-profile');
const url = command === 'play' ? `${base}/#/niveau/${target}` : target;
const outPath = flags.out
  ?? join('shots', `${command}-${String(target).replace(/\W+/g, '-')}-${width}.png`);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA ?? ''}/Google/Chrome/Application/chrome.exe`,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chromePath() {
  for (const p of CHROME_CANDIDATES) {
    try { await access(p); return p; } catch { /* suivant */ }
  }
  throw new Error('Chrome introuvable — renseigne CHROME_PATH.');
}

const COMMON_ARGS = [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--hide-scrollbars', '--mute-audio',
  '--disable-features=Translate,MediaRouter',
];

/* ─────────────────────────────────────────────── protocole DevTools */

// Client minimal. On se connecte au point d'entrée « navigateur » et on crée
// notre propre onglet : lister les cibles est un piège (les extensions composant
// de Chrome en exposent aussi, et le type de l'onglet initial varie).
// `sessionId` route les commandes vers l'onglet attaché.
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    this.sessionId = null;
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)); }
      catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.handlers.get(msg.method) ?? []) fn(msg.params);
      }
    });
  }
  send(method, params = {}, { browser = false } = {}) {
    const id = ++this.id;
    const frame = { id, method, params };
    if (this.sessionId && !browser) frame.sessionId = this.sessionId;
    this.ws.send(JSON.stringify(frame));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} : pas de réponse`));
      }, 20000);
    });
  }
  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
  /** Crée un onglet et s'y attache. */
  async openTab() {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' }, { browser: true });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true }, { browser: true });
    this.sessionId = sessionId;
    return targetId;
  }
}

/** Ouvre une page pilotable, exécute `fn`, referme. */
async function withPage(pageUrl, fn) {
  const bin = await chromePath();
  const port = 9500 + (process.pid % 400);
  const child = spawn(bin, [
    ...COMMON_ARGS,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    `--force-device-scale-factor=${dpr}`,
    `--remote-debugging-port=${port}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 120 && !wsUrl; i++) {
    try {
      const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      wsUrl = info.webSocketDebuggerUrl;
    } catch { /* Chrome démarre */ }
    if (!wsUrl) await sleep(100);
  }
  if (!wsUrl) { child.kill(); throw new Error('Chrome n’a pas ouvert son port de débogage.'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  const cdp = new CDP(ws);
  await cdp.openTab();

  const journal = [];
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (['error', 'warning'].includes(p.type)) {
      journal.push(`[${p.type}] ` + p.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    }
  });
  cdp.on('Runtime.exceptionThrown', (p) => {
    journal.push('[exception] '
      + (p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
  });
  cdp.on('Network.loadingFailed', (p) => journal.push(`[réseau] ${p.type} : ${p.errorText}`));

  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  // Un onglet créé par Target.createTarget garde une taille par défaut : il faut
  // l'émulation pour mesurer à la bonne largeur. C'est sans risque ici, les
  // images ne passent pas par le protocole.
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: dpr, mobile: width < 700,
  });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true,
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return result.value;
  };

  /**
   * Capture par le protocole. Attention : elle ne rend la main que sur un onglet
   * réellement peint — attaché à une page d'extension, `Page.captureScreenshot`
   * reste muet indéfiniment. D'où la création explicite de l'onglet plus haut.
   */
  const capture = async (out, { full = false } = {}) => {
    const clip = full
      ? await evaluate('({ x: 0, y: 0, scale: 1,'
        + ' width: document.documentElement.scrollWidth,'
        + ' height: Math.min(document.documentElement.scrollHeight, 16000) })')
      : null;
    const res = await cdp.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: full, ...(clip ? { clip } : {}),
    });
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(res.data, 'base64'));
    return out;
  };

  const goto = async (u) => {
    await cdp.send('Page.navigate', { url: u });
    await new Promise((resolve) => {
      cdp.on('Page.loadEventFired', resolve);
      setTimeout(resolve, 12000);
    });
    await sleep(waitMs);
  };

  try {
    await goto(pageUrl);
    return await fn({ evaluate, journal, goto, cdp, capture });
  } finally {
    ws.close();
    child.kill();
  }
}

/* ─────────────────────────────────────────────── sondes */

const OVERFLOW_PROBE = `(() => {
  const docW = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    const right = r.right + window.scrollX;
    if (right > docW + 1) {
      out.push({
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
          ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''),
        right: Math.round(right), width: Math.round(r.width),
        text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 34),
      });
    }
  }
  return { docW, scrollW: document.documentElement.scrollWidth, offenders: out.slice(0, 12) };
})()`;

const CONTRAST_PROBE = `(() => {
  const lum = (c) => {
    const [r, g, b] = (c.match(/[\\d.]+/g) || []).slice(0, 3).map(Number).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (c) => {
    const v = (c.match(/[\\d.]+/g) || []).map(Number);
    return { r: v[0] ?? 0, g: v[1] ?? 0, b: v[2] ?? 0, a: v[3] === undefined ? 1 : v[3] };
  };
  // On empile les fonds des ancêtres en composant l'alpha : un badge posé sur un
  // voile à 12 % n'est pas « or sur or ».
  const bgOf = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.a > 0) stack.push(c);
      if (c.a === 1) break;
    }
    let out = stack.pop() || { r: 11, g: 14, b: 20, a: 1 };
    while (stack.length) {
      const top = stack.pop();
      out = { r: top.r * top.a + out.r * (1 - top.a),
              g: top.g * top.a + out.g * (1 - top.a),
              b: top.b * top.a + out.b * (1 - top.a), a: 1 };
    }
    return 'rgb(' + out.r + ', ' + out.g + ', ' + out.b + ')';
  };
  const seen = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!el.textContent?.trim() || el.children.length) continue;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const l1 = lum(cs.color), l2 = lum(bgOf(el));
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const need = (size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)) ? 3 : 4.5;
    if (ratio >= need) continue;
    const key = cs.color + '|' + Math.round(size);
    if (seen.has(key)) continue;
    seen.set(key, {
      ratio: Math.round(ratio * 100) / 100, need, color: cs.color,
      size: Math.round(size * 10) / 10,
      sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
      sample: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 30),
    });
  }
  return [...seen.values()].sort((a, b) => a.ratio - b.ratio);
})()`;

const FONT_PROBE = `(() => {
  const el = document.querySelector('.hero__title em');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { texte: el.textContent, fonte: cs.fontFamily.split(',')[0],
           graisse: cs.fontWeight, taille: cs.fontSize, couleur: cs.color, style: cs.fontStyle };
})()`;

const STATE_PROBE = `(() => {
  const txt = (s) => document.querySelector(s)?.textContent?.trim().replace(/\\s+/g, ' ') ?? null;
  return {
    objectif: txt('.goalwin'),
    message: txt('.feedback'),
    marges: [...document.querySelectorAll('.editor__gutter .mark')]
      .map((m) => m.textContent || '·').join(''),
    resolu: !!document.querySelector('.solved'),
    xp: txt('#xp-count'),
    rang: txt('#rank-name'),
  };
})()`;

/* ─────────────────────────────────────────────── programme */

const report = (title, body) => { console.log(`\n── ${title} ──`); console.log(body); };

if (command === 'shoot') {
  await withPage(url, ({ capture }) => capture(outPath, { full: !!flags.full }));
  console.log(`capture : ${outPath}`);
} else if (command === 'audit') {
  const res = await withPage(url, async ({ evaluate, journal, capture }) => {
    const out = {
      overflow: await evaluate(OVERFLOW_PROBE),
      contrast: await evaluate(CONTRAST_PROBE),
      font: await evaluate(FONT_PROBE),
      journal,
    };
    await capture(outPath, { full: !!flags.full });
    return out;
  });

  console.log(`\n═══ ${url} @ ${width}×${height} (dpr ${dpr}) ═══`);
  console.log(`document ${res.overflow.docW}px · scrollWidth ${res.overflow.scrollW}px `
    + (res.overflow.scrollW > res.overflow.docW ? '⚠ DÉBORDEMENT HORIZONTAL' : '✓'));
  if (res.overflow.offenders.length) {
    report('éléments qui dépassent', res.overflow.offenders
      .map((o) => `${String(o.right).padStart(5)}px  larg.${String(o.width).padStart(5)}  ${o.sel}  « ${o.text} »`)
      .join('\n'));
  }
  report(res.contrast.length ? 'contrastes sous WCAG AA' : 'contrastes',
    res.contrast.length
      ? res.contrast.map((c) => `${String(c.ratio).padStart(5)}:1 (min ${c.need})  `
        + `${String(c.size).padStart(5)}px  ${c.color}  ${c.sel}  « ${c.sample} »`).join('\n')
      : '✓ tout passe');
  if (res.font) report('expression du titre', JSON.stringify(res.font));
  report('console', res.journal.length ? res.journal.join('\n') : '✓ vide');

  console.log(`\ncapture : ${outPath}`);
} else if (command === 'play') {
  const script = String(flags.type ?? '');
  // On débloque tout et on pré-remplit l'éditeur via localStorage, puis on
  // recharge : la vue relit son brouillon au montage.
  const seed = `(async () => {
    const { LEVELS } = await import('${base}/js/content/index.js');
    localStorage.setItem('tourniquet.v1', JSON.stringify({
      done: LEVELS.map((l) => l.id), xp: 0, hinted: [], revealed: [],
      drafts: { ${JSON.stringify(target)}: ${JSON.stringify(script)} },
    }));
    return 'ok';
  })()`;

  // On charge l'accueil, on sème la sauvegarde, *puis* on change le fragment :
  // sans ce détour, la vue « niveau verrouillé » s'affiche avant la semence, et
  // renavigateur vers la même URL ne recharge rien (navigation same-document).
  const res = await withPage(`${base}/`, async ({ evaluate, journal, capture, cdp }) => {
    await evaluate(seed);
    await evaluate(`location.hash = '#/niveau/${target}'`);
    // Rechargement obligatoire : `js/state.js` garde la progression dans un
    // cache mémoire, donc écrire dans localStorage sans recharger ne change rien
    // — et le brouillon semé serait aussitôt réécrit par l'ancien.
    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(2000);
    const state = await evaluate(STATE_PROBE);
    await capture(outPath, { full: !!flags.full });
    return { state, journal };
  });

  console.log(`\n═══ niveau ${target} · « ${script.replace(/\n/g, ' ⏎ ')} » ═══`);
  console.log(JSON.stringify(res.state, null, 2));
  report('console', res.journal.length ? res.journal.join('\n') : '✓ vide');

  console.log(`\ncapture : ${outPath}`);
} else {
  console.error(`commande inconnue : ${command}`);
  process.exit(2);
}
