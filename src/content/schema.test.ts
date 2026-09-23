import { describe, expect, it } from 'vitest';
import { demoStates } from './demoState';
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

describe('pop with a return value', () => {
  it('accepts pop: { returns }', () => {
    expect(
      errors([
        { line: 0, push: { name: 'heal', vars: { hp: '3' } } },
        { line: 1, pop: { returns: '8' } },
      ]),
    ).toEqual([]);
    expect(errors([{ line: 0, push: { name: 'f' } }, { line: 1, pop: { value: '8' } }])).toHaveLength(1);
  });
});

describe('demoStates', () => {
  it('replays frames, vars and mem cells per step', () => {
    const d = DemoSchema.parse({
      code,
      steps: [
        { line: 0, vars: { a: '1' }, mem: { cells: [{ name: 'a', value: '1' }] } },
        { line: 1, push: { name: 'heal', vars: { hp: '3' } }, mem: { cells: [{ name: 'p', ptr: 'a' }] } },
        { line: 1, vars: { hp: '8' } },
        { line: 2, pop: { returns: '8' }, mem: { drop: ['a'] } },
        { line: 3, vars: { a: null }, mem: { cells: [{ name: 'p', ptr: null }] } },
      ],
    });
    const st = demoStates(d.steps);
    expect(st[0]!.frames).toEqual([{ name: '', vars: { a: '1' } }]);
    expect(st[1]!.frames.map((f) => f.name)).toEqual(['', 'heal']);
    expect(st[2]!.frames[1]!.vars).toEqual({ hp: '8' });
    expect(st[1]!.frames[1]!.vars).toEqual({ hp: '3' }); // earlier snapshots are not mutated
    expect(st[3]!.popped).toEqual({ name: 'heal', vars: { hp: '8' } });
    expect(st[3]!.returns).toBe('8');
    expect(st[3]!.cells.find((c) => c.name === 'p')).toMatchObject({ ptr: 'a', dangling: true });
    expect(st[3]!.cells.find((c) => c.name === 'a')).toMatchObject({ value: '1', dropped: true });
    expect(st[4]!.frames).toEqual([{ name: '', vars: {} }]);
    expect(st[4]!.cells.find((c) => c.name === 'p')).toMatchObject({ ptr: null, dangling: false });
  });
});

describe('object cards and husks', () => {
  const hero = { class: 'Hero', fields: { hp_: '30' } };
  const knight = { class: 'Knight', fields: { armor_: '5' } };

  it('layers are a role of their own', () => {
    expect(errors([{ line: 0, mem: { cells: [{ name: 'k', layers: [hero, knight] }] } }])).toEqual([]);
    expect(errors([{ line: 0, mem: { cells: [{ name: 'k', value: '1', layers: [hero] }] } }])).toEqual([
      'steps.0.mem.cells.0.layers: an object card (layers) cannot also have ptr or value',
    ]);
    expect(errors([{ line: 0, mem: { cells: [{ name: 'k', layers: [] }] } }])).toHaveLength(1);
  });

  it('replays construction, slicing into a reference, and husks', () => {
    const d = DemoSchema.parse({
      code,
      steps: [
        { line: 0, mem: { cells: [{ name: 'k', layers: [hero] }] } },
        {
          line: 1,
          mem: { cells: [{ name: 'k', layers: [hero, knight] }, { name: 'h', layers: [hero, { ...knight, cut: true }] }] },
        },
        {
          line: 2,
          vars: { s: '~' },
          mem: { cells: [{ name: 'h', ref: 'k', readonly: true }, { name: 'p', ptr: 'k' }] },
        },
        { line: 3, mem: { cells: [{ name: 'k', layers: [hero, { ...knight, cut: true }] }], drop: ['h'] } },
        { line: 3, mem: { cells: [{ name: 'h', layers: [hero] }] } },
      ],
    });
    const st = demoStates(d.steps);
    const cell = (i: number, n: string) => st[i]!.cells.find((c) => c.name === n);
    expect(cell(0, 'k')!.layers).toHaveLength(1);
    expect(cell(1, 'k')!.layers).toHaveLength(2);
    expect(cell(1, 'h')!.layers![1]).toMatchObject({ class: 'Knight', cut: true });
    expect(cell(2, 'h')).toMatchObject({ ref: 'k' });
    expect(cell(2, 'h')!.layers).toBeUndefined();
    expect(st[2]!.frames[0]!.vars).toEqual({ s: '~' });
    expect(cell(3, 'k')!.layers![1]!.cut).toBe(true);
    expect(cell(3, 'p')).toMatchObject({ ptr: 'k', dangling: false });
    expect(cell(3, 'h')).toMatchObject({ dropped: true });
    expect(cell(4, 'h')).toMatchObject({ layers: [hero], dropped: false });
    expect(cell(4, 'h')!.ref).toBeUndefined();
    expect(cell(4, 'h')!.readonly).toBeUndefined(); // the ref's lock goes with its role
  });
});
