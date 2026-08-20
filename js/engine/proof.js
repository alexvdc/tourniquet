// Exécution d'un script de tactiques ligne par ligne : c'est ce que l'éditeur
// appelle à chaque frappe, et ce que la suite de tests appelle sur chaque
// solution de référence.

import { parse } from './parser.js';
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

  const lines = script.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const text = stripComment(lines[i]).trim();
    if (!text) continue;
    if (error) break;
    try {
      state = runTactic(state, text, env);
      steps.push({ line: i, text, state, error: null });
    } catch (err) {
      if (!(err instanceof TacticError)) throw err;
      error = { line: i, message: err.message };
      steps.push({ line: i, text, state, error: err.message });
      break;
    }
  }
  return {
    steps,
    final: state,
    solved: !error && state.goals.length === 0 && !state.sorried,
    sorried: state.sorried,
    error,
    env,
  };
}

const stripComment = (l) => {
  const i = l.indexOf('--');
  return i < 0 ? l : l.slice(0, i);
};

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
