/**
 * Replays a demo's steps into the full picture after each step: the call
 * stack with its variable boxes, and the memory view (cells + arrows).
 *
 * Steps only carry changes (see DemoStepSchema in schema.ts); renderers such
 * as CodeDemo can use `demoStates(steps)[i]` instead of re-implementing the
 * merge rules. Pure and type-only on the schema, so it is safe for the app bundle.
 *
 * Rules, in order within a step:
 *   pop   removes the top frame (never the base frame)
 *   push  adds a frame on top with its `vars`
 *   vars  set/update boxes in the top frame; null removes a box
 *   mem   cells upsert by name (given fields replace earlier ones, the rest are
 *         kept); `drop` marks cells as dead (ghost slots). Giving a cell a
 *         new role (ref / ptr or value / layers) clears the old one, so a
 *         sliced copy can later turn into a reference tag, and so on.
 */
import type { DemoStep, MemCell } from './schema.ts';

export interface DemoFrameState {
  /** Function name; "" for the implicit base frame (boxes set before any push). */
  name: string;
  /** Boxes in the order they first appeared. */
  vars: Record<string, string>;
}

export interface MemCellState extends MemCell {
  /** The cell's lifetime ended (`mem.drop`): draw it as a ghost slot. */
  dropped: boolean;
  /** A pointer (ptr) or reference (ref) whose target has been dropped. */
  dangling: boolean;
}

export interface DemoState {
  /** Bottom first. frames[0] is the base frame; it is the only one when a demo never pushes. */
  frames: DemoFrameState[];
  /** Memory cells in the order they first appeared. */
  cells: MemCellState[];
  /** The frame removed at this step, if any (for the slide-off animation). */
  popped?: DemoFrameState;
  /** Value returned to the caller at this step (`pop: { returns }`). */
  returns?: string;
}

type Role = 'ref' | 'box' | 'obj';
const role = (c: MemCell): Role | undefined =>
  c.ref !== undefined ? 'ref' : c.layers ? 'obj' : c.ptr !== undefined || c.value !== undefined ? 'box' : undefined;
const ROLE_FIELDS: Record<Role, (keyof MemCell)[]> = { ref: ['ref'], box: ['ptr', 'value'], obj: ['layers'] };

const copyFrames =(fs: DemoFrameState[]) => fs.map((f) => ({ name: f.name, vars: { ...f.vars } }));

/** State after each step: result[i] is what the learner sees at steps[i]. */
export function demoStates(steps: readonly DemoStep[]): DemoState[] {
  let frames: DemoFrameState[] = [{ name: '', vars: {} }];
  const cells = new Map<string, MemCellState>();
  return steps.map((s) => {
    frames = copyFrames(frames);
    const state: Omit<DemoState, 'frames' | 'cells'> = {};
    if (s.pop && frames.length > 1) {
      state.popped = frames.pop();
      if (s.pop !== true && s.pop.returns !== undefined) state.returns = s.pop.returns;
    }
    if (s.push) frames.push({ name: s.push.name, vars: { ...(s.push.vars ?? {}) } });
    const top = frames[frames.length - 1]!;
    for (const [k, v] of Object.entries(s.vars ?? {})) {
      if (v === null) delete top.vars[k];
      else top.vars[k] = v;
    }
    if (s.mem) {
      for (const c of s.mem.cells) {
        const prev = cells.get(c.name);
        const next: MemCellState = { ...(prev ?? {}), ...c, dropped: false, dangling: false };
        // A cell that switches between reference / pointer or value / object card
        // drops the old role's fields (and its lock, unless the step restates it).
        const was = prev && role(prev);
        const now = role(c);
        if (was && now && was !== now) {
          for (const k of ROLE_FIELDS[was]) delete next[k];
          if (c.readonly === undefined) delete next.readonly;
        }
        cells.set(c.name, next);
      }
      for (const name of s.mem.drop) {
        const c = cells.get(name);
        if (c) cells.set(name, { ...c, dropped: true });
      }
    }
    const snapshot = [...cells.values()].map((c) => {
      const target = c.ref ?? c.ptr;
      return { ...c, dangling: typeof target === 'string' && !!cells.get(target)?.dropped };
    });
    return { ...state, frames, cells: snapshot };
  });
}
