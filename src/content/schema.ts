/**
 * Content schema (zod) for every YAML file under content/.
 *
 * This is the single source of truth for the content format described in
 * docs/ARCHITECTURE.md ("Content schema"). The TypeScript types used by the
 * app are inferred from these schemas (see the `export type` lines at the
 * bottom), so the schema and the types can never drift apart.
 *
 * Checks that only need one object (answer index in range, one `___` in a
 * fill/harden snippet, text-length limits, ...) live here as refinements so
 * the reported path points at the exact field. Checks that need the whole
 * content set (unique ids, references between files) live in validate.ts.
 *
 * This module is used at build/dev time only (Vite plugin, scripts). The app
 * bundle imports parsed data and the inferred types, never zod itself.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Text length rules (docs/ARCHITECTURE.md "Text length")              */
/* ------------------------------------------------------------------ */

export const TEXT_LIMITS = {
  conceptShort: 20,
  challengeShort: 15,
  stepNote: 12,
  hint: 15,
  recap: 10,
  speech: 15,
  optionWhy: 20,
} as const;

export const countWords = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

/** A non-empty string of at most `max` words. */
const words = (max: number, what: string) =>
  z
    .string()
    .min(1, `${what} must not be empty`)
    .refine((s) => countWords(s) <= max, {
      error: (iss) => `${what} is ${countWords(String(iss.input))} words; keep it at most ${max}`,
    });

const text = z.string().min(1, 'must not be empty');

/* ------------------------------------------------------------------ */
/* Enums and small building blocks                                     */
/* ------------------------------------------------------------------ */

export const SKILLS = ['logic', 'structure', 'memory', 'toolkit', 'defense'] as const;
export const SkillSchema = z.enum(SKILLS);

export const CHALLENGE_TYPES = [
  'mcq',
  'predict',
  'fill',
  'order',
  'write',
  'bug',
  'breakit',
  'harden',
  'review',
  'edge',
  'safe',
  'speed',
] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

/** Types that need a `sideBySide` (unsafe vs hardened) after answering. `safe` items carry their own why. */
export const DEFENSIVE_TYPES = ['bug', 'breakit', 'harden', 'review', 'edge', 'safe'] as const;
export const TIMED_TYPES = ['speed', 'safe'] as const;

/**
 * What `npm run check:cpp` expects when compiling a snippet
 * (g++ -std=c++20 -Wall -Wextra):
 *   clean  compiles with no warnings
 *   warn   compiles, with at least one warning (e.g. a Shield-lesson demo)
 *   error  must NOT compile (intentionally broken snippet)
 *   skip   not C++ (shell commands, compiler messages); not checked
 * When omitted: `clean` for safe snippets; for unsafe ones (unsafe: true,
 * sideBySide.unsafe, safe-round items marked unsafe) it only has to compile.
 */
export const ExpectSchema = z.enum(['clean', 'warn', 'error', 'skip']);

/**
 * Optional fields for the C++ checker, allowed on anything that holds code.
 *   prelude  declarations placed before a fragment (inside the generated main)
 *            so it compiles, e.g. "int total{7}; int count{2};". Not shown in the app.
 *   stdin    input fed to the program when it is run (predict / demo output checks).
 *            A list means "run once per input and concatenate the outputs".
 */
const checkFields = {
  expect: ExpectSchema.optional(),
  prelude: z.string().optional(),
  stdin: z.union([z.string(), z.array(z.string()).min(1)]).optional(),
};

export const OptionSchema = z.strictObject({
  /** Option text. For `predict` this is the EXACT program output (spaces and newlines matter). */
  t: z.string(),
  /** Why this option is right/wrong (shown after answering). */
  why: words(TEXT_LIMITS.optionWhy, 'why'),
});

export const SideBySideSchema = z.strictObject({
  unsafe: text,
  hardened: text,
  /** Expectation for the `unsafe` version (the hardened one must always compile clean). */
  expect: ExpectSchema.optional(),
  prelude: z.string().optional(),
});

/** Counts `___` blanks in a code snippet. */
export const countBlanks = (code: string | undefined): number => (code ?? '').split('___').length - 1;
const lineCount = (code: string | undefined): number => (code ?? '').split('\n').length;

/* ------------------------------------------------------------------ */
/* Challenges                                                          */
/* ------------------------------------------------------------------ */

/** Fields shared by every challenge type. */
const challengeBase = {
  /** Globally unique, hierarchical: w1.l2.c3, w1.p.s1, w1.p.a1, w1.boss.r1, w1.boss.d1 */
  id: z.string().regex(/^w[a-z0-9]+\.[a-z0-9.]+$/, 'challenge id must look like w1.l2.c3'),
  tags: z.array(z.string().min(1)).default([]),
  prompt: text,
  code: z.string().optional(),
  /** Shows an "UNSAFE, don't copy" badge on the snippet. */
  unsafe: z.boolean().optional(),
  hints: z.array(words(TEXT_LIMITS.hint, 'hint')).max(2, 'at most 2 hints (tier 3 is generated)').default([]),
  /** Shown after answering by default. */
  short: words(TEXT_LIMITS.challengeShort, 'short'),
  /** Full explanation behind "Tell me more". */
  explain: text,
  /** Bestiary id: answering correctly counts toward defeating this bug. */
  bug: z.string().optional(),
  sideBySide: SideBySideSchema.optional(),
  ...checkFields,
};

const options = z.array(OptionSchema).min(2, 'needs at least 2 options');
const answerIndex = z.number().int().min(0);

const McqSchema = z.strictObject({ ...challengeBase, type: z.literal('mcq'), options, answer: answerIndex });
const PredictSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('predict'),
  code: text,
  options,
  answer: answerIndex,
});
const FillSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('fill'),
  code: text,
  accept: z.array(z.string().min(1)).min(1, 'fill needs at least one accepted answer'),
  placeholder: z.string().optional(),
});
const OrderSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('order'),
  /** Lines in the CORRECT order; the engine shuffles them. */
  lines: z.array(z.string()).min(2, 'order needs at least 2 lines'),
  distractors: z.array(z.string()).optional(),
});
const WriteSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('write'),
  accept: z.array(z.string().min(1)).default([]),
  /** Regex sources matched against the NORMALIZED input (see engine/matching.ts). */
  acceptRe: z.array(z.string().min(1)).optional(),
  placeholder: z.string().optional(),
});
const BugChallengeSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('bug'),
  code: text,
  /** 0-based index of the buggy line in `code`. */
  bugLine: z.number().int().min(0),
  options,
  answer: answerIndex,
});
const BreakitSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('breakit'),
  code: text,
  options,
  answer: answerIndex,
});
const HardenSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('harden'),
  code: text,
  options,
  answer: answerIndex,
});
const ReviewSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('review'),
  code: text,
  /** 0-based indices of the dangerous lines. */
  dangerous: z.array(z.number().int().min(0)).min(1, 'review needs at least one dangerous line'),
  /** Per-line notes shown after submitting, keyed by 0-based line index. */
  lineNotes: z.record(z.string().regex(/^\d+$/, 'lineNotes keys are line numbers'), z.string()).default({}),
});
const EdgeSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('edge'),
  code: text,
  options,
  /** Indices of ALL options that expose the bug (multi-select). */
  answers: z.array(answerIndex).min(1, 'edge needs at least one answer'),
});

export const SafeItemSchema = z.strictObject({
  code: text,
  safe: z.boolean(),
  why: words(TEXT_LIMITS.optionWhy, 'why'),
  expect: ExpectSchema.optional(),
  prelude: z.string().optional(),
});
const SafeSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('safe'),
  prompt: z.string().default(''),
  items: z.array(SafeItemSchema).min(1),
  seconds: z.number().int().positive().default(30),
});

export const SpeedItemSchema = z.strictObject({
  q: text,
  code: z.string().optional(),
  options: z.array(z.string()).min(2),
  answer: answerIndex,
  expect: ExpectSchema.optional(),
  prelude: z.string().optional(),
});
const SpeedSchema = z.strictObject({
  ...challengeBase,
  type: z.literal('speed'),
  prompt: z.string().default(''),
  items: z.array(SpeedItemSchema).min(1),
  seconds: z.number().int().positive().default(45),
});

type RawChallenge =
  | z.infer<typeof McqSchema>
  | z.infer<typeof PredictSchema>
  | z.infer<typeof FillSchema>
  | z.infer<typeof OrderSchema>
  | z.infer<typeof WriteSchema>
  | z.infer<typeof BugChallengeSchema>
  | z.infer<typeof BreakitSchema>
  | z.infer<typeof HardenSchema>
  | z.infer<typeof ReviewSchema>
  | z.infer<typeof EdgeSchema>
  | z.infer<typeof SafeSchema>
  | z.infer<typeof SpeedSchema>;

/** Cross-field checks for a single challenge (paths are relative to the challenge). */
function checkChallenge(ch: RawChallenge, ctx: z.RefinementCtx): void {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });

  if ('options' in ch && 'answer' in ch && ch.answer >= ch.options.length) {
    issue(['answer'], `out of range (${ch.answer}; there are ${ch.options.length} options, 0-based)`);
  }
  if ((ch.type === 'fill' || ch.type === 'harden') && countBlanks(ch.code) !== 1) {
    issue(['code'], `${ch.type} code needs exactly one ___ (found ${countBlanks(ch.code)})`);
  }
  if (ch.type === 'write' && ch.accept.length === 0 && !(ch.acceptRe && ch.acceptRe.length)) {
    issue(['accept'], 'write needs accept or acceptRe');
  }
  if (ch.type === 'write') {
    (ch.acceptRe ?? []).forEach((re, i) => {
      try {
        new RegExp(re);
      } catch (e) {
        issue(['acceptRe', i], `invalid regex: ${(e as Error).message}`);
      }
    });
  }
  if (ch.type === 'bug' && ch.bugLine >= lineCount(ch.code)) {
    issue(['bugLine'], `out of range (${ch.bugLine}; code has ${lineCount(ch.code)} lines, 0-based)`);
  }
  if (ch.type === 'review') {
    const n = lineCount(ch.code);
    ch.dangerous.forEach((d, i) => {
      if (d >= n) issue(['dangerous', i], `out of range (${d}; code has ${n} lines, 0-based)`);
    });
    if (new Set(ch.dangerous).size !== ch.dangerous.length) issue(['dangerous'], 'duplicate line index');
    Object.keys(ch.lineNotes).forEach((k) => {
      if (Number(k) >= n) issue(['lineNotes', k], `line ${k} is out of range (code has ${n} lines, 0-based)`);
    });
  }
  if (ch.type === 'edge') {
    ch.answers.forEach((a, i) => {
      if (a >= ch.options.length) issue(['answers', i], `out of range (${a}; there are ${ch.options.length} options)`);
    });
    if (new Set(ch.answers).size !== ch.answers.length) issue(['answers'], 'duplicate answer index');
  }
  if (ch.type === 'speed') {
    ch.items.forEach((it, i) => {
      if (it.answer >= it.options.length) {
        issue(['items', i, 'answer'], `out of range (${it.answer}; there are ${it.options.length} options)`);
      }
    });
  }
  const defensive = (DEFENSIVE_TYPES as readonly string[]).includes(ch.type);
  if (defensive && ch.type !== 'safe' && !ch.sideBySide) {
    issue(['sideBySide'], `${ch.type} is a defensive type and needs sideBySide { unsafe, hardened }`);
  }
  if (ch.stdin !== undefined && ch.type !== 'predict') {
    issue(['stdin'], 'stdin is only used for predict challenges');
  }
}

export const ChallengeSchema = z
  .discriminatedUnion('type', [
    McqSchema,
    PredictSchema,
    FillSchema,
    OrderSchema,
    WriteSchema,
    BugChallengeSchema,
    BreakitSchema,
    HardenSchema,
    ReviewSchema,
    EdgeSchema,
    SafeSchema,
    SpeedSchema,
  ])
  .superRefine(checkChallenge);

/* ------------------------------------------------------------------ */
/* Lessons, vault, demo                                                */
/* ------------------------------------------------------------------ */

export const VaultCardSchema = z.strictObject({
  id: z.string().regex(/^w[a-z0-9]+\.[a-z0-9.-]+$/, 'vault id must look like w1.hello'),
  title: text,
  code: z.string(),
  note: z.string(),
  /** true → shown in the "Defense Rules" tab. */
  defense: z.boolean().default(false),
  expect: ExpectSchema.optional(),
  prelude: z.string().optional(),
});

/**
 * A memory cell in a demo's memory view (`mem`, see docs/ARCHITECTURE.md
 * "Demo memory view"). Cells are keyed by `name`; a later step that names the
 * same cell updates only the fields it gives.
 *   value  shown inside the cell ("?" = garbage, as in vars)
 *   addr   small address label under the cell, e.g. "0x10" (display only)
 *   ptr    this cell is a pointer: the name of the cell it points at, or null
 *          for nullptr (drawn as a short stub ending in ⊘). Absent = not a pointer.
 *   ref    this name is a reference: shown as an extra name tag on the target
 *          cell, no box and no arrow ("a reference is another name")
 *   group  cells with the same group sit side by side in one strip (arrays)
 *   readonly  a pointer/reference through which the target can't be changed
 *          (const T*, const T&): drawn with a lock
 */
export const MemCellSchema = z
  .strictObject({
    name: z.string().min(1),
    value: z.string().optional(),
    addr: z.string().optional(),
    ptr: z.string().min(1).nullable().optional(),
    ref: z.string().min(1).optional(),
    group: z.string().min(1).optional(),
    readonly: z.boolean().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.ref !== undefined && (c.ptr !== undefined || c.value !== undefined || c.addr !== undefined || c.group)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ref'],
        message: 'a ref cell is only another name: it cannot also have ptr, value, addr or group',
      });
    }
    if (c.ref === c.name || (c.ptr !== undefined && c.ptr === c.name)) {
      ctx.addIssue({ code: 'custom', path: [c.ref === c.name ? 'ref' : 'ptr'], message: 'a cell cannot target itself' });
    }
  });

/** Memory-view changes for one demo step: upserted cells, then cells whose lifetime ended. */
export const DemoMemSchema = z.strictObject({
  /** Cells to create or update (keyed by name, fields merge with earlier steps). */
  cells: z.array(MemCellSchema).default([]),
  /**
   * Cells whose lifetime ended (scope exit, return). They crumble into a
   * "ghost" slot; arrows still pointing at them turn red and dashed (dangling).
   */
  drop: z.array(z.string().min(1)).default([]),
});

/** A call-stack frame pushed by a demo step. */
export const DemoFrameSchema = z.strictObject({
  /** Function name shown on the frame card, e.g. "heal" (or "main"). */
  name: z.string().min(1),
  /** The frame's first boxes (parameters), e.g. { hp: "3", amount: "5" }. */
  vars: z.record(z.string(), z.string()).optional(),
});

export const DemoStepSchema = z.strictObject({
  /** 0-based line index into demo.code. */
  line: z.number().int().min(0),
  note: words(TEXT_LIMITS.stepNote, 'step note').optional(),
  /** Text appended to the live output console at this step. */
  out: z.string().optional(),
  /**
   * Variable boxes to show/update (merged into the boxes of earlier steps);
   * "?" = uninitialized/garbage, null = remove the box (it went out of scope).
   * While call-stack frames are in use (push), vars apply to the TOP frame.
   */
  vars: z.record(z.string(), z.string().nullable()).optional(),
  /**
   * Call stack: `pop: true` removes the top frame (its boxes vanish), then
   * `push` puts a new frame on top. Order within a step: pop, push, vars, mem.
   */
  pop: z.literal(true).optional(),
  push: DemoFrameSchema.optional(),
  /** Memory cells and pointer arrows (see MemCellSchema). */
  mem: DemoMemSchema.optional(),
  /** Themed crash animation text (unsafe demos). */
  crash: z.string().optional(),
  /** Shield-deflect text (hardened demos). */
  shield: z.string().optional(),
});

/**
 * Replays a demo's steps and reports what doesn't add up: a line out of
 * range, removing a box that isn't there, popping an empty stack, or a mem
 * pointer/reference/drop that names a cell no step has defined yet.
 */
function checkDemoSteps(d: { code: string; steps: DemoStep[] }, ctx: z.RefinementCtx): void {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path: ['steps', ...path], message });
  const n = lineCount(d.code);
  // Frame 0 is the implicit base frame (boxes set before any push).
  const frames: Set<string>[] = [new Set()];
  const cells = new Set<string>();
  d.steps.forEach((s, i) => {
    if (s.line >= n) issue([i, 'line'], `out of range (${s.line}; demo code has ${n} lines, 0-based)`);
    if (s.pop) {
      if (frames.length > 1) frames.pop();
      else issue([i, 'pop'], 'pop without a pushed frame');
    }
    if (s.push) frames.push(new Set(Object.keys(s.push.vars ?? {})));
    const top = frames[frames.length - 1]!;
    for (const [k, v] of Object.entries(s.vars ?? {})) {
      if (v !== null) top.add(k);
      else if (top.has(k)) top.delete(k);
      else issue([i, 'vars', k], `null removes the box "${k}", but it isn't shown at this step`);
    }
    if (s.mem) {
      s.mem.cells.forEach((c) => cells.add(c.name));
      s.mem.cells.forEach((c, j) => {
        const target = c.ref ?? c.ptr;
        if (typeof target === 'string' && !cells.has(target)) {
          issue([i, 'mem', 'cells', j, c.ref !== undefined ? 'ref' : 'ptr'], `no cell named "${target}" at this step`);
        }
      });
      s.mem.drop.forEach((name, j) => {
        if (!cells.has(name)) issue([i, 'mem', 'drop', j], `no cell named "${name}" to drop`);
      });
    }
  });
}

export const DemoSchema = z
  .strictObject({
    code: text,
    steps: z.array(DemoStepSchema).min(1),
    ...checkFields,
  })
  .superRefine(checkDemoSteps);

export const ConceptSchema = z.strictObject({
  short: words(TEXT_LIMITS.conceptShort, 'concept.short'),
  analogy: z.string().optional(),
  body: z.array(z.string()).default([]),
  pitfall: z.string().optional(),
});

export const LessonSchema = z.strictObject({
  id: z.string().regex(/^w[a-z0-9]+\.l\d+$/, 'lesson id must look like w1.l1'),
  title: text,
  skill: SkillSchema,
  shield: z.boolean().default(false),
  concept: ConceptSchema,
  demo: DemoSchema.optional(),
  challenges: z.array(ChallengeSchema).min(1, 'a lesson needs challenges'),
  recap: z.array(words(TEXT_LIMITS.recap, 'recap bullet')).default([]),
  vault: z.array(VaultCardSchema).default([]),
  /** Older concept tags to interleave (1–2 review challenges are pulled in). */
  reviewTags: z.array(z.string()).default([]),
});

/* ------------------------------------------------------------------ */
/* Project and boss                                                    */
/* ------------------------------------------------------------------ */

export const AttackSchema = z.strictObject({
  /** The hostile input, e.g. "-5", "abc", "" */
  input: z.string(),
  label: text,
  challenge: ChallengeSchema,
});

export const ProjectSchema = z.strictObject({
  id: z.string().regex(/^w[a-z0-9]+\.p$/, 'project id must look like w1.p'),
  title: text,
  intro: text,
  steps: z.array(ChallengeSchema).min(1),
  /** The full final program, shown at the end. */
  program: text,
  /** Input used when check:cpp runs `program`. */
  programStdin: z.union([z.string(), z.array(z.string()).min(1)]).optional(),
  stress: z.strictObject({
    intro: words(TEXT_LIMITS.speech, 'stress intro'),
    attacks: z.array(AttackSchema).min(1),
  }),
});

export const BossSchema = z
  .strictObject({
    id: z.string().regex(/^w[a-z0-9]+\.boss$/, 'boss id must look like w1.boss'),
    name: text,
    /** Key into the engine's boss art set. */
    art: text,
    /** One hit per correct answer. */
    hp: z.number().int().positive(),
    intro: words(TEXT_LIMITS.speech, 'boss intro'),
    taunt: z.array(words(TEXT_LIMITS.speech, 'taunt')).default([]),
    rounds: z.array(ChallengeSchema).min(1),
    defense: z.array(z.strictObject({ attack: z.string(), label: text, challenge: ChallengeSchema })).default([]),
    victory: words(TEXT_LIMITS.speech, 'boss victory'),
    reward: z.strictObject({
      xp: z.number().int().min(0).default(0),
      cosmetic: z.string().optional(),
      bug: z.string().optional(),
    }),
  })
  .superRefine((b, ctx) => {
    if (b.rounds.length < b.hp) {
      ctx.addIssue({
        code: 'custom',
        path: ['rounds'],
        message: `needs at least hp (${b.hp}) rounds, has ${b.rounds.length}`,
      });
    }
    if (!b.rounds.some((r) => (TIMED_TYPES as readonly string[]).includes(r.type))) {
      ctx.addIssue({ code: 'custom', path: ['rounds'], message: 'needs at least one timed round (speed or safe)' });
    }
  });

/* ------------------------------------------------------------------ */
/* World (world.yaml holds only the metadata; the loader adds the rest) */
/* ------------------------------------------------------------------ */

const speechLines = z.array(words(TEXT_LIMITS.speech, 'speech line')).min(1);

export const WorldMetaSchema = z.strictObject({
  id: z.string().regex(/^w\d+$/, 'world id must look like w1'),
  num: z.number().int().positive(),
  title: text,
  /** Key into the engine's icon set. */
  icon: text,
  blurb: text,
  /** Curlo's lines, one speech bubble each. */
  story: z.strictObject({ intro: speechLines, bossIntro: speechLines, victory: speechLines }),
});

/* ------------------------------------------------------------------ */
/* Shared data (content/shared/*.yaml, each a top-level list)          */
/* ------------------------------------------------------------------ */

export const BugSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, 'bug id must be kebab-case'),
  name: text,
  /** World where it is first met, e.g. "w5". */
  world: z.string().regex(/^w\d+$/),
  /** Key into the engine's bug art set. */
  art: text,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'color must be #RRGGBB'),
  how: text,
  prevent: text,
});

/** Achievement test DSL: kind:arg (see engine/achievements.ts). */
export const ACHIEVEMENT_KINDS = [
  'lessons',
  'combo',
  'streak',
  'bestiary',
  'hardened',
  'world',
  'perfect',
  'reviews',
  'xp',
  'level',
  'correct',
  'bosses',
  'vault',
  'projects',
] as const;

export const AchievementSchema = z.strictObject({
  id: z.string().min(1),
  name: text,
  desc: text,
  test: z.string().regex(/^[a-z]+:.+$/, 'test must look like "lessons:5" or "bestiary:<bug-id>"'),
  /** Optional cosmetic granted with the achievement. */
  cosmetic: z.string().optional(),
});

export const CosmeticSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, 'cosmetic id must be kebab-case'),
  slot: z.enum(['hat', 'color', 'shield']),
  name: text,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  /** How it is earned (display text; the engine also parses common phrasings). */
  source: text,
  /** Optional explicit unlock rule in the achievement DSL (overrides `source` parsing). */
  test: z.string().optional(),
});

export const QuestSchema = z.strictObject({
  id: z.string().min(1),
  text: text,
  goal: z.number().int().positive(),
  /** Engine event name (see engine/quests.ts QUEST_EVENTS). */
  event: text,
  xp: z.number().int().min(0),
  /** "max" = progress is the best value seen (combo-style) instead of a running sum. */
  mode: z.enum(['sum', 'max']).optional(),
});

export const BestiarySchema = z.array(BugSchema);
export const AchievementsSchema = z.array(AchievementSchema);
export const CosmeticsSchema = z.array(CosmeticSchema);
export const QuestsSchema = z.array(QuestSchema);

/* ------------------------------------------------------------------ */
/* Inferred types                                                      */
/* ------------------------------------------------------------------ */

export type Skill = z.infer<typeof SkillSchema>;
export type Expect = z.infer<typeof ExpectSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type SideBySide = z.infer<typeof SideBySideSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
/** Narrow a Challenge by its `type`, e.g. ChallengeOf<'fill'>. */
export type ChallengeOf<T extends ChallengeType> = Extract<Challenge, { type: T }>;
export type SafeItem = z.infer<typeof SafeItemSchema>;
export type SpeedItem = z.infer<typeof SpeedItemSchema>;
export type VaultCard = z.infer<typeof VaultCardSchema>;
export type DemoStep = z.infer<typeof DemoStepSchema>;
export type DemoFrame = z.infer<typeof DemoFrameSchema>;
export type DemoMem = z.infer<typeof DemoMemSchema>;
export type MemCell = z.infer<typeof MemCellSchema>;
export type Demo = z.infer<typeof DemoSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Attack = z.infer<typeof AttackSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Boss = z.infer<typeof BossSchema>;
export type WorldMeta = z.infer<typeof WorldMetaSchema>;
export type Bug = z.infer<typeof BugSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type Cosmetic = z.infer<typeof CosmeticSchema>;
export type Quest = z.infer<typeof QuestSchema>;

/** A world as the app sees it: world.yaml + its lesson files + project + boss. */
export interface World extends WorldMeta {
  lessons: Lesson[];
  project: Project;
  boss: Boss;
}

/** Everything under content/, parsed and validated. */
export interface Content {
  worlds: World[];
  bestiary: Bug[];
  achievements: Achievement[];
  cosmetics: Cosmetic[];
  quests: Quest[];
}
