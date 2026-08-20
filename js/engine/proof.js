// Exécution d'un script de tactiques ligne par ligne : c'est ce que l'éditeur
// appelle à chaque frappe, et ce que la suite de tests appelle sur chaque
// solution de référence.

import { parse } from './parser.js';
import { match } from './expr.js';
import { norm } from './reduce.js';
import { show, showState } from './printer.js';
import { buildLib } from './lib.js';
import { initialState, runTactic, TacticError } from './tactics.js';
import { makeEnv } from './elab.js';

/** Contexte + objectif d'un niveau, sous forme d'état de preuve initial. */
export function levelState(level) {
  const ctx = (level.ctx ?? []).flatMap((entry) => {
    const [names, typeSrc] = splitHyp(entry);
    const type = parse(typeSrc);
    return names.split(/\s+/).filter(Boolean).map((name) => ({ name, type }));
  });
  return initialState(ctx, parse(level.goal));
}

function splitHyp(entry) {
  const i = entry.indexOf(':');
  if (i < 0) throw new Error(`hypothèse mal formée : « ${entry} » (attendu « nom : type »)`);
  return [entry.slice(0, i).trim(), entry.slice(i + 1).trim()];
}

export function levelEnv(level) {
  return makeEnv({
    lib: buildLib(level.lemmas ?? [], level.logic !== false),
    arith: !!level.arith,
  });
}

/** Environnement complet (bibliothèque + tactiques autorisées). */
export function makeLevelEnv(level) {
  const env = levelEnv(level);
  if (level.tactics) env.tactics = new Set(level.tactics);
  return env;
}

/**
 * Rejoue un script complet.
 * @returns {{steps: Array, final: object, solved: boolean, sorried: boolean,
 *            error: {line: number, message: string}|null}}
 */
export function runProof(script, level) {
  const env = makeLevelEnv(level);
  let state = levelState(level);
  const steps = [{ line: 0, text: '', state, error: null }];
  let error = null;

  for (const stmt of statements(script)) {
    if (error) break;
    try {
      state = runTactic(state, stmt.text, env);
      steps.push({ line: stmt.line, endLine: stmt.endLine, text: stmt.text, state, error: null });
    } catch (err) {
      if (!(err instanceof TacticError)) throw err;
      error = { line: stmt.line, endLine: stmt.endLine, message: err.message };
      steps.push({ line: stmt.line, endLine: stmt.endLine, text: stmt.text, state, error: err.message });
      break;
    }
  }
  return {
    steps,
    final: state,
    solved: !error && state.goals.length === 0 && !state.sorried,
    sorried: state.sorried,
    error,
    // Diagnostic : l'objectif restant est-il franchement faux ?
    warning: error ? null : diagnose(state),
    env,
  };
}

const stripComment = (l) => {
  const i = l.indexOf('--');
  return i < 0 ? l : l.slice(0, i);
};

/**
 * Découpe le script en instructions. Une ligne = une tactique, sauf `calc` :
 * ses étapes suivantes commencent par `_` et appartiennent à la même
 * instruction. `endLine` sert à colorier toute la plage dans la marge.
 * @returns {Array<{line: number, endLine: number, text: string}>}
 */
export function statements(script) {
  const lines = script.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const text = stripComment(lines[i]).trim();
    if (!text) continue;
    const stmt = { line: i, endLine: i, text };
    if (/^calc\b/.test(text)) {
      while (i + 1 < lines.length) {
        const next = stripComment(lines[i + 1]).trim();
        if (!next) { // une ligne vide n'interrompt pas encore la chaîne
          if (!lines.slice(i + 2).some((l) => /^\s*_/.test(stripComment(l)))) break;
          i++; continue;
        }
        if (!next.startsWith('_')) break;
        stmt.text += '\n' + next;
        i++;
        stmt.endLine = i;
      }
    }
    out.push(stmt);
  }
  return out;
}

const CMP = {
  'Nat.le': [(a, b) => a <= b, '≤'], 'Nat.lt': [(a, b) => a < b, '<'],
  'Nat.ge': [(a, b) => a >= b, '≥'], 'Nat.gt': [(a, b) => a > b, '>'],
};

/**
 * Un objectif restant est-il carrément *faux* ? Quand un apprenant se trompe de
 * témoin (`use 4` au lieu de `use 3`), aucune tactique n'échoue : il se retrouve
 * juste devant `4 + 2 = 5`, et peut chercher longtemps une preuve qui n'existe
 * pas. Autant le lui dire.
 * @returns {string|null} message à afficher, ou null
 */
export function diagnose(state) {
  const opts = { arith: true };
  for (const goal of state.goals) {
    const t = norm(goal.target, opts);
    const eq = match(t, 'Eq', 2);
    if (eq && eq[0].k === 'lit' && eq[1].k === 'lit' && eq[0].v !== eq[1].v) {
      return `l’objectif \`${show(goal.target)}\` est faux : à gauche ${eq[0].v}, à droite ${eq[1].v}.`;
    }
    const not = match(t, 'Not', 1);
    const ne = not && match(norm(not[0], opts), 'Eq', 2);
    if (ne && ne[0].k === 'lit' && ne[1].k === 'lit' && ne[0].v === ne[1].v) {
      return `l’objectif \`${show(goal.target)}\` est faux : les deux membres valent ${ne[0].v}.`;
    }
    for (const [name, [op, sym]] of Object.entries(CMP)) {
      const c = match(t, name, 2);
      if (c && c[0].k === 'lit' && c[1].k === 'lit' && !op(c[0].v, c[1].v)) {
        return `l’objectif \`${show(goal.target)}\` est faux : ${c[0].v} ${sym} ${c[1].v} ne tient pas.`;
      }
    }
  }
  return null;
}

/** Énoncé du niveau au format Lean, pour l'en-tête de l'éditeur. */
export function statementOf(level) {
  const binders = (level.ctx ?? []).map((h) => `(${h})`).join(' ');
  const name = level.name ?? 'exercice';
  return `theorem ${name}${binders ? ' ' + binders : ''} : ${level.goal} := by`;
}

/**
 * Lemmes du jeu dont le nom n'existe pas dans Mathlib. `open Nat` suffit pour
 * `succ`, `add_succ` et compagnie ; ceux-là méritent un avertissement.
 */
const GAME_ONLY = ['one_eq_succ_zero', 'two_eq_succ_one', 'three_eq_succ_two',
  'four_eq_succ_three', 'five_eq_succ_four', 'six_eq_succ_five'];

/**
 * Code Lean 4 réel, à ouvrir dans le playground. On préfixe `import Mathlib` et
 * `open Nat` — sans quoi `succ` et `add_succ` ne sont pas en portée — et on
 * signale les lemmes qui n'existent que dans ce jeu, plutôt que de laisser
 * l'apprenant devant une erreur incompréhensible.
 */
export function leanCode(level, script) {
  const header = 'import Mathlib\nopen Nat\n\n';
  if (level.lean) return header + level.lean;

  const body = script.split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => '  ' + l).join('\n');
  const used = GAME_ONLY.filter((n) => script.includes(n));
  const warning = used.length
    ? `-- ${used.join(', ')} ${used.length > 1 ? 'sont propres' : 'est propre'} à Tourniquet :\n`
      + '-- Mathlib ne nomme pas le dépliage des chiffres. Ici, `decide`, `norm_num`\n'
      + '-- ou `show` font le travail.\n\n'
    : '';

  return header + warning
    + `-- Niveau ${level.id ?? '?'} de Tourniquet\n`
    + `${statementOf(level)}\n${body || '  sorry'}\n`;
}

export { showState, show };
