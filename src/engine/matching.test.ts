import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { editDistance, isNearMiss, matchesAnswer, normalizeAnswer } from './matching';

/** The legacy normalize() from legacy/src/engine/challenges.js, extracted verbatim. */
function legacyNormalize(): (s: unknown) => string {
  const src = readFileSync(
    join(import.meta.dirname, '..', '..', 'legacy', 'src', 'engine', 'challenges.js'),
    'utf8',
  );
  const m = /function normalize\(s\) \{[\s\S]*?\n {2}\}/.exec(src);
  if (!m) throw new Error('legacy normalize() not found');
  return new Function(m[0] + '\nreturn normalize;')() as (s: unknown) => string;
}

const nbsp = String.fromCharCode(0xa0);
const SAMPLES = [
  '  std::cout  <<  "Hi"  ;  ',
  'int x { 5 } ;',
  'std::cout<<"a b"<<\n  std::endl;',
  '“hello”',
  '‘c’',
  `int${nbsp}x = 3;`,
  'a && b || !c',
  'x += 1 ; y -= 2',
  'std::vector< int > v ;',
  'if ( a == b ) { return ; }',
  'arr[ i ] = f( a , b );',
  'label: x',
  '',
  '   ',
  'a\t\tb',
];

describe('normalizeAnswer', () => {
  it('matches the legacy normalize() exactly', () => {
    const legacy = legacyNormalize();
    for (const s of SAMPLES) expect(normalizeAnswer(s), JSON.stringify(s)).toBe(legacy(s));
  });

  it('trims, collapses whitespace and drops spaces around punctuation', () => {
    expect(normalizeAnswer('  std::cout  <<  "Hi"  ;  ')).toBe('std::cout<<"Hi";');
    expect(normalizeAnswer('int x { 5 } ;')).toBe('int x{5};');
    expect(normalizeAnswer('return  a  +  b ;')).toBe('return a+b;');
  });

  it('straightens smart quotes and NBSP', () => {
    expect(normalizeAnswer('“hi”')).toBe('"hi"');
    expect(normalizeAnswer('‘c’')).toBe("'c'");
    expect(normalizeAnswer(`a${nbsp}b`)).toBe('a b');
  });

  it('keeps spaces inside identifiers apart', () => {
    expect(normalizeAnswer('const   int x')).toBe('const int x');
  });

  it('handles null/undefined', () => {
    expect(normalizeAnswer(undefined)).toBe('');
    expect(normalizeAnswer(null)).toBe('');
  });
});

describe('matchesAnswer', () => {
  const ch = { accept: ['std::cout << "Hi\\n";', "std::cout << 'x';"] };

  it('accepts any spacing variant of an accepted answer', () => {
    expect(matchesAnswer('std::cout<<"Hi\\n";', ch)).toBe(true);
    expect(matchesAnswer('  std::cout   <<   "Hi\\n"  ;', ch)).toBe(true);
    expect(matchesAnswer('std::cout << ‘x’;', ch)).toBe(true);
  });

  it('rejects wrong or empty answers', () => {
    expect(matchesAnswer('std::cout << "Hi";', ch)).toBe(false);
    expect(matchesAnswer('   ', ch)).toBe(false);
    expect(matchesAnswer('', { acceptRe: ['.*'] })).toBe(false);
  });

  it('tests acceptRe against the normalized input', () => {
    const re = { acceptRe: ['^int gold ?(\\{ ?0? ?\\}|= ?0|= ?\\{ ?0? ?\\}) ?;$'] };
    expect(matchesAnswer('int gold{};', re)).toBe(true);
    expect(matchesAnswer('int   gold = 0 ;', re)).toBe(true);
    expect(matchesAnswer('int gold;', re)).toBe(false);
  });

  it('ignores invalid regexes instead of throwing', () => {
    expect(matchesAnswer('x', { acceptRe: ['(unclosed'] })).toBe(false);
  });
});

describe('isNearMiss', () => {
  it('counts a typo, a swap, case or a missing semicolon as close', () => {
    expect(editDistance('int', 'itn')).toBe(1);
    expect(isNearMiss('itn', { accept: ['int'] })).toBe(true);
    expect(isNearMiss('std::cot', { accept: ['std::cout'] })).toBe(true);
    expect(isNearMiss('return 0', { accept: ['return 0;'] })).toBe(true);
    expect(isNearMiss('RETURN 0 ;', { accept: ['return 0;'] })).toBe(true);
    expect(isNearMiss('<', { accept: ['<<'] })).toBe(true);
  });

  it('treats unrelated answers as not close', () => {
    expect(isNearMiss('cin', { accept: ['cout'] })).toBe(false);
    expect(isNearMiss('>>', { accept: ['<<'] })).toBe(false);
    expect(isNearMiss('double', { accept: ['int'] })).toBe(false);
    expect(isNearMiss('while (true)', { accept: ['for (int i = 0; i < 3; i++)'] })).toBe(false);
    expect(isNearMiss('', { accept: ['int'] })).toBe(false);
    expect(isNearMiss('x', { acceptRe: ['^x+$'] })).toBe(false);
  });
});
