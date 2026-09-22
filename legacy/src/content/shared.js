/* Cpp Hero: shared content (bestiary, achievements, cosmetics, daily quests).
 * Pure data for ALL 16 worlds, so collection counts stay stable across stages.
 *
 * QUEST EVENTS (the engine emits these on CH's event bus; quests listen by `event`):
 *   "lesson.done"        a lesson was finished.                       progress += 1
 *   "answer.correct"     any challenge answered correctly.            progress += 1
 *   "combo"              combo counter changed; payload { n }.        progress = max(progress, n)
 *   "defensive.correct"  a defensive challenge (bug, breakit, harden,
 *                        review, edge, safe) answered correctly.      progress += 1
 *   "review.done"        a spaced-repetition review item answered.    progress += 1
 *   "xp"                 XP earned; payload { amount }.               progress += amount
 *   "boss.round"         a boss round won (one hit on the boss).      progress += 1
 *   "hint.none"          a challenge answered correctly without
 *                        opening any hint.                            progress += 1
 * A quest is done when progress >= goal; claiming it grants `xp`.
 *
 * ACHIEVEMENT `test` DSL (see docs/ARCHITECTURE.md):
 *   "lessons:N" "combo:N" "streak:N" "bestiary:<bugId>" "hardened:N" "world:wN" (boss of wN beaten)
 *   "perfect:N" (lessons finished with 100% accuracy) "reviews:N"
 *
 * Bestiary `art` keys: imp, bug, ghost, slime, worm, spider, moth, gremlin.
 * Colors come from the Pop Path palette: #F2641B #FFC62E #FF5A70 #0FA898 #3D8BFF #2A2140 (+ tints).
 */
(function () {
  var C = window.CH.content;

  /* ------------------------------------------------------------ BESTIARY */
  C.bestiary.push(
    { id: "missing-semicolon", name: "Semicolon Snatcher", world: "w1", art: "gremlin", color: "#F2641B",
      how: "A statement loses its ; so the compiler runs into the next line. Errors often point just past the mistake.",
      prevent: "End every statement with ;. When an error says \"expected ';' before ...\", check the end of the previous line." },
    { id: "typo-gremlin", name: "Typo Gremlin", world: "w1", art: "gremlin", color: "#FFC62E",
      how: "A misspelled name or header (std::cuot, <iostrem>, std:cout) that the compiler can't find.",
      prevent: "Read the whole error message: it quotes the unknown name and often suggests the right one (\"did you mean 'cout'?\")." },
    { id: "uninit-var", name: "Garbage Blob", world: "w2", art: "slime", color: "#0FA898",
      how: "A variable is read before it's given a value. That's undefined behavior: you might see 0, garbage, or something that changes between runs.",
      prevent: "Always initialize: int score{0};. Build with -Wall -Wextra to get warnings about uninitialized use." },
    { id: "narrowing", name: "Narrowing Worm", world: "w2", art: "worm", color: "#8FD9CF",
      how: "A value squeezes into a smaller type and silently loses data: int x = 3.9; stores 3.",
      prevent: "Use brace initialization: int x{3.9}; is a compile error, so the loss can't sneak by. Convert explicitly with static_cast when you mean it." },
    { id: "div-by-zero", name: "Zero-Void Moth", world: "w3", art: "moth", color: "#2A2140",
      how: "Integer division or % by zero is undefined behavior. It may crash, or it may not; nothing is guaranteed.",
      prevent: "Check the divisor before dividing: if (d == 0) { handle it } else { use n / d }." },
    { id: "overflow", name: "Overflow Ooze", world: "w3", art: "slime", color: "#FF5A70",
      how: "Signed integer math goes past the type's limit. That's undefined behavior: it often wraps negative, but nothing is guaranteed.",
      prevent: "Check against std::numeric_limits before the operation, or use a wider type like long long when values can get big." },
    { id: "cin-fail", name: "Stuck-Stream Golem", world: "w3", art: "bug", color: "#3D8BFF",
      how: "std::cin >> n gets text, not a number. The stream fails, n becomes 0, and later reads fail too.",
      prevent: "Test the read: if (!(std::cin >> n)) { std::cin.clear(); std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n'); }." },
    { id: "float-equality", name: "Float Phantom", world: "w4", art: "ghost", color: "#9DC3FF",
      how: "Comparing floating-point results with ==. 0.1 + 0.2 == 0.3 is false because of tiny rounding errors.",
      prevent: "Compare with a tolerance: std::abs(a - b) < 1e-9 (scaled to your values)." },
    { id: "missing-default", name: "Fallthrough Spider", world: "w4", art: "spider", color: "#FFC62E",
      how: "A switch without break falls through into the next case, or without default silently ignores values nobody expected.",
      prevent: "End each case with break (or mark intentional fallthrough with [[fallthrough]]), and always add a default." },
    { id: "off-by-one", name: "Off-by-One Imp", world: "w5", art: "imp", color: "#F2641B",
      how: "A loop runs one time too many or too few, like i <= size instead of i < size.",
      prevent: "Use half-open ranges (start at 0, stop at < size), or a range-for loop that can't miscount." },
    { id: "infinite-loop", name: "Loop-de-Loop Worm", world: "w5", art: "worm", color: "#0FA898",
      how: "The loop's condition never becomes false, often because the counter is never updated, or is updated the wrong way.",
      prevent: "Make sure every path through the loop moves toward the exit condition; prefer for loops with the update in the header." },
    { id: "signed-unsigned", name: "Sign-Flip Spider", world: "w5", art: "spider", color: "#3D8BFF",
      how: "Comparing a signed int with an unsigned size: -1 < v.size() can be false because -1 converts to a huge unsigned number.",
      prevent: "Heed -Wsign-compare. Use std::size_t for sizes, or std::ssize (C++20) when you need signed." },
    { id: "dangling-ref", name: "Echo Wraith", world: "w6", art: "ghost", color: "#2A2140",
      how: "A function returns a reference to a local variable that's destroyed when the function ends. Using it is undefined behavior.",
      prevent: "Return by value. Only return references to things that outlive the call." },
    { id: "out-of-bounds", name: "Bounds Breaker", world: "w7", art: "bug", color: "#FF5A70",
      how: "Accessing v[10] in a vector of 10 elements. [] doesn't check, so it's undefined behavior: garbage, a crash, or silent corruption.",
      prevent: "Use .at() (throws std::out_of_range) or check the index against size() first; prefer range-for." },
    { id: "iterator-invalidation", name: "Iterator Moth", world: "w7", art: "moth", color: "#FFC62E",
      how: "Adding to a vector (push_back) can move its elements, leaving existing iterators, pointers and references dangling.",
      prevent: "Don't hold iterators across modifications; re-fetch them, use indexes, or use the iterator returned by erase/insert." },
    { id: "null-deref", name: "Null Void", world: "w8", art: "ghost", color: "#3D8BFF",
      how: "Dereferencing a pointer that is nullptr. Undefined behavior, usually a crash, but not guaranteed.",
      prevent: "Check if (p != nullptr) before *p, or use references when something must always exist." },
    { id: "dangling-pointer", name: "Dangling Spider", world: "w8", art: "spider", color: "#0FA898",
      how: "A pointer still holds the address of something that no longer exists (a local that went out of scope, or freed memory).",
      prevent: "Never keep pointers to locals beyond their scope; set pointers to nullptr after the object is gone; prefer smart pointers." },
    { id: "memory-leak", name: "Leaky Slime", world: "w9", art: "slime", color: "#8FD9CF",
      how: "Memory from new is never deleted, so the program keeps using more and more memory.",
      prevent: "Use RAII: std::unique_ptr / std::make_unique and containers own memory and free it automatically (Rule of Zero)." },
    { id: "double-delete", name: "Double-Delete Imp", world: "w9", art: "imp", color: "#FF5A70",
      how: "The same memory is deleted twice. Undefined behavior that can corrupt the heap and crash much later.",
      prevent: "Give each resource exactly one owner (std::unique_ptr). Never delete memory you don't own." },
    { id: "use-after-free", name: "Afterlife Wisp", world: "w9", art: "ghost", color: "#F2641B",
      how: "Memory is used after it was deleted. It may even seem to work, then fail later. That's the danger of undefined behavior.",
      prevent: "Let smart pointers manage lifetimes; don't keep raw pointers to objects someone else may delete." },
    { id: "broken-invariant", name: "Invariant Gremlin", world: "w10", art: "gremlin", color: "#3D8BFF",
      how: "Public data members let any code put an object into an impossible state, like a Health with hp = -50.",
      prevent: "Make data private, validate in constructors and setters, and keep the class's rules true after every public function." },
    { id: "object-slicing", name: "Slicer Bug", world: "w11", art: "bug", color: "#FFC62E",
      how: "A Derived object is copied into a Base by value, slicing off the derived part, so virtual calls use the base version.",
      prevent: "Pass and store polymorphic objects by reference or (smart) pointer, never by value." },
    { id: "missing-virtual-dtor", name: "Hollow Destructor", world: "w11", art: "moth", color: "#2A2140",
      how: "Deleting a Derived through a Base* when Base's destructor isn't virtual is undefined behavior; the derived part is typically never cleaned up.",
      prevent: "Give every polymorphic base class a virtual destructor: virtual ~Base() = default;." },
    { id: "uncaught-exception", name: "Runaway Throw", world: "w12", art: "imp", color: "#FF5A70",
      how: "An exception is thrown and nobody catches it, so std::terminate ends the program abruptly.",
      prevent: "Catch exceptions where you can actually handle them (by const reference), and use RAII so cleanup happens either way." },
    { id: "unconstrained-template", name: "Template Hydra", world: "w13", art: "worm", color: "#0FA898",
      how: "A template accepts any type, then fails deep inside with a huge error message when the type doesn't fit.",
      prevent: "Constrain it: static_assert on the type, or a C++20 concept like template <std::integral T>." },
    { id: "map-bracket-insert", name: "Phantom Key Ghost", world: "w14", art: "ghost", color: "#9DC3FF",
      how: "Reading m[key] on a std::map inserts a default value when the key is missing, silently growing the map.",
      prevent: "Use find() and compare with end(), or contains() (C++20), or at() when the key must exist." },
    { id: "unchecked-find", name: "End-Iterator Imp", world: "w14", art: "imp", color: "#FFC62E",
      how: "The result of find() is dereferenced without checking it against end(). Dereferencing end() is undefined behavior.",
      prevent: "Always write: if (auto it = m.find(k); it != m.end()) { use it->second }." },
    { id: "use-after-move", name: "Hollow Husk", world: "w15", art: "slime", color: "#F2641B",
      how: "An object is used after std::move handed its contents away. It's valid but in an unspecified state, often empty.",
      prevent: "Treat a moved-from object as empty: don't read it again until you assign it a new value." },
    { id: "dangling-capture", name: "Lambda Leech", world: "w15", art: "worm", color: "#2A2140",
      how: "A lambda captures a local by reference [&] and is called after that local has gone out of scope.",
      prevent: "Capture by value ([=] or [x]) for lambdas that outlive the current scope." },
    { id: "ub-hydra", name: "Undefined Hydra", world: "w16", art: "spider", color: "#FF5A70",
      how: "Undefined behavior of every kind at once. It can seem to work today and fail tomorrow, on another compiler, or with optimizations on.",
      prevent: "Defense in depth: warnings as errors, sanitizers (ASan, UBSan), tests for edge cases, and the safe habits from every world." }
  );

  /* -------------------------------------------------------- ACHIEVEMENTS */
  C.achievements.push(
    { id: "hello-universe", name: "Hello, Universe", desc: "Finish your very first lesson.", test: "lessons:1" },
    { id: "brace-yourself", name: "Brace Yourself", desc: "Finish 5 lessons.", test: "lessons:5" },
    { id: "semicolon-marathon", name: "Semicolon Marathon", desc: "Finish 25 lessons.", test: "lessons:25" },
    { id: "full-stack-of-braces", name: "Full Stack of Braces", desc: "Finish 75 lessons.", test: "lessons:75" },
    { id: "on-a-roll", name: "On a Roll", desc: "Get 5 answers right in a row.", test: "combo:5" },
    { id: "combo-breaker", name: "Combo Breaker", desc: "Hit a 10-answer combo. The meter can barely keep up!", test: "combo:10" },
    { id: "infinite-loop-of-wins", name: "Infinite Loop (the Good Kind)", desc: "Hit a 25-answer combo.", test: "combo:25" },
    { id: "warming-up", name: "Warming Up the Compiler", desc: "Keep a 3-day streak.", test: "streak:3" },
    { id: "week-long-build", name: "Week-Long Build", desc: "Keep a 7-day streak.", test: "streak:7" },
    { id: "long-term-support", name: "Long-Term Support", desc: "Keep a 30-day streak.", test: "streak:30" },
    { id: "zero-warnings", name: "Zero Warnings", desc: "Finish a lesson with 100% accuracy.", test: "perfect:1" },
    { id: "werror-approved", name: "-Werror Approved", desc: "Finish 10 lessons with 100% accuracy.", test: "perfect:10" },
    { id: "shield-apprentice", name: "Shield Apprentice", desc: "Harden 3 snippets.", test: "hardened:3" },
    { id: "fortress-builder", name: "Fortress Builder", desc: "Harden 25 snippets.", test: "hardened:25" },
    { id: "citadel-architect", name: "Citadel Architect", desc: "Harden 100 snippets.", test: "hardened:100" },
    { id: "spaced-out", name: "Spaced Out", desc: "Complete 10 review items.", test: "reviews:10" },
    { id: "memory-palace", name: "Memory Palace", desc: "Complete 50 review items.", test: "reviews:50" },
    { id: "syntax-slayer", name: "Syntax Slayer", desc: "Defeat the Syntax Gremlin (beat World 1).", test: "world:w1" },
    { id: "input-inspector", name: "Input Inspector", desc: "Beat World 3: no bad input gets past you.", test: "world:w3" },
    { id: "pointer-pilot", name: "Pointer Pilot", desc: "Beat World 8: references and pointers mastered.", test: "world:w8" },
    { id: "citadel-keeper", name: "Citadel Keeper", desc: "Beat World 12, the Citadel of defensive programming.", test: "world:w12" },
    { id: "cpp-hero", name: "Cpp Hero", desc: "Beat the Final Boss. The Codebase is safe!", test: "world:w16" },
    { id: "semicolon-savior", name: "Semicolon Savior", desc: "Defeat the Semicolon Snatcher.", test: "bestiary:missing-semicolon" },
    { id: "always-initialized", name: "Always Initialized", desc: "Defeat the Garbage Blob.", test: "bestiary:uninit-var" },
    { id: "off-by-none", name: "Off-by-None", desc: "Defeat the Off-by-One Imp.", test: "bestiary:off-by-one" },
    { id: "bounds-keeper", name: "Bounds Keeper", desc: "Defeat the Bounds Breaker.", test: "bestiary:out-of-bounds" },
    { id: "null-and-void", name: "Null and Void", desc: "Defeat the Null Void.", test: "bestiary:null-deref" },
    { id: "leak-proof", name: "Leak-Proof", desc: "Defeat the Leaky Slime.", test: "bestiary:memory-leak" },
    { id: "moved-on", name: "Moved On", desc: "Defeat the Hollow Husk.", test: "bestiary:use-after-move" }
  );

  /* ----------------------------------------------------------- COSMETICS */
  // slot: "hat" (head/neck accessory) | "color" (Curlo's body color) | "shield" (shield skin)
  // source: where it is earned (display text only).
  C.cosmetics.push(
    { id: "classic", slot: "color", name: "Classic Tangerine", color: "#F2641B", source: "Owned from the start" },
    { id: "gremlin-horns", slot: "hat", name: "Gremlin Horns", source: "Defeat the Syntax Gremlin (World 1)" },
    { id: "blob-bowtie", slot: "hat", name: "Blob Bow Tie", source: "Defeat the Garbage Blob (World 2)" },
    { id: "golem-helm", slot: "hat", name: "Golem Helm", source: "Defeat the Stuck-Stream Golem (World 3)" },
    { id: "party-hat", slot: "hat", name: "Semicolon Party Hat", source: "Reach a 7-day streak" },
    { id: "wizard-hat", slot: "hat", name: "Template Wizard Hat", source: "Beat World 13" },
    { id: "crown", slot: "hat", name: "Crown of Braces", source: "Beat the Final Boss" },
    { id: "berry", slot: "color", name: "Berry Pop", color: "#FF5A70", source: "Finish 10 lessons" },
    { id: "mint", slot: "color", name: "Mint Syntax", color: "#0FA898", source: "Finish 25 lessons" },
    { id: "sky", slot: "color", name: "Sky Compiler", color: "#3D8BFF", source: "Hit a 10-answer combo" },
    { id: "sunny", slot: "color", name: "Sunny Semicolon", color: "#FFC62E", source: "Keep a 3-day streak" },
    { id: "midnight", slot: "color", name: "Midnight Debugger", color: "#2A2140", source: "Complete 50 reviews" },
    { id: "shield-circuit", slot: "shield", name: "Circuit Shield", source: "Harden 25 snippets" },
    { id: "shield-brace", slot: "shield", name: "Double-Brace Shield", source: "Beat World 12" }
  );

  /* -------------------------------------------------------------- QUESTS */
  C.quests.push(
    { id: "lessons2", text: "Complete 2 lessons", goal: 2, event: "lesson.done", xp: 20 },
    { id: "lessons3", text: "Complete 3 lessons", goal: 3, event: "lesson.done", xp: 35 },
    { id: "correct10", text: "Answer 10 challenges correctly", goal: 10, event: "answer.correct", xp: 20 },
    { id: "combo5", text: "Get 5 correct in a row", goal: 5, event: "combo", xp: 25 },
    { id: "harden3", text: "Harden 3 snippets", goal: 3, event: "defensive.correct", xp: 25 },
    { id: "review3", text: "Review 3 old concepts", goal: 3, event: "review.done", xp: 20 },
    { id: "xp100", text: "Earn 100 XP", goal: 100, event: "xp", xp: 20 },
    { id: "xp50", text: "Earn 50 XP", goal: 50, event: "xp", xp: 10 },
    { id: "boss3", text: "Land 3 hits in boss battles", goal: 3, event: "boss.round", xp: 30 },
    { id: "nohint3", text: "Answer 3 challenges without hints", goal: 3, event: "hint.none", xp: 15 },
    { id: "nohint8", text: "Answer 8 challenges without hints", goal: 8, event: "hint.none", xp: 30 }
  );
})();
