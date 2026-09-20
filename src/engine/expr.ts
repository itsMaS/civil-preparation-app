/**
 * Tiny, safe expression language used by content packs.
 *
 * Grammar (precedence low -> high):
 *   ternary:  or ? expr : expr
 *   or:       and (|| and)*
 *   and:      eq (&& eq)*
 *   eq:       cmp ((== | !=) cmp)*
 *   cmp:      add ((< | <= | > | >=) add)*
 *   add:      mul ((+ | -) mul)*
 *   mul:      unary ((* | / | %) unary)*
 *   unary:    (! | -) unary | primary
 *   primary:  number | string | true | false | null | ident(.ident)* | ident(args) | ( expr )
 *
 * Identifiers resolve against a flat context ("home.floor", "pets.count").
 * Missing values are `null`; comparisons with null are false, arithmetic with
 * null yields null. Nothing here calls eval or touches globals.
 */

export type Value = number | string | boolean | null;
export type Context = Record<string, Value>;

type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string };

const OPS = ['&&', '||', '==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/', '%', '!', '(', ')', ',', '?', ':'];

export class ExprError extends Error {}

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: 'num', v: parseFloat(src.slice(i, j)) });
      i = j; continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1; let s = '';
      while (j < src.length && src[j] !== c) { s += src[j]; j++; }
      if (j >= src.length) throw new ExprError(`Unterminated string in: ${src}`);
      out.push({ t: 'str', v: s });
      i = j + 1; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j; continue;
    }
    const two = src.slice(i, i + 2);
    if (OPS.includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if (OPS.includes(c)) { out.push({ t: 'op', v: c }); i += 1; continue; }
    throw new ExprError(`Unexpected character '${c}' in: ${src}`);
  }
  return out;
}

export type Node =
  | { k: 'lit'; v: Value }
  | { k: 'id'; name: string }
  | { k: 'un'; op: string; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'tern'; c: Node; a: Node; b: Node }
  | { k: 'call'; fn: string; args: Node[] };

class Parser {
  private i = 0;
  constructor(private toks: Tok[], private src: string) {}
  private peek(): Tok | undefined { return this.toks[this.i]; }
  private isOp(v: string): boolean { const t = this.peek(); return !!t && t.t === 'op' && t.v === v; }
  private eat(v: string): void {
    if (!this.isOp(v)) throw new ExprError(`Expected '${v}' in: ${this.src}`);
    this.i++;
  }
  parse(): Node {
    const n = this.ternary();
    if (this.i < this.toks.length) throw new ExprError(`Unexpected trailing tokens in: ${this.src}`);
    return n;
  }
  private ternary(): Node {
    const c = this.or();
    if (this.isOp('?')) {
      this.i++;
      const a = this.ternary();
      this.eat(':');
      const b = this.ternary();
      return { k: 'tern', c, a, b };
    }
    return c;
  }
  private or(): Node {
    let a = this.and();
    while (this.isOp('||')) { this.i++; a = { k: 'bin', op: '||', a, b: this.and() }; }
    return a;
  }
  private and(): Node {
    let a = this.eq();
    while (this.isOp('&&')) { this.i++; a = { k: 'bin', op: '&&', a, b: this.eq() }; }
    return a;
  }
  private eq(): Node {
    let a = this.cmp();
    while (this.isOp('==') || this.isOp('!=')) {
      const op = (this.peek() as { v: string }).v; this.i++;
      a = { k: 'bin', op, a, b: this.cmp() };
    }
    return a;
  }
  private cmp(): Node {
    let a = this.add();
    while (this.isOp('<') || this.isOp('<=') || this.isOp('>') || this.isOp('>=')) {
      const op = (this.peek() as { v: string }).v; this.i++;
      a = { k: 'bin', op, a, b: this.add() };
    }
    return a;
  }
  private add(): Node {
    let a = this.mul();
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.peek() as { v: string }).v; this.i++;
      a = { k: 'bin', op, a, b: this.mul() };
    }
    return a;
  }
  private mul(): Node {
    let a = this.unary();
    while (this.isOp('*') || this.isOp('/') || this.isOp('%')) {
      const op = (this.peek() as { v: string }).v; this.i++;
      a = { k: 'bin', op, a, b: this.unary() };
    }
    return a;
  }
  private unary(): Node {
    if (this.isOp('!')) { this.i++; return { k: 'un', op: '!', a: this.unary() }; }
    if (this.isOp('-')) { this.i++; return { k: 'un', op: '-', a: this.unary() }; }
    return this.primary();
  }
  private primary(): Node {
    const t = this.peek();
    if (!t) throw new ExprError(`Unexpected end of expression: ${this.src}`);
    if (t.t === 'num') { this.i++; return { k: 'lit', v: t.v }; }
    if (t.t === 'str') { this.i++; return { k: 'lit', v: t.v }; }
    if (t.t === 'id') {
      this.i++;
      if (t.v === 'true') return { k: 'lit', v: true };
      if (t.v === 'false') return { k: 'lit', v: false };
      if (t.v === 'null') return { k: 'lit', v: null };
      if (this.isOp('(')) {
        this.i++;
        const args: Node[] = [];
        if (!this.isOp(')')) {
          args.push(this.ternary());
          while (this.isOp(',')) { this.i++; args.push(this.ternary()); }
        }
        this.eat(')');
        return { k: 'call', fn: t.v, args };
      }
      return { k: 'id', name: t.v };
    }
    if (t.t === 'op' && t.v === '(') {
      this.i++;
      const n = this.ternary();
      this.eat(')');
      return n;
    }
    throw new ExprError(`Unexpected token '${t.v}' in: ${this.src}`);
  }
}

const cache = new Map<string, Node>();

export function parse(src: string): Node {
  const hit = cache.get(src);
  if (hit) return hit;
  const n = new Parser(tokenize(src), src).parse();
  cache.set(src, n);
  return n;
}

const FUNCS: Record<string, (...a: Value[]) => Value> = {
  ceil: (x) => (typeof x === 'number' ? Math.ceil(x) : null),
  floor: (x) => (typeof x === 'number' ? Math.floor(x) : null),
  round: (x) => (typeof x === 'number' ? Math.round(x) : null),
  min: (...xs) => (xs.every((x) => typeof x === 'number') ? Math.min(...(xs as number[])) : null),
  max: (...xs) => (xs.every((x) => typeof x === 'number') ? Math.max(...(xs as number[])) : null),
  has: (x) => x !== null && x !== undefined && x !== '',
  num: (x) => (x === null ? 0 : typeof x === 'number' ? x : typeof x === 'boolean' ? (x ? 1 : 0) : Number(x) || 0),
};

function truthy(v: Value): boolean {
  return v !== null && v !== false && v !== 0 && v !== '';
}

function arith(op: string, a: Value, b: Value): Value {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? null : a / b;
    case '%': return b === 0 ? null : a % b;
  }
  return null;
}

function compare(op: string, a: Value, b: Value): boolean {
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  switch (op) {
    case '<': return a < b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '>=': return a >= b;
  }
  return false;
}

export function evalNode(n: Node, ctx: Context): Value {
  switch (n.k) {
    case 'lit': return n.v;
    case 'id': return ctx[n.name] ?? null;
    case 'un': {
      const a = evalNode(n.a, ctx);
      if (n.op === '!') return !truthy(a);
      return typeof a === 'number' ? -a : null;
    }
    case 'bin': {
      if (n.op === '&&') return truthy(evalNode(n.a, ctx)) ? truthy(evalNode(n.b, ctx)) : false;
      if (n.op === '||') return truthy(evalNode(n.a, ctx)) ? true : truthy(evalNode(n.b, ctx));
      const a = evalNode(n.a, ctx);
      const b = evalNode(n.b, ctx);
      if (n.op === '==') return a === b;
      if (n.op === '!=') return a !== b;
      if (['<', '<=', '>', '>='].includes(n.op)) return compare(n.op, a, b);
      return arith(n.op, a, b);
    }
    case 'tern': return truthy(evalNode(n.c, ctx)) ? evalNode(n.a, ctx) : evalNode(n.b, ctx);
    case 'call': {
      const fn = FUNCS[n.fn];
      if (!fn) throw new ExprError(`Unknown function '${n.fn}'`);
      return fn(...n.args.map((a) => evalNode(a, ctx)));
    }
  }
}

export function evaluate(src: string, ctx: Context): Value {
  return evalNode(parse(src), ctx);
}

export function evalBool(src: string | undefined, ctx: Context): boolean {
  if (!src) return true;
  return truthy(evaluate(src, ctx));
}

export function evalNumber(src: string | undefined, ctx: Context): number | null {
  if (!src) return null;
  const v = evaluate(src, ctx);
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Identifiers referenced by an expression (used for dependency ordering and validation). */
export function identifiers(src: string): string[] {
  const out = new Set<string>();
  const walk = (n: Node): void => {
    switch (n.k) {
      case 'id': out.add(n.name); break;
      case 'un': walk(n.a); break;
      case 'bin': walk(n.a); walk(n.b); break;
      case 'tern': walk(n.c); walk(n.a); walk(n.b); break;
      case 'call': n.args.forEach(walk); break;
      default: break;
    }
  };
  walk(parse(src));
  return [...out];
}
