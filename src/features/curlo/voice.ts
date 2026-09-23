/**
 * Curlo's voice lines (ported from legacy engine/curlo.js; every line ≤ 15
 * words, checked by voice.test.ts). Markdown-lite: **bold** and `code`
 * (render with <Md text={…} />). {name} = the player's chosen name,
 * {n} = a number passed in `vars`.
 */
export const VOICE = {
  greet: [
    'Hey hey! Ready to write some C++?',
    'You’re back! My braces were getting lonely.',
    'Let’s make some code that can’t be broken.',
    'Welcome back, hero! Bugs beware.',
  ],
  idle: [
    'Psst! Always initialize your variables. An empty **int** is a mystery lunchbox.',
    'I once forgot a semicolon. We don’t talk about it. **;**',
    'Validate your input! Users type **anything**. My cousin typed "banana" as an age.',
    'Braces come in pairs, like me! Open one, close one. **{ }**',
    'Compiler warnings are free advice. I frame mine.',
    'Undefined behavior is sneaky: it can **seem** to work. Don’t trust it!',
    'Fun fact: C++ was first called “C with Classes”.',
  ],
  poke: [
    'Hee! That tickles!',
    'Boop received.',
    'Careful, I’m load-bearing punctuation!',
    'Hey! I’m compiling a thought here.',
    '{ squish }',
  ],
  thinking: [
    'Hmm, read it line by line with me.',
    'Take a breath. You’ve got this!',
    'What would the computer do, exactly?',
    'Trace it slowly. Every character counts.',
  ],
  correct: [
    'YES! Nailed it!',
    'Boom! Correct!',
    'You’re on fire! (The good kind.)',
    'Textbook! My braces are doing a happy dance.',
    'Exactly right!',
    'Clean as a fresh compile!',
  ],
  combo: [
    'Combo x{n}! Unstoppable!',
    'x{n} in a row! Are you a compiler?',
    '{n} straight! The bugs are nervous.',
  ],
  wrong: [
    'Oof, close! Let’s look at why.',
    'No worries, mistakes are how we learn.',
    'Hmm, not quite. Check the explanation with me?',
    'That one’s sneaky. Here’s the trick.',
    'Plot twist! Let’s see what really happens.',
  ],
  hint: ['Here’s a little nudge…', 'Okay, a bigger clue…', 'Here’s the full answer. Let’s understand it!'],
  shield: ['Shields up! Nothing gets past us!', 'Blocked! That’s defensive coding!', 'Clang! Deflected!'],
  crash: [
    'Yikes! That input broke it!',
    'Uh-oh… the program went sideways!',
    'Crash! Let’s patch that hole.',
  ],
  lessonDone: ['I’m so proud I could curl.', 'Another concept in the bag!', 'Look at you go!'],
  knockedOut: ['Ouch, that boss got us! Shake it off and go again?', 'Down, but not out! Round two?'],
  streak: ['{n}-day streak! Keep the flame alive!'],
  boss: ['That boss won’t know what hit it.', 'Stay calm. Harden everything.'],
} as const satisfies Record<string, readonly string[]>;

export type VoiceCategory = keyof typeof VOICE;

/**
 * A random line from a category with {placeholders} filled in.
 *   curloLine('combo', { n: 5 })  →  "x5 in a row! Are you a compiler?"
 */
export function curloLine(
  cat: VoiceCategory,
  vars: Record<string, string | number> = {},
  rng: () => number = Math.random,
): string {
  const arr: readonly string[] = VOICE[cat] ?? VOICE.idle;
  const line = arr[Math.floor(rng() * arr.length)] ?? arr[0] ?? '';
  return line.replace(/\{(\w+)\}/g, (m, k: string) =>
    vars[k] != null ? String(vars[k]) : k === 'n' ? '' : m,
  );
}
