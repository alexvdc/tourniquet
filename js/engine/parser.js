// Lexer + parseur Pratt pour un sous-ensemble de la syntaxe de termes de Lean 4.
// Accepte les symboles unicode et leurs équivalents ASCII (-> /\ \/ <-> ~ forall).

import { Var, Const, App, Lam, Pi, Arrow, MVar, Lit, Sort, apps } from './expr.js';

export class ParseError extends Error {
  constructor(msg, pos) { super(msg); this.name = 'ParseError'; this.pos = pos; }
}

const SYMBOLS = [
  '<->', '->', '=>', '/\\', '\\/', ':=', '≠', '≤', '≥', '↔', '→', '∧', '∨', '¬',
  '∀', '∃', 'λ', '⟨', '⟩', '←', '↦', '(', ')', '{', '}', '[', ']', ',', ':',
  '=', '+', '*', '^', '-', '<', '>', '|', '·', '_', '~',
];

const ID_START = /[A-Za-zα-ωΓΔΘΛΞΠΣΦΨΩℕℤℚℝ]/;
const ID_CONT = /[A-Za-z0-9_₀-₉α-ωΓΔΘΛΞΠΣΦΨΩℕℤℚℝ'!]/;

const isIdStart = (c) => c !== undefined && (ID_START.test(c) || c === '_');
const isIdCont = (c) => c !== undefined && ID_CONT.test(c);

export function lex(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '-' && src[i + 1] === '-') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i; while (j < src.length && /[0-9]/.test(src[j])) j++;
      toks.push({ t: 'num', v: Number(src.slice(i, j)), pos: i }); i = j; continue;
    }
    if (c === '?' && isIdStart(src[i + 1])) {
      let j = i + 1; while (isIdCont(src[j])) j++;
      toks.push({ t: 'mvar', v: src.slice(i, j), pos: i }); i = j; continue;
    }
    if (isIdStart(c)) {
      let j = i;
      while (j < src.length && (isIdCont(src[j]) || (src[j] === '.' && isIdStart(src[j + 1])))) j++;
      const word = src.slice(i, j);
      if (word === '_') { toks.push({ t: 'sym', v: '_', pos: i }); i = j; continue; }
      toks.push({ t: 'id', v: word, pos: i }); i = j; continue;
    }
    const sym = SYMBOLS.find((s) => src.startsWith(s, i));
    if (sym) { toks.push({ t: 'sym', v: sym, pos: i }); i += sym.length; continue; }
    throw new ParseError(`caractère inattendu « ${c} »`, i);
  }
  toks.push({ t: 'eof', v: '', pos: src.length });
  return toks;
}

// Noms canoniques : tout le reste devient une variable libre, résolue plus tard
// contre le contexte local puis la bibliothèque de lemmes.
const ALIAS = {
  succ: 'Nat.succ', zero: 'Nat.zero', Nat: 'ℕ', nat: 'ℕ', pred: 'Nat.pred',
};
const CONSTS = new Set(['ℕ', 'ℤ', 'ℚ', 'ℝ', 'True', 'False', 'Nat.zero', 'Nat.succ', 'Nat.pred']);

function mkIdent(name) {
  const canon = ALIAS[name] ?? name;
  if (canon === 'Prop' || canon === 'Type') return Sort(canon);
  if (CONSTS.has(canon) || canon.includes('.') || /^[A-Z]/.test(canon)) return Const(canon);
  return Var(canon);
}

// symbole -> [constante ou null pour la flèche, précédence, associativité]
const INFIX = {
  '↔': ['Iff', 20, 'right'], '<->': ['Iff', 20, 'right'],
  '→': [null, 25, 'right'], '->': [null, 25, 'right'],
  '∨': ['Or', 30, 'right'], '\\/': ['Or', 30, 'right'],
  '∧': ['And', 35, 'right'], '/\\': ['And', 35, 'right'],
  '=': ['Eq', 50, 'none'], '≠': ['Ne', 50, 'none'],
  '≤': ['Nat.le', 50, 'none'], '<': ['Nat.lt', 50, 'none'],
  '≥': ['Nat.ge', 50, 'none'], '>': ['Nat.gt', 50, 'none'],
  '+': ['Nat.add', 65, 'left'], '-': ['Nat.sub', 65, 'left'],
  '*': ['Nat.mul', 70, 'left'],
  '^': ['Nat.pow', 75, 'right'],
};

export const HOLE = Const('_');
const LAMBDA_WORDS = ['fun', 'forall', 'exists'];

class Parser {
  constructor(src) { this.src = src; this.toks = lex(src); this.i = 0; }
  peek(n = 0) { return this.toks[this.i + n]; }
  next() { return this.toks[this.i++]; }
  at(t, v) { const k = this.peek(); return k.t === t && (v === undefined || k.v === v); }
  atSym(...vs) { const k = this.peek(); return k.t === 'sym' && vs.includes(k.v); }
  atId(...vs) { const k = this.peek(); return k.t === 'id' && vs.includes(k.v); }
  eat(t, v) { return this.at(t, v) ? this.next() : null; }
  expect(t, v) {
    if (this.at(t, v)) return this.next();
    const k = this.peek();
    throw new ParseError(`« ${v ?? t} » attendu, mais « ${k.v || 'fin de ligne'} » trouvé`, k.pos);
  }

  parse() {
    const e = this.expr(0);
    if (!this.at('eof')) throw new ParseError(`« ${this.peek().v} » inattendu`, this.peek().pos);
    return e;
  }

  expr(minPrec) {
    let left = this.prefix();
    for (;;) {
      const k = this.peek();
      if (k.t !== 'sym') break;
      const info = INFIX[k.v];
      if (!info) break;
      const [con, prec, assoc] = info;
      if (prec < minPrec) break;
      this.next();
      const rightMin = assoc === 'right' ? prec : prec + 1;
      const right = this.expr(rightMin);
      left = con === null ? Arrow(left, right) : apps(Const(con), left, right);
    }
    return left;
  }

  // Groupes de liants : `x y`, `(x y : T)`, `{x : T}`
  binders() {
    const out = [];
    for (;;) {
      if (this.at('id') && !this.atId(...LAMBDA_WORDS)) {
        out.push({ x: this.next().v, t: HOLE, implicit: false }); continue;
      }
      if (this.atSym('_')) { this.next(); out.push({ x: '_', t: HOLE, implicit: false }); continue; }
      if (this.atSym('(') || this.atSym('{')) {
        const open = this.peek().v;
        const save = this.i;
        this.next();
        const names = [];
        while (this.at('id')) names.push(this.next().v);
        if (names.length && this.atSym(':')) {
          this.next();
          const t = this.expr(0);
          this.expect('sym', open === '(' ? ')' : '}');
          for (const n of names) out.push({ x: n, t, implicit: open === '{' });
          continue;
        }
        this.i = save;
      }
      break;
    }
    if (!out.length) throw new ParseError('nom de variable attendu après le liant', this.peek().pos);
    return out;
  }

  bindersThen(sep) {
    const bs = this.binders();
    if (sep === ',') this.expect('sym', ',');
    else if (!this.eat('sym', '=>')) this.expect('sym', '↦');
    return bs;
  }

  prefix() {
    const k = this.peek();
    if (k.t === 'sym') {
      switch (k.v) {
        case '∀': {
          this.next();
          const bs = this.bindersThen(',');
          const body = this.expr(0);
          return bs.reduceRight((acc, b) => Pi(b.x, b.t, acc, b.implicit), body);
        }
        case '∃': {
          this.next();
          const bs = this.bindersThen(',');
          const body = this.expr(0);
          return bs.reduceRight((acc, b) => App(Const('Exists'), Lam(b.x, b.t, acc)), body);
        }
        case 'λ': {
          this.next();
          const bs = this.bindersThen('=>');
          const body = this.expr(0);
          return bs.reduceRight((acc, b) => Lam(b.x, b.t, acc), body);
        }
        case '¬': case '~': { this.next(); return App(Const('Not'), this.expr(40)); }
      }
    }
    if (k.t === 'id' && LAMBDA_WORDS.includes(k.v)) {
      this.next();
      if (k.v === 'fun') {
        const bs = this.bindersThen('=>');
        const body = this.expr(0);
        return bs.reduceRight((acc, b) => Lam(b.x, b.t, acc), body);
      }
      const bs = this.bindersThen(',');
      const body = this.expr(0);
      return k.v === 'forall'
        ? bs.reduceRight((acc, b) => Pi(b.x, b.t, acc, b.implicit), body)
        : bs.reduceRight((acc, b) => App(Const('Exists'), Lam(b.x, b.t, acc)), body);
    }
    return this.appTail(this.atom());
  }

  startsAtom() {
    const k = this.peek();
    if (k.t === 'id') return !LAMBDA_WORDS.includes(k.v);
    if (k.t === 'num' || k.t === 'mvar') return true;
    return k.t === 'sym' && ['(', '⟨', '_'].includes(k.v);
  }

  appTail(head) {
    while (this.startsAtom()) head = App(head, this.atom());
    return head;
  }

  atom() {
    const k = this.next();
    if (k.t === 'num') return Lit(k.v);
    if (k.t === 'mvar') return MVar(k.v);
    if (k.t === 'id') return mkIdent(k.v);
    if (k.t === 'sym') {
      switch (k.v) {
        case '(': {
          const e = this.expr(0);
          if (this.eat('sym', ':')) this.expr(0); // ascription de type : ignorée
          this.expect('sym', ')');
          return e;
        }
        case '⟨': {
          const args = [this.expr(0)];
          while (this.eat('sym', ',')) args.push(this.expr(0));
          this.expect('sym', '⟩');
          return apps(Const('⟨⟩'), ...args);
        }
        case '¬': case '~': return App(Const('Not'), this.expr(40));
        case '_': return HOLE;
      }
    }
    throw new ParseError(`terme attendu, mais « ${k.v || 'fin de ligne'} » trouvé`, k.pos);
  }
}

export function parse(src) { return new Parser(src).parse(); }

/** Parse en renvoyant null plutôt qu'en levant une erreur. */
export function tryParse(src) { try { return parse(src); } catch { return null; } }
