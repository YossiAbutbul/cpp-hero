# Cpp Hero: architecture & content schema

Cpp Hero is a game-like, mobile-first PWA that teaches C++ from zero with a strong focus on defensive programming. Visual direction: **Pop Path** (see `designs/5-springboard.html`) with the **original Curlo** mascot from that file, used as-is (tangerine jellybean between teal `{ }` braces; moods happy/celebrate/worried/thinking/bracing; shield tiers wood/steel/gold).

## Layout

The app is React 18 + TypeScript (strict) + Vite, with content in YAML. The original
vanilla-JS single-file build lives in `legacy/` (`npm run legacy:build`) as the
behavioral reference until the port is finished.

```
content/                YAML content (see content/README.md): worlds/NN-slug/{world,lesson-NN,project,boss}.yaml, shared/*.yaml
src/
  app/                  App shell: GameProvider (store + game), routes (hash), Stage + transitions, header/HUD, tab bar, hosts
  features/<name>/      screens: map, lesson, challenges, boss, project, curlo, vault, bestiary, practice, stats, settings, onboarding
  engine/               pure game logic, no React/DOM: save/store, progress (XP/levels), boss fight hearts, streak, quests,
                        achievements, cosmetics, srs, matching, contentIndex, game (rules wired together), config
  content/              schema.ts (zod: the content format + inferred types), load.ts/validate.ts (YAML → Content),
                        index.ts + useContent.ts (runtime access; hot-reloads in dev)
  ui/                   shared components, overlays, fx (motion/confetti/celebrations), art; API docs: src/ui/README.md
  styles/               tokens.css (Pop Path), global.css (base, hidden scrollbars, reduced motion, view transitions)
scripts/
  validate-content.ts   npm run validate
  check-cpp.ts          npm run check:cpp (compile/run every snippet via g++)
  convert-legacy-content.ts  one-off legacy JS → YAML converter (round-trip verified)
  lib/vite-plugin-content.ts virtual:cpp-hero-content: YAML parsed + validated at dev/build time
public/icons/           PWA icons (manifest + service worker come from vite-plugin-pwa)
legacy/                 the vanilla build (src, public, dist, tools, build.js)
```

- YAML is parsed and validated in Node (Vite plugin); the browser bundle contains parsed data only.
  Invalid content = dev error overlay / failed build. `npm run build` runs `validate` first.
- The content format below is unchanged from the legacy JS objects, written as YAML, except:
  story fields are always lists of lines, and snippets may carry checker annotations
  (`expect`, `prelude`, `stdin`; see content/README.md) that the app ignores.
- The level is derived from XP with the curve in `src/engine/progress.ts` (150·L XP per level,
  slower than legacy), so imported legacy saves keep their XP but show a lower level.
- PWA: precached app shell (offline), update check on load + hourly, "new version, Refresh?" prompt.

## Save format (versioned, stable across stages)

Stored under localStorage key `cpphero.save`, JSON. Every read/write in try/catch; on failure, keep state in memory and show a small "Progress can't be saved on this device" notice.

```js
{
  v: 1,                          // SAVE_VERSION. migrate(save) upgrades older versions step by step.
  createdAt, updatedAt,          // ISO strings
  profile: { name: "Curlo", variant: "classic", dailyGoalMin: 10, onboarded: true, placementDone: false },
  settings: { sound: true, music: false, reduceMotion: false, textSize: "m" },   // "s" | "m" | "l"
  xp: 0, level: 1,
  hearts: { n: 5, max: 5, lastRefill: ISO },   // unused: kept for old saves and cloud sync (hearts are per boss fight now)
  streak: { days: 0, lastDay: "YYYY-MM-DD", freezes: 0, best: 0 },
  daily: { day: "YYYY-MM-DD", minutes: 0, quests: [{ id, progress, done, claimed }] },
  stats: { logic: 0, structure: 0, memory: 0, toolkit: 0, defense: 0 },   // 0..100 each
  lessons: { "w1.l1": { done: true, best: 1.0, at: ISO } },   // best = accuracy 0..1
  projects: { "w1.p": { done: true, step: 0 } },
  bosses: { "w1.boss": { beaten: true, at: ISO } },
  worldsUnlocked: ["w1"],        // w(n+1) unlocks when w(n) boss beaten (or via placement)
  srs: { "<challengeId>": { box: 1, due: ISO, wrong: 1, right: 0 } },   // Leitner boxes 1..5; intervals 0d,1d,3d,7d,16d
  vault: ["w1.hello", ...],      // unlocked vault card ids
  bestiary: ["off-by-one", ...], // defeated bug ids
  achievements: { "<id>": ISO }, // unlock time
  cosmetics: { owned: ["classic"], equipped: { hat: null, color: "classic" } },
  counters: { correct: 0, wrong: 0, bestCombo: 0, hardened: 0, reviews: 0, secondsPlayed: 0, byTag: { "<tag>": { r: 0, w: 0 } } }
}
```

Export = download JSON file (Blob + `<a download>`); Import = file input → validate `v` and shape → migrate → confirm (in-app dialog, never `confirm()`) → replace.

## Content schema

### World
```js
CH.content.worlds.push({
  id: "w1", num: 1, title: "Hello, World", icon: "rocket",   // icon = key into engine's small SVG icon set
  blurb: "Your first program: what C++ code looks like and how it becomes something that runs.",
  story: { intro: "…Curlo line…", bossIntro: "…", victory: "…" },
  lessons: [ Lesson, … ],        // 4–6, exactly one with shield: true
  project: Project,
  boss: Boss,
});
```

### Lesson
```js
{
  id: "w1.l1", title: "Your first program", skill: "structure",   // logic|structure|memory|toolkit|defense (stat it raises)
  shield: false,                 // true = the world's Shield Lesson (defensive programming)
  concept: {
    short: "Every C++ program starts running at main().",   // REQUIRED. ≤ 20 words; the only text shown by default
    analogy: "A C++ program is like a recipe card…",   // 1 sentence; shown by default under `short`
    // body + pitfall are hidden behind a "Tell me more" expander
    body: ["Paragraph with `inline code`.", "…"],        // markdown-lite: `code`, **bold** only
    pitfall: "Common beginner mistake: … and why it happens.",  // optional
  },
  demo: {                        // animated code demo: typing effect, then step-by-step execution
    code: "#include <iostream>\n\nint main() {\n    std::cout << \"Hi!\\n\";\n    return 0;\n}",
    steps: [                     // executed in order; line is 0-based index into code lines
      { line: 2, note: "Execution starts at main()." },
      { line: 3, out: "Hi!\n", note: "cout prints the text; \\n ends the line." },
      { line: 4, note: "return 0 means success." }
    ],
    // optional per-step (applied in this order: pop, push, vars, mem):
    //   vars: { hp: "3", old: null }  set/update variable boxes ("?" = garbage); null removes a box (out of scope).
    //                                  While call-stack frames are in use, vars change the TOP frame.
    //   push: { name: "heal", vars: { hp: "3" } }   a call-stack frame slides on (params as boxes)
    //   pop: true | { returns: "8" }                the top frame slides off; `returns` travels to the caller
    //   mem: { cells: [ { name, value?, addr?, ptr?: "<cell>" | null, ref?: "<cell>", group?, readonly?, layers? } ],
    //          drop: ["<cell>"] }        memory view: cells upsert by name; ptr draws an arrow (null = nullptr stub),
    //                                    ref = extra name tag on the target, group = array strip, drop = lifetime
    //                                    ended (ghost slot; arrows into it turn red/dashed = dangling)
    //                                    layers: [{ class, fields?, cut?, hit? }] = object card, base part first
    //   any value "?" = garbage, "~" = moved-from husk (valid but unspecified)
    //   crash: "text" (themed crash animation, for unsafe demos), shield: "text" (shield deflect)
    // Types: DemoStep, DemoFrame, DemoPop, DemoMem, MemCell (src/content/schema.ts). Renderers can call
    // demoStates(steps) (src/content/demoState.ts, re-exported from src/content) to get the full
    // frames + cells after each step. Details and examples: content/README.md "Demo steps".
  },
  challenges: [ Challenge, … ],  // 3–6, varied types
  recap: ["One-line takeaway", "…"],     // 2–4 bullets
  vault: [ VaultCard ],          // cards unlocked by finishing this lesson
  reviewTags: ["w1.cout"],       // older tags to interleave (engine pulls 1–2 due/older challenges with these tags)
}
```

### Challenge (common fields)
```js
{
  id: "w1.l1.c1",                // globally unique; used as SRS key
  type: "mcq",                   // see types below
  tags: ["w1.cout"],             // concept tags (for interleaving, stats, weak spots)
  prompt: "What does this print?",
  code: "…",                     // optional C++ snippet (shown syntax-highlighted)
  unsafe: false,                 // true → the snippet is shown with an "UNSAFE — don't copy" badge
  hints: ["gentle nudge", "bigger hint"],   // tier 3 (the answer + explanation) is generated by the engine
  short: "x++ gives the old value, then adds 1.",  // REQUIRED. ≤ 15 words; shown after answering by default
  explain: "Why the right answer is right.",  // full explanation, behind "Tell me more" (with the per-option whys)
  bug: "off-by-one",             // optional bestiary id: answering correctly counts toward defeating it
  sideBySide: { unsafe: "…code…", hardened: "…code…" },   // REQUIRED for defensive types; shown after answering
}
```

Types and their extra fields (engine validates in JS):

| type | extra fields | notes |
|---|---|---|
| `mcq` | `options: [{ t, why }]`, `answer: index` | `why` explains why each wrong option is wrong (shown after answering) |
| `predict` | same as mcq; option `t` is exact output | engine renders outputs in mono with visible `␣` for spaces and `↵` for `\n` |
| `fill` | `code` contains exactly one `___`; `accept: ["str", …]`; `placeholder` | match after normalizing: trim, collapse whitespace, ignore spaces around punctuation `(){}[];,<>=+-*/&|!:` |
| `order` | `lines: ["…", …]` (correct order); optional `distractors: ["…"]` | engine shuffles; drag-and-drop + tap-to-move for accessibility |
| `write` | `accept: ["str", …]`, optional `acceptRe: ["regex source", …]`, `placeholder` | same normalization as fill; regexes matched against normalized input |
| `bug` | `code`, `bugLine: index`, `options: [{t, why}]` (candidate fixes), `answer` | two steps: tap the buggy line, then choose the fix |
| `breakit` | `code`, `options: [{ t: "input or value", why }]`, `answer` | "pick the input that breaks it" |
| `harden` | `code` with one `___`, `options: [{t, why}]`, `answer` | choose the missing check/safer construct |
| `review` | `code`, `dangerous: [lineIdx…]`, `lineNotes: { idx: "why" }` | tap all dangerous lines, then submit; notes shown after |
| `edge` | `code`, `options: [{t, why}]`, `answers: [idx…]` | multi-select: which test inputs expose the bug |
| `safe` | `items: [{ code, safe: bool, why }]`, `seconds: 30` | rapid-fire Safe/Unsafe speed round |
| `speed` | `items: [{ q, code?, options: [..], answer }]`, `seconds: 45` | timed speed round of mini-MCQs |

Defensive types = `bug`, `breakit`, `harden`, `review`, `edge`, `safe`; each needs `sideBySide`, except `safe`, where each item carries its own `why`.

### VaultCard
```js
{ id: "w1.hello", title: "Hello World skeleton", code: "…", note: "…", defense: false }   // defense: true → "Defense Rules" tab
```

### Project (mini-project, ends with a Stress Test)
```js
{
  id: "w1.p", title: "Mission Log", intro: "…",
  steps: [ Challenge, … ],       // guided build steps, usually fill/write/order; each shows the growing program
  program: "…full final program…",   // shown at the end
  stress: {
    intro: "Curlo throws bad input at your program!",
    attacks: [ { input: "abc", label: "Text instead of a number", challenge: Challenge /* usually harden/bug */ } ]
  },
}
```

### Boss
```js
{
  id: "w1.boss", name: "The Syntax Gremlin", art: "gremlin",   // art = key into engine's boss SVG set
  hp: 6,                         // one hit per correct answer
  intro: "…", taunt: ["…", "…"],
  rounds: [ Challenge, … ],      // ≥ hp challenges, mixed types incl. at least one timed one
  defense: [                     // defense phase: boss attacks with hostile inputs, player blocks by hardening
    { attack: "-5", label: "Negative number!", challenge: Challenge /* harden/breakit */ }
  ],
  victory: "…", reward: { xp: 150, cosmetic: "gremlin-horns", bug: "missing-semicolon" },
}
```

### Shared data (`content/shared.js`)
```js
CH.content.bestiary.push({ id: "off-by-one", name: "Off-by-One Imp", world: "w5", how: "…", prevent: "…", art: "imp" });
CH.content.achievements.push({ id: "null-and-void", name: "Null and Void", desc: "…", test: "bestiary:null-deref" });
CH.content.cosmetics.push({ id: "gremlin-horns", slot: "hat", name: "…" });
CH.content.quests.push({ id: "lessons2", text: "Complete 2 lessons", goal: 2, event: "lesson.done", xp: 20 });
```
Achievement `test` is a tiny DSL the engine evaluates: `"lessons:5"`, `"combo:10"`, `"streak:7"`, `"bestiary:<id>"`, `"hardened:3"`, `"world:w3"`, `"perfect:1"`, `"reviews:10"`.

## Text length (user requirement)
Keep on-screen text short. Default view = `short` (+ analogy for concepts, + the "why" of the option the learner picked). Everything longer sits behind a "Tell me more" expander. Demo step notes ≤ 12 words. Hints ≤ 15 words. Recap bullets ≤ 10 words. Curlo speech lines ≤ 15 words.

## C++ accuracy rules (content)
- Modern C++17/20, `std::` prefixes, no `using namespace std;`, `'\n'` preferred over `std::endl` unless flushing is the point.
- Every snippet must compile, except those explicitly meant as compile errors (label them in the prompt).
- Trace every predict-the-output answer exactly, including spaces and newlines.
- Every unsafe snippet: `unsafe: true` (badge) and the prompt/explain says what goes wrong. Every hardened version must be genuinely safe and valid.
- Teach that UB doesn't guarantee a crash: it can seem to work, then fail later or on another compiler.
