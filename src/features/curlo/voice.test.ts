import { describe, expect, it } from 'vitest';
import { curloLine, VOICE } from './voice';

const words = (s: string) =>
  s
    .replace(/\*\*|`/g, '')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9{;]/.test(w)).length;

describe('Curlo voice lines', () => {
  it('keeps every line at 15 words or fewer', () => {
    for (const [cat, lines] of Object.entries(VOICE)) {
      for (const l of lines) expect(words(l), `${cat}: ${l}`).toBeLessThanOrEqual(15);
    }
  });
  it('fills placeholders', () => {
    expect(curloLine('streak', { n: 7 }, () => 0)).toBe('7-day streak! Keep the flame alive!');
    expect(curloLine('poke', {}, () => 0.99)).toBe('{ squish }');
  });
});
