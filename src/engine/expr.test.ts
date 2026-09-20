import { describe, it, expect } from 'vitest';
import { evaluate, evalBool, evalNumber, identifiers, ExprError } from './expr';

const ctx = {
  'home.type': 'apartment',
  'home.floor': 7,
  'home.lift': false,
  'people.count': 3,
  'pets.count': 1,
  'pets.dogs': 1,
};

describe('expr', () => {
  it('evaluates arithmetic with precedence', () => {
    expect(evaluate('1 + 2 * 3', {})).toBe(7);
    expect(evaluate('(1 + 2) * 3', {})).toBe(9);
    expect(evaluate('10 / 4', {})).toBe(2.5);
    expect(evaluate('-3 + 5', {})).toBe(2);
  });
  it('evaluates comparisons and logic', () => {
    expect(evalBool("home.type == 'apartment' && home.floor > 3", ctx)).toBe(true);
    expect(evalBool("home.type == 'house' || home.floor >= 7", ctx)).toBe(true);
    expect(evalBool('!home.lift', ctx)).toBe(true);
    expect(evalBool('home.floor != 7', ctx)).toBe(false);
  });
  it('treats missing identifiers as null (false in comparisons, null in arithmetic)', () => {
    expect(evalBool('unknown.fact > 1', ctx)).toBe(false);
    expect(evalBool("unknown.fact == 'x'", ctx)).toBe(false);
    expect(evaluate('unknown.fact + 1', ctx)).toBe(null);
    expect(evalNumber('unknown.fact * 3', ctx)).toBe(null);
    expect(evalBool('!has(unknown.fact)', ctx)).toBe(true);
  });
  it('supports functions and ternary', () => {
    expect(evalNumber('ceil(people.count * 3 * 3 / 2)', ctx)).toBe(14);
    expect(evalNumber('max(2, people.count)', ctx)).toBe(3);
    expect(evaluate("home.floor > 3 ? 'high' : 'low'", ctx)).toBe('high');
    expect(evalNumber('num(unknown) + 1', ctx)).toBe(1);
  });
  it('lists identifiers', () => {
    expect(identifiers("home.type == 'apartment' && ceil(people.count) > pets.dogs").sort()).toEqual(
      ['home.type', 'people.count', 'pets.dogs'],
    );
  });
  it('rejects bad syntax', () => {
    expect(() => evaluate('1 +', {})).toThrow(ExprError);
    expect(() => evaluate('foo(1', {})).toThrow(ExprError);
    expect(() => evaluate('nope(1)', {})).toThrow(ExprError);
    expect(() => evaluate('a $ b', {})).toThrow(ExprError);
  });
  it('division by zero is null, not Infinity', () => {
    expect(evaluate('1 / 0', {})).toBe(null);
  });
});
