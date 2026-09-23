import { describe, expect, it } from 'vitest';
import { loadContentFromDisk } from './content-fs';
import { extractSnippets, wrapSnippet } from './cpp-snippets';

describe('wrapSnippet', () => {
  it('keeps whole programs, with the prelude on top', () => {
    const prog = 'int main() {\n    return 0;\n}';
    expect(wrapSnippet(prog)).toEqual({ source: prog + '\n', wrapped: false });
    expect(
      wrapSnippet(prog, '#include <iostream>').source.startsWith('#include <iostream>\nint main()'),
    ).toBe(true);
  });

  it('wraps fragments in main() with includes, prelude first', () => {
    const { source, wrapped } = wrapSnippet('#include <vector>\nstd::cout << x;', 'int x{1};');
    expect(wrapped).toBe(true);
    expect(source).toContain('#include <iostream>');
    expect(source).toContain('#include <vector>');
    expect(source.indexOf('int x{1};')).toBeLessThan(source.indexOf('std::cout << x;'));
    expect(source.indexOf('#include <vector>')).toBeLessThan(source.indexOf('int main'));
  });

  it('puts top-level function and type definitions at file scope', () => {
    const onlyDefs = wrapSnippet(
      ['int heal(int hp, int amount) {', '    return hp + amount;', '}'].join('\n'),
    );
    expect(onlyDefs.source).toContain('}\n\nint main() {}');
    expect(onlyDefs.source.indexOf('int heal(')).toBeLessThan(onlyDefs.source.indexOf('int main() {}'));

    const withCall = wrapSnippet(
      [
        'struct Hero {',
        '    int hp{3};',
        '};',
        '',
        'int heal(Hero& h) {',
        '    return ++h.hp;',
        '}',
        'Hero h;',
        'std::cout << heal(h);',
      ].join('\n'),
    ).source;
    const main = withCall.indexOf('int main() {');
    expect(withCall.indexOf('struct Hero {')).toBeLessThan(main);
    expect(withCall.indexOf('int heal(Hero& h) {')).toBeLessThan(main);
    expect(withCall.indexOf('std::cout << heal(h);')).toBeGreaterThan(main);

    // a control statement is not a definition: it stays inside main()
    const ctrl = wrapSnippet(['if (hp > 0) {', '    hp--;', '}'].join('\n'), 'int hp{1};').source;
    expect(ctrl.indexOf('if (hp > 0)')).toBeGreaterThan(ctrl.indexOf('int main() {'));
  });

  it('prints a lone expression', () => {
    expect(wrapSnippet('7 / 2 * 2').source).toContain("std::cout << (7 / 2 * 2) << '\\n';");
    expect(wrapSnippet('x++; // comment').source).not.toContain('std::cout << (');
  });
});

describe('extractSnippets', { timeout: 60_000 }, () => {
  it('covers every kind of snippet in the real content', () => {
    const { parsed } = loadContentFromDisk();
    const { snippets } = extractSnippets(parsed);
    const keys = snippets.map((s) => s.key);
    expect(keys).toContain('w1.l1.demo');
    expect(keys).toContain('w1.l1.c4.code'); // fill with answer
    expect(keys).toContain('w1.l1.c5.sbs.hardened');
    expect(keys).toContain('vault.w1.hello');
    expect(keys).toContain('w1.p.program');
    const fill = snippets.find((s) => s.key === 'w1.l1.c4.code')!;
    expect(fill.source).toContain('int main() {');
    expect(fill.source).not.toContain('___');
    const broken = snippets.find((s) => s.key === 'w1.l1.c5.code')!;
    expect(broken.expect).toBe('error');
    const predict = snippets.find((s) => s.key === 'w1.l1.c2.code')!;
    expect(predict.run).toEqual({ stdin: [''], expected: 'Hi!\n' });
  });
});
