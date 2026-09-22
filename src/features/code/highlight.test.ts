import { describe, expect, it } from 'vitest';
import { highlightLine, indentOf, tokLine } from './highlight';

const types = (src: string, limit?: number) => highlightLine(src, limit).map((t) => `${t.t}:${t.v}`);

describe('highlighter', () => {
  it('tokenizes C++', () => {
    expect(tokLine('std::cout << "Hi";').map((t) => t.t)).toEqual(['ns', 'pu', 'pu', 'lib', 'ws', 'pu', 'pu', 'ws', 'st', 'pu']);
    expect(types('#include <iostream>')).toEqual(['pp:#include <iostream>']);
    expect(types('int x = 42; // answer')).toEqual([
      'ty:int',
      'ws: ',
      'id:x',
      'ws: ',
      'pu:=',
      'ws: ',
      'nu:42',
      'pu:;',
      'ws: ',
      'cm:// answer',
    ]);
  });
  it('marks leading indentation', () => {
    expect(types('    return 0;')[0]).toBe('lead:    ');
    expect(indentOf('\t  x')).toBe(6);
  });
  it('finds blanks anywhere, even inside strings', () => {
    expect(types('std::cout << "___";').filter((t) => t.startsWith('blank'))).toHaveLength(1);
    expect(types('int ___ = ___;').filter((t) => t.startsWith('blank'))).toHaveLength(2);
  });
  it('treats shell commands as one token', () => {
    expect(types('g++ -Wall main.cpp')).toEqual(['sh:g++ -Wall main.cpp']);
  });
  it('truncates for the typing effect (a blank counts as 3 chars)', () => {
    expect(highlightLine('int x;', 3).map((t) => t.v).join('')).toBe('int');
    expect(highlightLine('a ___ b', 5).map((t) => t.v).join('')).toBe('a ___');
  });
});
