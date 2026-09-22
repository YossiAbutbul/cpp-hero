# Cpp Hero: product requirements

Goal: by the end, the learner can read and write basic-to-intermediate C++, understands memory, uses classes and the STL, and writes code defensively (validating input, handling errors, avoiding undefined behavior). The app should feel like a polished, addictive mobile game you want to open every day, not a tutorial with a points counter bolted on.

Chosen design: **Pop Path** (`designs/5-springboard.html`) with the **original Curlo** mascot from that file, unchanged.

## 1. Technical foundation
- Single-page app, mobile-first, fully responsive (phone + desktop).
- PWA: manifest, service worker, offline support, installable.
- Save progress in localStorage wrapped in try/catch; if unavailable, keep state in memory and show a small notice.
- Export / import progress as a JSON file.
- Versioned save format so progress survives updates.
- Settings: sound on/off, music on/off, reduce animations, text size, reset progress (with in-app confirmation).
- Clean, modular, well-commented code; all lessons/challenges/worlds are data, separate from the engine.

## 2. Onboarding
- Short animated intro: Curlo introduces itself and the story.
- Name your character (or pick from a few variants) and set a daily goal (5 / 10 / 20 min).
- Optional placement quiz to skip worlds you already know.

## 3. Companion character (Curlo)
- Name, distinct personality and voice: explains, encourages, jokes, reacts to mistakes.
- Fully animated: idle breathing/blinking; expressions reacting to what you do (celebrate, worried, cheer, thinking, bracing).
- Evolves visibly at milestones (new forms/outfits/gear) with a dramatic animated evolution sequence.
- Stats in an animated panel: Logic (control flow, loops), Structure (functions, classes, templates), Memory (pointers, references, memory mgmt), Toolkit (STL, modern C++), Defense (validation, error handling, avoiding UB).
- Shield/armor gear that visibly upgrades as Defense grows.
- Tiered hints: gentle nudge → bigger hint → answer with full explanation (each tier costs a little XP).
- Unlockable cosmetics earned through play.

## 4. Pedagogy
- One core concept per lesson, 3–5 minutes.
- Flow: concept with analogy → animated code demo → 3–6 varied challenges → recap card.
- Interleave older topics into newer lessons.
- Defensive thinking from lesson one: how it breaks and how to protect it.
- Every challenge shows an explanation after answering (right or wrong), including why wrong options are wrong.
- Call out common beginner mistakes and why they happen.
- Accurate modern C++ (C++17/20), std:: prefixes, good practices.

## 5. Curriculum: 16 worlds
Each world: 4–6 lessons incl. one Shield Lesson, a mini-project, and a boss battle that unlocks the next world.
1. Hello, World: program structure, #include, main(), std::cout, comments, what compiling means. Shield: compiler warnings are your friend; reading error messages.
2. Variables & Types: int, double, char, bool, std::string, const, auto, type conversion. Shield: always initialize (uninitialized = UB); brace init {} catches narrowing.
3. Operators & Input: arithmetic, comparison, logical, ++/--, std::cin. Shield: validating std::cin (fail state, cin.clear(), cin.ignore()), division by zero, integer overflow.
4. Decisions: if/else if/else, switch, ternary. Shield: handle every case, default in switch, guard clauses/early returns, never compare floats with ==.
5. Loops: for, while, do-while, break/continue, nested. Shield: off-by-one, infinite loops, signed vs unsigned comparisons.
6. Functions: params, return values, overloading, default args, scope. Shield: validating params, assert, const refs, [[nodiscard]], never return a reference to a local.
7. Collections: arrays, std::array, std::vector, std::string ops, range-for. Shield: .at() vs [], iterator invalidation, why string/vector beat raw arrays.
8. References & Pointers: &, *, nullptr, by value vs by reference. Shield: nullptr checks, initialize pointers, dangling pointers/references.
9. Memory: stack vs heap, new/delete, unique_ptr, shared_ptr. Shield: leaks, double delete, use-after-free, RAII, Rule of Zero, prefer smart pointers.
10. Structs & Classes: members, methods, ctors, dtors, access, encapsulation. Shield: private members, validating in ctors, invariants, const member functions, explicit ctors.
11. Inheritance & Polymorphism: base/derived, virtual, override, abstract classes. Shield: virtual destructors, override keyword, object slicing.
12. The Citadel (Defensive Programming & Error Handling): trust-no-input mindset; exceptions (try/catch/throw, std::exception hierarchy, custom exceptions, noexcept, exception safety with RAII); choosing an error strategy (return codes vs exceptions vs std::optional); assert vs static_assert, pre/postconditions, invariants; UB (sources, why "it seemed to work" is dangerous); edge-case thinking and simple tests; tooling concepts (-Wall -Wextra -Werror, ASan, UBSan, clang-tidy).
13. Templates: function & class templates. Shield: static_assert, constraining types (light C++20 concepts).
14. The STL: map, set, iterators, <algorithm>. Shield: check find() against end(), map operator[] inserts, iterator invalidation.
15. Modern C++: lambdas, auto, structured bindings, move basics, enum class, std::optional. Shield: dangling lambda captures, use-after-move, enum class over plain enums.
16. Final Boss: multi-stage challenge combining everything, ending with a full defense gauntlet.

Mini-projects: guided build in validated steps; always end with a "Stress Test" step where the game throws bad input and the learner fixes what breaks.

## 6. Challenge types
Core: predict output, fill in the blank, spot & fix the bug, drag-and-drop line ordering, MCQ concept checks, "write a line" with flexible matching, timed speed rounds.
Defensive: Break It, Harden It, Code Review (tap dangerous lines), Edge Case Hunt, Safe or Unsafe? (rapid fire). For defensive challenges, always show unsafe and hardened versions side by side after answering.

## 7. Motion (core feature)
- Themed screen transitions; micro-interactions (press/bounce/glow, hover & focus on desktop, subtle idle motion).
- Correct: particles/confetti + Curlo celebration. Wrong: shake + gentle color flash, then explanation slides in.
- Code visualizations (most important): typing effect; line-by-line execution highlighting with a live output console; variables as boxes that fill/update; pointers as arrows between memory cells; loop counters ticking; function calls as stack frames push/pop; objects as cards, inheritance as linked cards.
- Defense visuals: unsafe code → themed crash (glitch, memory cells scrambling, corrupted console); hardened → shield deflects.
- Drag-and-drop: lift with shadow, snap with bounce.
- Progress: smooth XP bars, count-up numbers, dramatic level-up/achievement reveals.
- World map: animated path unlocking, pulsing current marker, ambient/parallax motion.
- Boss battles: entrance animation, health bar drops per correct answer, defense phase (boss attacks with hostile inputs: negatives, empty strings, huge values, nullptr, invalid text) that you block by hardening code, victory sequence.
- Streaks/combos: flame/energy effects that grow.
- Rules: transforms/opacity for 60fps; rAF or GSAP (cdnjs) for complex sequences; most animations < 400ms; celebrations skippable by tap; respect prefers-reduced-motion and the in-app toggle; smooth on mobile.

## 8. Retention
XP, levels, level-ups; daily streak + earnable streak freeze; daily quests ("Complete 2 lessons", "Get 5 correct in a row", "Harden 3 snippets", "Review 3 old concepts"); hearts that refill over time or via practice reviews; combo multipliers; achievements with fun names incl. defensive ones ("Null and Void", "Bounds Keeper", "Leak-Proof"); spaced-repetition review of missed concepts; Code Vault (personal cheat sheet, separate "Defense Rules" section); Bug Bestiary (collectible gallery of defeated bug types, each with illustration, how it happens, how to prevent it); Practice Arena (replay unlocked challenge types for bonus XP); light story told through Curlo with a reason to beat each boss; Stats screen (time spent, accuracy per topic, strongest/weakest skills, bugs defeated).

## 9. Sound
Web Audio API generated SFX (tap, correct, wrong, shield block, crash, level-up, unlock); optional ambient music loop; everything mutable.

## 10. Accessibility
Readable sizes, good contrast, keyboard navigation, visible focus, never color alone for right/wrong.

## 11. Content accuracy
All C++ valid (except intentionally broken snippets); trace every predict-the-output answer exactly incl. spacing/newlines; clearly label unsafe snippets; hardened versions genuinely safe and valid; explain that UB doesn't guarantee a crash.

## 12. Delivery (stages)
- Stage 1: core engine, onboarding, character, map, progress & save, animations, sound, Worlds 1–3 fully playable.
- Stage 2: Worlds 4–8. Stage 3: Worlds 9–12. Stage 4: Worlds 13–16, final boss, bestiary completion, polish.
- Save format stays stable between stages.
- Checklist per stage: no broken buttons or dead ends; every challenge has a correct answer + explanation; C++ follows accuracy rules; animations smooth and respect reduced motion; progress saves, reloads, exports, imports.
