/**
 * One-off converter: legacy/src/content/*.js → content/**\/*.yaml
 *
 *   npx tsx scripts/convert-legacy-content.ts
 *
 * - Loads the legacy content files with a window.CH stub (same realm, so the
 *   round-trip deep-equal check compares plain objects).
 * - Normalizes: story fields become string arrays. All ids are kept.
 * - Adds the C++ checker annotations (expect / prelude / stdin) from the
 *   legacy prompts ("intentionally broken", ...) plus the per-snippet table
 *   below (ported from the legacy content agents' extract/check scripts).
 * - Writes multi-line strings (C++ code, multi-line output) as block literals
 *   and falls back to double quotes where a block scalar can't be exact
 *   (trailing spaces/tabs, whitespace-only strings).
 * - Verifies the round trip: parsing the YAML yields data deep-equal to the
 *   legacy objects (ignoring the added checker annotations) and that the
 *   result passes schema validation. Prints any difference; exit 1 on diff.
 *
 * Re-running it overwrites content/worlds and content/shared. After the port,
 * the YAML is the source of truth: edit it directly, not the legacy JS.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { Document, isScalar, isSeq, parse, Scalar, visit } from 'yaml';
import { formatIssue, loadContent } from '../src/content/load.ts';
import { readContentFiles, REPO_ROOT } from './lib/content-fs.ts';

/* eslint-disable @typescript-eslint/no-explicit-any -- legacy data is untyped JS */
type Any = any;

const LEGACY = join(REPO_ROOT, 'legacy', 'src', 'content');
const OUT = join(REPO_ROOT, 'content');
const FILES = ['shared.js', 'world01.js', 'world02.js', 'world03.js'];

/* ------------------------------------------------------------------ */
/* 1. Load legacy content                                              */
/* ------------------------------------------------------------------ */

function loadLegacy(): Any {
  const CH: Any = { content: { worlds: [], bestiary: [], achievements: [], cosmetics: [], quests: [] } };
  const window = { CH };
  for (const f of FILES) {
    const src = readFileSync(join(LEGACY, f), 'utf8');
    new Function('window', 'CH', src)(window, CH);
  }
  // Plain JSON data only (drops undefined, which YAML can't hold either).
  return JSON.parse(JSON.stringify(CH.content));
}

const asLines = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [String(v)]);

/** Legacy → normalized data (what the YAML must round-trip to, minus annotations). */
function normalize(content: Any): Any {
  for (const w of content.worlds) {
    w.story = {
      intro: asLines(w.story.intro),
      bossIntro: asLines(w.story.bossIntro),
      victory: asLines(w.story.victory),
    };
  }
  return content;
}

/* ------------------------------------------------------------------ */
/* 2. C++ checker annotations                                          */
/* ------------------------------------------------------------------ */

interface Note {
  expect?: 'clean' | 'warn' | 'error' | 'skip';
  prelude?: string;
  stdin?: string | string[];
}
interface ChallengeNote extends Note {
  sbs?: Note;
  /** per safe/speed item index */
  items?: Record<number, Note>;
}

/** Prompts that announce an intentionally broken (non-compiling) snippet. */
const BROKEN_RE =
  /intentionally broken|does not compile|doesn't compile|does NOT compile|won't compile|build fails|what happens when you try to compile/i;

/** Snippets that are not C++ at all (shell commands, compiler output). */
const NOT_CPP_RE = /^(g\+\+|clang\+\+|\.\/|\$ |[\w.-]+\.cpp:\d+)/m;

/**
 * Per-snippet annotations, keyed by challenge id / "<lesson id>.demo" /
 * "vault:<card id>" / "<project id>.program". Fragments that use variables
 * they don't declare get a `prelude` with those declarations.
 */
const NOTES: Record<string, ChallengeNote> = {
  /* ---------------- World 1 ---------------- */
  // The side-by-side excerpt shows main() only; the include is implied.
  'w1.l1.c5': { sbs: { prelude: '#include <iostream>' } },
  // Prose steps (the build pipeline), not code.
  'w1.l5.c1': { expect: 'skip' },
  // Unsafe safe-round items that are compile errors (missing ;, std:cout).
  'w1.l6.c4': { items: { 2: { expect: 'error' }, 7: { expect: 'error' } } },
  'w1.l6.c6': { sbs: { expect: 'error' } },
  'w1.boss.d1': { sbs: { expect: 'error' } },
  'w1.boss.d2': { sbs: { expect: 'error' } },

  /* ---------------- World 2 ---------------- */
  'vault:w2.convert': { expect: 'skip' }, // cheat-sheet of expressions with results
  'vault:w2.always-init': { expect: 'skip' }, // redeclares hp three ways side by side
  'w2.l4.c4': { sbs: { prelude: 'int total{9}; int count{2};' } },
  'w2.l4.c5': { sbs: { prelude: 'int hits{3}; int shots{4};' } },
  'w2.l5.c5': { sbs: { prelude: 'double boost{0.9};' } },
  // Steps of the growing program: variables declared for later steps are unused so far.
  'w2.p.s2': { expect: 'warn' },
  'w2.p.s3': { expect: 'warn' },
  'w2.p.s5': {
    prelude:
      'const std::string name{"Ada"}; int level{7}; const int maxHp{120}; int hp{90}; char rank{\'B\'}; bool shielded{true}; double hpRatio{static_cast<double>(hp) / maxHp};',
  },
  'w2.p.a1': { sbs: { prelude: 'const int maxHp{120};' } },
  'w2.p.a2': { sbs: { prelude: 'double configMaxHp{119.9};' } },
  'w2.p.a3': { sbs: { prelude: 'int hp{45}; const int maxHp{120};' } },
  'w2.boss.r8': { sbs: { prelude: 'int a{7}; int b{8};' } },
  'w2.boss.d2': { sbs: { prelude: 'double blobArmor{0.9};' } },
  'w2.boss.d3': { sbs: { prelude: 'int blobs{7}; int squads{2};' } },

  /* ---------------- World 3 (preludes ported from the legacy extract3.js) ---------------- */
  'w3.l1.c6': { prelude: 'int coins{10};' },
  // Teaches && vs || precedence: g++ suggests parentheses (-Wparentheses) on purpose.
  'w3.l3.c2': { expect: 'warn' },
  'w3.boss.r6': { items: { 1: { expect: 'warn' } } },
  'w3.l4.c6': { prelude: 'std::string quest;' },
  'w3.p.s2': { prelude: 'int gold{}; int party{};' },
  'w3.l1.c5': { sbs: { prelude: 'int total = 7; int count = 2;' } },
  'w3.l2.c4': { sbs: { prelude: 'int i = 1;' } },
  'w3.l3.c4': { sbs: { prelude: 'int level = 3;' } },
  'w3.l3.c6': { sbs: { prelude: 'int roll = 0;' } },
  'w3.l5.c2': { sbs: { prelude: 'int x{};' } },
  'w3.l5.c3': { sbs: { prelude: 'int x{};' } },
  'w3.l5.c5': { sbs: { prelude: "int score{2'000'000'000}; int bonus{};" } },
  'w3.l5.c6': {
    sbs: { prelude: 'int n{};' },
    items: {
      0: { prelude: 'int count{2}; int total{7}; int avg{}; (void)avg;' },
      1: { prelude: 'int x{5};' },
      2: { prelude: 'int n{};' },
      3: { prelude: 'int n{};' },
      6: { prelude: 'int a{}; int b{};' },
      7: { prelude: 'int age{};' },
    },
  },
  'w3.p.s3': { prelude: 'int gold{17}; int party{5};' },
  'w3.p.s4': { prelude: 'int gold{17}; int party{5};' },
  'w3.p.s5': {
    prelude: 'int gold{17}; int party{5}; int share = gold / party; int leftover = gold % party;',
  },
  'w3.p.a1': { prelude: 'int gold{17}; int party{};', sbs: { prelude: 'int gold{17}; int party{};' } },
  'w3.p.a2': { sbs: { prelude: 'int gold{}; int party{};' } },
  'w3.p.a3': { prelude: 'int gold{};', sbs: { prelude: 'int gold{};' } },
  'w3.boss.r7': { sbs: { prelude: 'int turn = 1;' } },
  'w3.boss.r8': { sbs: { prelude: 'int age{};' } },
  'w3.boss.r9': { prelude: 'int score{}; int bonus{};', sbs: { prelude: 'int score{}; int bonus{};' } },
  'w3.boss.d1': { sbs: { prelude: 'int potions{};' } },
  'w3.boss.d2': { sbs: { prelude: 'int potions{};' } },
  'w3.boss.d3': { sbs: { prelude: 'int damage{};' } },
  'w3.boss.d4': { sbs: { prelude: 'int shards{12}; int golems{};' } },
  'vault:w3.getline': { prelude: 'int age{}; std::string fullName;' },
  'vault:w3.compare': { expect: 'skip' },
  'vault:w3.precedence': { expect: 'skip' },
  'vault:w3.logic': { prelude: 'int x{3}; bool hurt{}; bool poisoned{}; bool ready{};' },
  'vault:w3.compound': { prelude: 'int hp{10};' },
  'vault:w3.divguard': { prelude: 'int count{}; int total{};' },
  'vault:w3.overflowguard': { prelude: 'int a{}; int b{};' },
  'w3.l4.demo': { stdin: '12\nAda Lovelace\n' },
  'w3.l5.demo': { stdin: ['abc\n', '100 0\n'] },
  'w3.l4.c1': { stdin: 'Curlo the Brave\n' },
  'w3.l4.c2': { stdin: '5\nDragon Slayer\n' },
  'w3.l4.c5': { stdin: '  8\n  3\n' },
  'w3.boss.r5': { stdin: 'abc\n' },
};

function mergeNote(target: Any, note: Note | undefined): void {
  if (!note) return;
  for (const k of ['expect', 'prelude', 'stdin'] as const) if (note[k] !== undefined) target[k] = note[k];
}

/** Rebuild an object with `extra` keys inserted right after `afterKey` (keeps YAML readable). */
function insertAfter(obj: Any, afterKey: string, extra: Any): Any {
  const keys = Object.keys(extra);
  if (!keys.length) return obj;
  const out: Any = {};
  let placed = false;
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k)) continue;
    out[k] = v;
    if (k === afterKey) {
      Object.assign(out, extra);
      placed = true;
    }
  }
  if (!placed) Object.assign(out, extra);
  return out;
}

function annotateChallenge(ch: Any): Any {
  const note = NOTES[ch.id] ?? {};
  const extra: Any = {};
  const codeLike = typeof ch.code === 'string';
  // fill/harden code is checked with the correct answer filled in, so only the
  // side-by-side unsafe version stays broken.
  const blanked = ch.type === 'fill' || ch.type === 'harden';
  const broken = codeLike && BROKEN_RE.test(ch.prompt ?? '');
  if (broken && !blanked) extra.expect = 'error';
  if (codeLike && NOT_CPP_RE.test(ch.code)) extra.expect = 'skip';
  mergeNote(extra, note);
  let out = insertAfter(ch, codeLike ? 'code' : 'prompt', extra);

  if (out.sideBySide) {
    const sbs: Any = { ...out.sideBySide };
    if (broken) sbs.expect = 'error';
    mergeNote(sbs, note.sbs);
    out = { ...out, sideBySide: sbs };
  }
  if (Array.isArray(out.items) && note.items) {
    out = {
      ...out,
      items: out.items.map((it: Any, i: number) => {
        const x: Any = {};
        mergeNote(x, note.items?.[i]);
        return insertAfter(it, 'code', x);
      }),
    };
  }
  return out;
}

function annotateLesson(l: Any): Any {
  const out = { ...l, challenges: l.challenges.map(annotateChallenge) };
  if (l.demo) {
    const x: Any = {};
    mergeNote(x, NOTES[`${l.id}.demo`]);
    out.demo = insertAfter(l.demo, 'code', x);
  }
  out.vault = l.vault.map((v: Any) => {
    const x: Any = {};
    if (NOT_CPP_RE.test(v.code)) x.expect = 'skip';
    mergeNote(x, NOTES[`vault:${v.id}`]);
    return insertAfter(v, 'code', x);
  });
  return out;
}

function annotateProject(p: Any): Any {
  const out = {
    ...p,
    steps: p.steps.map(annotateChallenge),
    stress: {
      ...p.stress,
      attacks: p.stress.attacks.map((a: Any) => ({ ...a, challenge: annotateChallenge(a.challenge) })),
    },
  };
  const n = NOTES[`${p.id}.program`];
  return n?.stdin !== undefined ? insertAfter(out, 'program', { programStdin: n.stdin }) : out;
}

function annotateBoss(b: Any): Any {
  return {
    ...b,
    rounds: b.rounds.map(annotateChallenge),
    defense: b.defense.map((d: Any) => ({ ...d, challenge: annotateChallenge(d.challenge) })),
  };
}

/** Remove the checker annotations again (for the round-trip comparison). */
function stripNotes(v: Any): Any {
  if (Array.isArray(v)) return v.map(stripNotes);
  if (v && typeof v === 'object') {
    const out: Any = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === 'expect' || k === 'prelude' || k === 'stdin' || k === 'programStdin') continue;
      out[k] = stripNotes(x);
    }
    return out;
  }
  return v;
}

/* ------------------------------------------------------------------ */
/* 3. YAML output                                                      */
/* ------------------------------------------------------------------ */

/** Block literals can't safely carry trailing whitespace (editors strip it) or whitespace-only text. */
function needsQuotes(s: string): boolean {
  return /[ \t]$/m.test(s) || s.includes('\t') || s.includes('\r') || s.trim() === '';
}

const FLOW_KEYS = new Set(['tags', 'reviewTags', 'dangerous', 'answers']);

function toYaml(data: unknown, header: string): string {
  const doc = new Document(data);
  visit(doc, {
    Pair(_key, pair) {
      // Short id/index lists read better inline: tags: [w1.main, w1.cout]
      if (isScalar(pair.key) && FLOW_KEYS.has(String(pair.key.value)) && isSeq(pair.value))
        pair.value.flow = true;
    },
    Scalar(_key, node) {
      if (typeof node.value !== 'string') return;
      if (node.value.includes('\n'))
        node.type = needsQuotes(node.value) ? Scalar.QUOTE_DOUBLE : Scalar.BLOCK_LITERAL;
    },
  });
  doc.commentBefore = ' ' + header;
  return doc.toString({ lineWidth: 0, blockQuote: 'literal', indentSeq: true });
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const pad2 = (n: number) => String(n).padStart(2, '0');

function write(rel: string, data: unknown, header: string): void {
  const file = join(OUT, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, toYaml(data, header));
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main(): void {
  const legacy = normalize(loadLegacy());
  rmSync(join(OUT, 'worlds'), { recursive: true, force: true });
  rmSync(join(OUT, 'shared'), { recursive: true, force: true });

  const dirs: string[] = [];
  for (const w of legacy.worlds) {
    const dir = `worlds/${pad2(w.num)}-${slug(w.title)}`;
    dirs.push(dir);
    const { lessons, project, boss, ...meta } = w;
    write(
      `${dir}/world.yaml`,
      meta,
      `World ${w.num}: ${w.title}. Lessons are lesson-NN.yaml (played in file order).`,
    );
    lessons.forEach((l: Any, i: number) =>
      write(
        `${dir}/lesson-${pad2(i + 1)}.yaml`,
        annotateLesson(l),
        `World ${w.num} · Lesson ${i + 1}: ${l.title}${l.shield ? ' (Shield lesson)' : ''}`,
      ),
    );
    write(`${dir}/project.yaml`, annotateProject(project), `World ${w.num} mini-project: ${project.title}`);
    write(`${dir}/boss.yaml`, annotateBoss(boss), `World ${w.num} boss: ${boss.name}`);
  }
  const SHARED_HEADERS: Record<string, string> = {
    bestiary: 'Bug Bestiary: every bug type the learner can defeat (all 16 worlds).',
    achievements: 'Achievements. test = kind:arg, e.g. lessons:5, combo:10, bestiary:<bug id>, world:w3.',
    cosmetics: 'Cosmetics. slot = hat | color | shield; source = how it is earned (display text).',
    quests: 'Daily quests. event = engine event name (see src/engine/questEvents.ts).',
  };
  for (const k of ['bestiary', 'achievements', 'cosmetics', 'quests']) {
    write(`shared/${k}.yaml`, legacy[k], SHARED_HEADERS[k]!);
  }

  /* ---- round-trip check ---- */
  const files = readContentFiles();
  const raw = (rel: string): Any => parse(files.find((f) => f.path === `content/${rel}`)!.text);
  const diffs: string[] = [];
  legacy.worlds.forEach((w: Any, wi: number) => {
    const dir = dirs[wi]!;
    const lessons = w.lessons.map((_: Any, i: number) => raw(`${dir}/lesson-${pad2(i + 1)}.yaml`));
    const back = {
      ...raw(`${dir}/world.yaml`),
      lessons,
      project: raw(`${dir}/project.yaml`),
      boss: raw(`${dir}/boss.yaml`),
    };
    diffAll(w, stripNotes(back), w.id, diffs);
  });
  for (const k of ['bestiary', 'achievements', 'cosmetics', 'quests'])
    diffAll(legacy[k], raw(`shared/${k}.yaml`), k, diffs);

  const res = loadContent(files);
  console.log(`Wrote ${files.length} YAML files under content/.`);
  if (diffs.length) {
    console.log(`\nRound-trip DIFFERENCES (${diffs.length}):`);
    diffs.slice(0, 50).forEach((d) => console.log('  ' + d));
  } else {
    console.log(
      'Round-trip OK: parsed YAML deep-equals the legacy objects (story fields normalized to lists).',
    );
  }
  if (res.issues.length) {
    console.log(`\nSchema validation: ${res.issues.length} issue(s):`);
    res.issues.slice(0, 50).forEach((i) => console.log('  ' + formatIssue(i)));
  } else {
    console.log('Schema validation OK.');
  }
  if (diffs.length || res.issues.length) process.exit(1);
}

/** Collect leaf-level differences between a and b. */
function diffAll(a: Any, b: Any, path: string, out: string[]): void {
  if (isDeepStrictEqual(a, b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) diffAll(a[k], b[k], Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`, out);
    return;
  }
  out.push(`${path}: legacy ${JSON.stringify(a)} != yaml ${JSON.stringify(b)}`);
}

main();
