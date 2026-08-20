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

/** Code Lean 4 réel, à copier dans le vrai playground. */
export function leanCode(level, script) {
  if (level.lean) return level.lean;
  const body = script.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => '  ' + l).join('\n');
  return `${statementOf(level)}\n${body || '  sorry'}`;
}

export { showState, show };
