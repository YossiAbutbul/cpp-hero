import { describe, expect, it } from 'vitest';
import { DemoSchema } from './schema';

const code = 'int a{1};\nint* p{&a};\np = nullptr;\nreturn 0;';
const errors = (steps: unknown[]) => {
  const r = DemoSchema.safeParse({ code, steps });
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('demo step extensions', () => {
  it('accepts plain steps as before', () => {
    expect(errors([{ line: 0, vars: { a: '1' } }, { line: 1, out: 'x' }])).toEqual([]);
  });

  it('vars: null removes a box that exists', () => {
    expect(errors([{ line: 0, vars: { a: '1' } }, { line: 3, vars: { a: null } }])).toEqual([]);
    expect(errors([{ line: 0, vars: { b: null } }])).toEqual([
      'steps.0.vars.b: null removes the box "b", but it isn\'t shown at this step',
    ]);
  });

  it('push / pop call-stack frames; vars apply to the top frame', () => {
    expect(
      errors([
        { line: 0, push: { name: 'main', vars: { a: '1' } } },
        { line: 1, push: { name: 'heal', vars: { hp: '3' } } },
        { line: 1, vars: { hp: null } },
        { line: 2, pop: true },
        { line: 3, vars: { a: null } },
      ]),
    ).toEqual([]);
    // hp lives in heal's frame, which is gone
    expect(errors([{ line: 0, push: { name: 'heal', vars: { hp: '3' } } }, { line: 1, pop: true, vars: { hp: null } }]))
      .toHaveLength(1);
    expect(errors([{ line: 0, pop: true }])).toEqual(['steps.0.pop: pop without a pushed frame']);
    expect(errors([{ line: 0, pop: false }])).toHaveLength(1);
  });

  it('mem: pointer arrows, null, refs, drop, groups', () => {
    expect(
      errors([
        { line: 0, mem: { cells: [{ name: 'a', value: '1', addr: '0x10' }, { name: 'life', ref: 'a' }] } },
        { line: 1, mem: { cells: [{ name: 'p', ptr: 'a', readonly: true }] } },
        { line: 2, mem: { cells: [{ name: 'p', ptr: null }], drop: ['a'] } },
        { line: 3, mem: { cells: [{ name: 'loot0', value: '5', group: 'loot' }] } },
      ]),
    ).toEqual([]);
    expect(errors([{ line: 1, mem: { cells: [{ name: 'p', ptr: 'ghost' }] } }])).toEqual([
      'steps.0.mem.cells.0.ptr: no cell named "ghost" at this step',
    ]);
    expect(errors([{ line: 1, mem: { drop: ['ghost'] } }])).toEqual(['steps.0.mem.drop.0: no cell named "ghost" to drop']);
    expect(errors([{ line: 0, mem: { cells: [{ name: 'a' }, { name: 'r', ref: 'a', value: '1' }] } }])).toHaveLength(1);
    expect(errors([{ line: 0, mem: { cells: [{ name: 'a', colour: 'red' }] } }])).toHaveLength(1);
  });

  it('parses mem defaults', () => {
    const d = DemoSchema.parse({ code, steps: [{ line: 0, mem: { cells: [{ name: 'a' }] } }] });
    expect(d.steps[0]!.mem).toEqual({ cells: [{ name: 'a' }], drop: [] });
  });
});
