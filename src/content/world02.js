/* Cpp Hero: World 2, "Variables & Types".
 * Topics: int, double, char, bool, std::string, const, auto, type conversion
 * (implicit conversion, static_cast, integer division, truncation toward zero).
 * Shield Lesson: always initialize (reading an uninitialized variable is UB);
 * brace initialization {} rejects narrowing at compile time.
 *
 * Pure data. C++ snippets are written with String.raw (the `C` tag below) so they
 * appear exactly as typed: '\n' inside a snippet is the two characters \ and n.
 */
window.CH = window.CH || {};
CH.content = CH.content || {};
["worlds", "bestiary", "achievements", "cosmetics", "quests"].forEach(function (k) {
  if (!Array.isArray(CH.content[k])) CH.content[k] = [];
});

(function () {
  var C = String.raw;

  CH.content.worlds.push({
    id: "w2", num: 2, title: "Variables & Types", icon: "box",
    blurb: "Give your data a home: labelled boxes for numbers, letters, true/false and text, and how values change shape between them.",
    story: {
      intro: "Bugs raided the Codebase pantry and ripped off every box label! Help me {sort} them!",
      bossIntro: "That squelch? The Garbage Blob, made of uninitialized values! Stay behind my braces!",
      victory: "The Blob is a puddle of zeros! Every box has a real value. {:D}",
    },

    lessons: [
      /* =====================================================================
       * Lesson 1: int & double
       * =================================================================== */
      {
        id: "w2.l1", title: "Boxes with names: int & double", skill: "structure", shield: false,
        concept: {
          short: "A variable is a named box with a type: int for whole numbers, double for fractions.",
          analogy: "A variable is a labelled box in Curlo's pantry: the label is its name, the box's shape is its type, and what's inside is its value.",
          body: [
            "A **variable** is a named piece of memory. You declare it with a type, a name and a starting value: `int hp{10};`",
            "`int` holds whole numbers like `42` or `-7`. `double` holds numbers with a fractional part like `2.5` or `-0.75`.",
            "The braces `{}` are **brace initialization**. `int hp = 10;` also works, but braces are pickier in a good way (see the Shield Lesson).",
            "Change a value later with `=`: `hp = 7;` replaces what was inside. The type never changes: an `int` box stays an `int` box forever.",
            "`std::cout << hp;` prints the **value** inside the box, not its name.",
          ],
          pitfall: "Writing `int ratio = 0.75;` compiles, but the box is int-shaped, so it keeps only the whole part: ratio becomes 0. Pick the type that fits your data, and prefer braces: `int ratio{0.75};` refuses to compile instead of silently losing data.",
        },
        demo: {
          code: C`#include <iostream>

int main() {
    int hp{10};
    double speed{2.5};
    hp = hp - 3;
    std::cout << "HP: " << hp << '\n';
    std::cout << "Speed: " << speed << '\n';
    return 0;
}`,
          steps: [
            { line: 2, note: "Execution starts at main(), just like in World 1." },
            { line: 3, vars: { hp: "10" }, note: "A new int box named hp appears, filled with 10." },
            { line: 4, vars: { hp: "10", speed: "2.5" }, note: "A double box can hold the fractional value 2.5." },
            { line: 5, vars: { hp: "7", speed: "2.5" }, note: "Right side first: 10 - 3 = 7, then stored in hp." },
            { line: 6, vars: { hp: "7", speed: "2.5" }, out: "HP: 7\n", note: "cout prints the value inside hp, not the letters h-p." },
            { line: 7, vars: { hp: "7", speed: "2.5" }, out: "Speed: 2.5\n", note: "Doubles print without extra zeros: 2.5, not 2.500000." },
            { line: 8, note: "return 0: the program ends successfully." },
          ],
        },
        challenges: [
          {
            id: "w2.l1.c1", type: "mcq", tags: ["w2.double"],
            short: "Type first, then name, then value: a double holds 3.5.",
            prompt: "Which line correctly creates a variable holding 3.5?",
            options: [
              { t: "double ratio{3.5};", why: "Correct: type, then name, then the value in braces. A double can hold 3.5." },
              { t: "int ratio{3.5};", why: "An int holds whole numbers only. With braces this is a compile error (narrowing), which is the compiler protecting you." },
              { t: "ratio double{3.5};", why: "The order is wrong: the type comes first, then the name." },
              { t: "double{3.5} ratio;", why: "The value goes after the name, not between the type and the name." },
            ],
            answer: 0,
            hints: ["3.5 has a fractional part. Which type can hold that?", "The pattern is: type name{value};"],
            explain: "A declaration reads type, name, initializer: `double ratio{3.5};`. `double` is the type for numbers with fractional parts.",
          },
          {
            id: "w2.l1.c2", type: "predict", tags: ["w2.int"],
            short: "Each line updates coins in order: 5, 7, then 21.",
            prompt: "What does this print?",
            code: C`int coins{5};
coins = coins + 2;
coins = coins * 3;
std::cout << coins << '\n';`,
            options: [
              { t: "21\n", why: "Correct: 5 + 2 = 7 is stored first, then 7 * 3 = 21." },
              { t: "11\n", why: "That's 5 + 2 * 3 in one expression. Here each line stores its result first." },
              { t: "7\n", why: "The third line runs too: coins is multiplied by 3 after becoming 7." },
              { t: "coins\n", why: "cout prints the value inside the variable, not its name." },
            ],
            answer: 0,
            hints: ["Update the box after each line, top to bottom.", "After line 2, coins is 7."],
            explain: "Statements run top to bottom and each assignment replaces the value: 5, then 7, then 21.",
          },
          {
            id: "w2.l1.c3", type: "fill", tags: ["w2.double"],
            short: "Fractional numbers go in a double.",
            prompt: "A potion costs 9.99 gold. Fill in the type that can hold that price.",
            code: C`___ price{9.99};
std::cout << price << '\n';`,
            accept: ["double", "float", "long double"],
            placeholder: "type",
            hints: ["9.99 is not a whole number.", "The usual type for fractional numbers starts with d."],
            explain: "`double` stores numbers with fractional parts. (`float` works too but is less precise; `double` is the everyday choice.)",
          },
          {
            id: "w2.l1.c4", type: "predict", tags: ["w2.double", "w2.int"],
            short: "cout drops trailing zeros: 7.0 prints as 7.",
            prompt: "What does this print? Watch how cout shows doubles.",
            code: C`double a{7.0};
double b{2.5};
std::cout << a << ' ' << b << '\n';`,
            options: [
              { t: "7 2.5\n", why: "Correct: by default cout drops trailing zeros, so 7.0 prints as 7." },
              { t: "7.0 2.5\n", why: "Default formatting doesn't show a trailing .0; 7.0 prints as 7." },
              { t: "72.5\n", why: "The ' ' prints a space between the two numbers." },
              { t: "7.000000 2.500000\n", why: "That's what std::fixed (or printf's %f) would show, not the default." },
            ],
            answer: 0,
            hints: ["Default cout shows up to 6 significant digits and no trailing zeros.", "' ' is a single space character."],
            explain: "With default formatting, a double that happens to be whole prints with no decimal point: 7.0 shows as `7`, 2.5 as `2.5`.",
          },
          {
            id: "w2.l1.c5", type: "write", tags: ["w2.int", "w2.init"],
            short: "int score{0}; makes an int box holding 0.",
            prompt: "Write one line that declares an int named score starting at 0, using braces.",
            accept: ["int score{0};", "int score{};"],
            placeholder: "int ...",
            hints: ["type name{value};", "int score{0};"],
            explain: "`int score{0};` creates an int box holding 0. Empty braces, `int score{};`, also give 0.",
          },
        ],
        recap: [
          "A variable = type + name + value: `int hp{10};`",
          "`int` for whole numbers, `double` for fractional ones.",
          "`=` replaces the value; the type never changes.",
          "cout prints doubles without trailing zeros: 7.0 shows as 7.",
        ],
        vault: [
          {
            id: "w2.vars", title: "Declaring variables",
            code: C`int hp{10};         // whole number
double speed{2.5};  // fractional number
hp = hp - 3;        // hp is now 7`,
            note: "Type, name, starting value. Prefer braces {}.", defense: false,
          },
        ],
        reviewTags: ["w1.cout", "w1.main"],
      },

      /* =====================================================================
       * Lesson 2: char, bool & std::string
       * =================================================================== */
      {
        id: "w2.l2", title: "Letters, switches & text", skill: "structure", shield: false,
        concept: {
          short: "char holds one letter, bool holds true/false, std::string holds any text.",
          analogy: "Different stuff needs different boxes: a `char` is one letter tile, a `bool` is a light switch (on or off), and a `std::string` is a whole necklace of letter tiles.",
          body: [
            "`char` holds exactly one character, written in **single** quotes: `char rank{'B'};`",
            "`bool` holds `true` or `false`. By default `std::cout` prints a bool as `1` or `0`; send `std::boolalpha` first to print the words.",
            "`std::string` (add `#include <string>`) holds text of any length, in **double** quotes: `std::string name{\"Curlo\"};`. Join strings with `+`, and get the number of characters with `.size()`.",
            "Secret: a `char` is really a small number (its character code; `'A'` is 65 in ASCII). Math on a char, like `'A' + 1`, produces an `int` (66), so cout prints a number, not a letter.",
          ],
          pitfall: "Mixing up quotes: `'A'` is a char, `\"A\"` is a string. `char c{\"A\"};` won't compile. And yes, `std::cout << true;` prints `1`. Everyone is surprised the first time!",
        },
        demo: {
          code: C`#include <iostream>
#include <string>

int main() {
    std::string name{"Curlo"};
    char rank{'B'};
    bool shielded{true};
    std::cout << name << " rank " << rank << '\n';
    std::cout << shielded << '\n';
    std::cout << std::boolalpha << shielded << '\n';
    return 0;
}`,
          steps: [
            { line: 3, note: "main() starts. #include <string> gave us std::string." },
            { line: 4, vars: { name: "\"Curlo\"" }, note: "A string box can hold a whole word." },
            { line: 5, vars: { name: "\"Curlo\"", rank: "'B'" }, note: "A char box holds exactly one character." },
            { line: 6, vars: { name: "\"Curlo\"", rank: "'B'", shielded: "true" }, note: "A bool is a switch: true or false." },
            { line: 7, vars: { name: "\"Curlo\"", rank: "'B'", shielded: "true" }, out: "Curlo rank B\n", note: "A string prints its text; a char prints as a character." },
            { line: 8, vars: { name: "\"Curlo\"", rank: "'B'", shielded: "true" }, out: "1\n", note: "Surprise! By default a bool prints as 1 (true) or 0 (false)." },
            { line: 9, vars: { name: "\"Curlo\"", rank: "'B'", shielded: "true" }, out: "true\n", note: "std::boolalpha switches cout to printing the words true/false." },
            { line: 10, note: "Done!" },
          ],
        },
        challenges: [
          {
            id: "w2.l2.c1", type: "predict", tags: ["w2.char", "w2.int"],
            short: "A char prints as a letter; char + int is an int.",
            prompt: "What does this print?",
            code: C`char c{'A'};
std::cout << c << ' ' << c + 1 << '\n';`,
            options: [
              { t: "A 66\n", why: "Correct: c prints as a letter, but c + 1 is int arithmetic ('A' is 65), so it prints 66." },
              { t: "A B\n", why: "Adding 1 to a char gives an int, and cout prints ints as numbers, not letters." },
              { t: "65 66\n", why: "c on its own is still a char, so it prints as the letter A." },
              { t: "A 1\n", why: "c + 1 adds 1 to A's character code (65), it doesn't print 1 on its own." },
            ],
            answer: 0,
            hints: ["A char prints as a character. What type is char + int?", "'A' has the code 65."],
            explain: "`c` is a char, so it prints as `A`. In `c + 1` the char is promoted to int: 65 + 1 = 66, an int, printed as a number.",
          },
          {
            id: "w2.l2.c2", type: "mcq", tags: ["w2.char"],
            short: "Single quotes make a char: 'Z'.",
            prompt: "Which line correctly stores the single letter Z?",
            options: [
              { t: "char letter{'Z'};", why: "Correct: single quotes make a char literal." },
              { t: "char letter{\"Z\"};", why: "Double quotes make a string literal, which can't go into a char box: compile error." },
              { t: "char letter{Z};", why: "Without quotes, Z looks like the name of a variable, and no variable Z exists: compile error." },
              { t: "char 'Z'{letter};", why: "The name comes after the type, and a literal can't be used as a name." },
            ],
            answer: 0,
            hints: ["How many quote marks does a char use?", "Single quotes for one character, double quotes for text."],
            explain: "A char literal uses single quotes: `'Z'`. Double quotes, `\"Z\"`, make a string, even if it's one letter long.",
          },
          {
            id: "w2.l2.c3", type: "predict", tags: ["w2.bool"],
            short: "Bools print 1/0 until std::boolalpha switches to words.",
            prompt: "What does this print? (Two lines.)",
            code: C`bool a{true};
bool b{false};
std::cout << a << b << '\n';
std::cout << std::boolalpha << a << '\n';`,
            options: [
              { t: "10\ntrue\n", why: "Correct: without boolalpha, true prints 1 and false prints 0 (no space between them). Then boolalpha prints the word." },
              { t: "truefalse\ntrue\n", why: "Without std::boolalpha, bools print as 1 and 0, not words." },
              { t: "1 0\ntrue\n", why: "No space is printed between a and b: nothing asks for one." },
              { t: "10\n1\n", why: "std::boolalpha switches cout to words, so the second line is true." },
            ],
            answer: 0,
            hints: ["By default a bool prints as a digit.", "std::boolalpha only affects output after it."],
            explain: "Default bool output is `1`/`0`. The first line glues 1 and 0 together: `10`. After `std::boolalpha`, true prints as `true`.",
          },
          {
            id: "w2.l2.c4", type: "fill", tags: ["w2.string", "w1.include"],
            short: "Text goes in std::string, from <string>.",
            prompt: "Fill in the type so hero can hold a whole name.",
            code: C`#include <iostream>
#include <string>

int main() {
    ___ hero{"Ada"};
    std::cout << "Hi, " << hero << '\n';
    return 0;
}`,
            accept: ["std::string"],
            placeholder: "type",
            hints: ["The header on line 2 gives you this type.", "It lives in the std namespace: std::..."],
            explain: "`std::string` holds text of any length. It comes from `<string>` and needs the `std::` prefix.",
          },
          {
            id: "w2.l2.c5", type: "predict", tags: ["w2.string"],
            short: "size() counts every character: 5 + 1 + 8 = 14.",
            prompt: "What does this print?",
            code: C`std::string a{"Brace"};
std::string b{"Yourself"};
std::string both{a + " " + b};
std::cout << both.size() << '\n';`,
            options: [
              { t: "14\n", why: "Correct: 5 letters + 1 space + 8 letters = 14 characters." },
              { t: "13\n", why: "Don't forget the space in the middle: it's a character too." },
              { t: "2\n", why: "size() counts characters, not words." },
              { t: "Brace Yourself\n", why: "We print both.size(), the length, not the text itself." },
            ],
            answer: 0,
            hints: ["size() counts every character, spaces included.", "\"Brace\" has 5, \"Yourself\" has 8."],
            explain: "`+` glues strings together: \"Brace Yourself\". `.size()` counts its characters: 5 + 1 + 8 = 14.",
          },
          {
            id: "w2.l2.c6", type: "bug", tags: ["w2.char", "w1.compile"],
            short: "\"C\" is a string; a char needs 'C'.",
            prompt: "This program doesn't compile (intentionally broken). Tap the buggy line, then pick the fix that keeps initial a char.",
            code: C`#include <iostream>

int main() {
    char initial{"C"};
    std::cout << initial << '\n';
    return 0;
}`,
            bugLine: 3,
            options: [
              { t: "char initial{'C'};", why: "Correct: single quotes make a char literal." },
              { t: "char initial = \"C\";", why: "Still a string literal in a char box; switching to = doesn't help: compile error." },
              { t: "char initial{C};", why: "Without quotes, C is treated as an undeclared variable name: compile error." },
            ],
            answer: 0,
            hints: ["Look at the quote marks.", "One character = single quotes."],
            explain: "`\"C\"` is a string literal (text), so it can't initialize a char. `'C'` is the char literal you want.",
            sideBySide: {
              unsafe: C`char initial{"C"};   // compile error: string in a char box`,
              hardened: C`char initial{'C'};   // single quotes: a real char`,
            },
          },
        ],
        recap: [
          "`char` = one character in single quotes: `'B'`.",
          "`bool` = true/false; prints 1/0 unless you use std::boolalpha.",
          "`std::string` = text in double quotes; `+` joins, `.size()` counts.",
          "`'A' + 1` is the int 66, not 'B'.",
        ],
        vault: [
          {
            id: "w2.types", title: "char, bool, std::string",
            code: C`#include <string>

char rank{'B'};                // one character
bool alive{true};              // true / false
std::string name{"Curlo"};     // any text
std::cout << std::boolalpha << alive;  // prints true`,
            note: "Single quotes for char, double quotes for strings. Bools print 1/0 unless you use std::boolalpha.", defense: false,
          },
        ],
        reviewTags: ["w1.include", "w1.cout", "w2.int"],
      },

      /* =====================================================================
       * Lesson 3: const & auto
       * =================================================================== */
      {
        id: "w2.l3", title: "Sealed jars & smart labels: const and auto", skill: "toolkit", shield: false,
        concept: {
          short: "const values can never change; auto lets the compiler pick the type.",
          analogy: "`const` is a jar with a glued lid, and `auto` is a label maker that reads the contents for you.",
          body: [
            "`const int maxHp{100};` creates a value that can never change. Writing `maxHp = 50;` later is a **compile error**, and that's the point: the compiler guards it for you.",
            "A `const` must get its value when it's declared. There's no later chance to fill a sealed jar.",
            "`auto` lets the compiler deduce the type from the initializer: `auto lives{3};` is an `int`, `auto ratio{0.5};` is a `double`, `auto initial{'C'};` is a `char`.",
            "Careful: `auto name{\"Curlo\"};` is **not** a `std::string`. It's a `const char*` (a pointer to raw text, World 8 stuff). Write `std::string` when you want a string.",
            "`auto` is still strict typing: the type is fixed at compile time. Use it when the type is obvious.",
          ],
          pitfall: "Thinking `auto` means \"any type, can change later\". After `auto hp{10};`, hp is an int forever, so `hp = 2.7;` stores 2.",
        },
        demo: {
          code: C`#include <iostream>

int main() {
    const int maxHp{100};
    auto hp{maxHp};
    auto regen{0.5};
    hp = hp - 30;
    std::cout << hp << '/' << maxHp << '\n';
    std::cout << regen * 10 << '\n';
    return 0;
}`,
          steps: [
            { line: 2, note: "main() starts." },
            { line: 3, vars: { maxHp: "100" }, note: "maxHp is const: sealed at 100 forever." },
            { line: 4, vars: { maxHp: "100", hp: "100" }, note: "auto copies maxHp's type, int, but not const: hp can change." },
            { line: 5, vars: { maxHp: "100", hp: "100", regen: "0.5" }, note: "0.5 has a decimal point, so auto deduces double." },
            { line: 6, vars: { maxHp: "100", hp: "70", regen: "0.5" }, note: "hp changes to 70. Trying this on maxHp would not compile." },
            { line: 7, vars: { maxHp: "100", hp: "70", regen: "0.5" }, out: "70/100\n", note: "'/' is a char, printed as the character /." },
            { line: 8, vars: { maxHp: "100", hp: "70", regen: "0.5" }, out: "5\n", note: "0.5 * 10 is the double 5.0, which cout prints as 5." },
            { line: 9, note: "Done!" },
          ],
        },
        challenges: [
          {
            id: "w2.l3.c1", type: "mcq", tags: ["w2.const", "w1.compile"],
            short: "Assigning to a const is a compile error.",
            prompt: "What happens when you try to compile this?",
            code: C`const int maxLevel{50};
maxLevel = 60;`,
            options: [
              { t: "Compile error: you can't assign to a const variable", why: "Correct: the compiler refuses to change a const. That's the protection working." },
              { t: "It compiles and maxLevel becomes 60", why: "const means the value can never change after initialization." },
              { t: "It compiles, but maxLevel silently stays 50", why: "C++ doesn't silently ignore it: the compiler stops with an error." },
              { t: "It compiles, then crashes when that line runs", why: "The problem is caught at compile time, so the program is never built." },
            ],
            answer: 0,
            hints: ["What does const promise?", "Who enforces the promise: the compiler or the running program?"],
            explain: "Assigning to a const is a compile-time error (\"assignment of read-only variable\"). Mistakes caught by the compiler never reach players.",
          },
          {
            id: "w2.l3.c2", type: "speed", tags: ["w2.auto"],
            short: "auto copies the initializer's type; \"hi\" gives const char*.",
            prompt: "Speed round! What type does auto deduce?",
            seconds: 45,
            items: [
              { q: "What type is a?", code: "auto a{42};", options: ["int", "double", "char"], answer: 0 },
              { q: "What type is b?", code: "auto b{4.0};", options: ["int", "bool", "double"], answer: 2 },
              { q: "What type is c?", code: "auto c{'x'};", options: ["std::string", "char", "int"], answer: 1 },
              { q: "What type is d?", code: "auto d{true};", options: ["bool", "int", "char"], answer: 0 },
              { q: "What type is e?", code: "auto e{\"hi\"};", options: ["std::string", "char", "const char*"], answer: 2 },
              { q: "What type is g?", code: "const int m{5};\nauto g{m};", options: ["const int", "int", "double"], answer: 1 },
            ],
            hints: ["auto copies the type of the initializer.", "A decimal point means double; auto drops a top-level const."],
            explain: "42 is int, 4.0 is double, 'x' is char, true is bool. \"hi\" is a raw text literal, so auto gives const char*, not std::string. auto drops a top-level const, so g is a plain int.",
          },
          {
            id: "w2.l3.c3", type: "fill", tags: ["w2.const"],
            short: "const seals a value so it can't change.",
            prompt: "Make kMaxLives impossible to change after this line.",
            code: C`___ int kMaxLives{3};`,
            accept: ["const", "constexpr"],
            placeholder: "keyword",
            hints: ["It's the sealed-jar keyword.", "Five letters, starts with c."],
            explain: "`const int kMaxLives{3};` can't be changed later. (`constexpr` also works and means \"known at compile time\".)",
          },
          {
            id: "w2.l3.c4", type: "predict", tags: ["w2.auto", "w2.convert"],
            short: "hp became an int on line 1, so 2.7 truncates to 2.",
            prompt: "What does this print?",
            code: C`auto hp{10};
hp = 2.7;
std::cout << hp << '\n';`,
            options: [
              { t: "2\n", why: "Correct: auto made hp an int at its declaration. Storing 2.7 into an int drops the fraction." },
              { t: "2.7\n", why: "auto doesn't change the type later. hp became an int on line 1, forever." },
              { t: "3\n", why: "Converting a double to an int truncates, it doesn't round." },
              { t: "10\n", why: "The assignment on line 2 does happen; hp gets the int part of 2.7." },
            ],
            answer: 0,
            hints: ["What type did auto pick on line 1?", "double to int drops everything after the decimal point."],
            explain: "`auto hp{10};` makes hp an int. `hp = 2.7;` converts 2.7 to int by truncating: 2. (Assignment with = allows this silently; the braces rule only applies when initializing.)",
          },
          {
            id: "w2.l3.c5", type: "write", tags: ["w2.const", "w2.double"],
            short: "const double kGravity{9.8}; is a sealed double.",
            prompt: "Write one line declaring a constant double named kGravity equal to 9.8, using braces.",
            accept: ["const double kGravity{9.8};", "constexpr double kGravity{9.8};", "double const kGravity{9.8};"],
            placeholder: "const ...",
            hints: ["const, then the type, then the name.", "const double kGravity{...};"],
            explain: "`const double kGravity{9.8};` makes a sealed double. Nothing can change it by accident.",
          },
          {
            id: "w2.l3.c6", type: "order", tags: ["w2.const", "w2.auto", "w1.main"],
            short: "Declare before use; a const can't be reassigned.",
            prompt: "Put the lines in order to build a program that prints 100. One line doesn't belong.",
            lines: [
              "#include <iostream>",
              "int main() {",
              "    const int maxHp{100};",
              "    auto hp{maxHp};",
              C`    std::cout << hp << '\n';`,
              "    return 0;",
              "}",
            ],
            distractors: ["    maxHp = 120;"],
            hints: ["A variable must exist before you use it.", "Can you assign to a const?"],
            explain: "Include, open main, declare maxHp, copy it into hp, print, return. `maxHp = 120;` would be a compile error because maxHp is const.",
          },
        ],
        recap: [
          "`const` values can't change; the compiler enforces it.",
          "A const must be initialized when declared.",
          "`auto` deduces the type once; it never changes.",
          "`auto x{\"hi\"};` is const char*, not std::string.",
        ],
        vault: [
          {
            id: "w2.const-auto", title: "const and auto",
            code: C`const int maxHp{100};   // can never change
auto lives{3};          // int
auto ratio{0.5};        // double
std::string name{"Curlo"};  // spell out std::string`,
            note: "Make values const unless they need to change. Use auto when the type is obvious from the right side.", defense: false,
          },
        ],
        reviewTags: ["w1.comments", "w2.int", "w2.string"],
      },

      /* =====================================================================
       * Lesson 4: Type conversion
       * =================================================================== */
      {
        id: "w2.l4", title: "Shape-shifting values: conversions", skill: "logic", shield: false,
        concept: {
          short: "int / int drops the fraction; convert to double first with static_cast.",
          analogy: "Pouring a double into an int is like pouring 3.9 litres into a 3-litre jug: the extra 0.9 spills on the floor and is gone for good.",
          body: [
            "C++ converts between number types automatically (**implicit conversion**). `int` to `double` is harmless: `double d = 5;` stores 5.0.",
            "`double` to `int` **truncates toward zero**: 3.9 becomes 3 and -3.9 becomes -3. No rounding, ever.",
            "**Integer division**: when both sides of `/` are ints, the answer is an int and the fraction is thrown away: `7 / 2` is `3`. The `%` operator gives the remainder: `7 % 2` is `1`.",
            "Mixing types promotes the int: `7.0 / 2` is 3.5 because 2 becomes a double first. For variables, convert on purpose with `static_cast<double>(gold) / heroes`.",
            "`static_cast<T>(value)` is the explicit \"I meant this\" conversion, easy to spot and search for.",
          ],
          pitfall: "`static_cast<double>(a / b)` is too late! `a / b` already did integer division and lost the fraction. Cast one of the operands, not the result.",
        },
        demo: {
          code: C`#include <iostream>

int main() {
    int gold{7};
    int heroes{2};
    int each{gold / heroes};
    int left{gold % heroes};
    double exact{static_cast<double>(gold) / heroes};
    std::cout << each << " r" << left << '\n';
    std::cout << exact << '\n';
    return 0;
}`,
          steps: [
            { line: 3, vars: { gold: "7" }, note: "7 gold to share." },
            { line: 4, vars: { gold: "7", heroes: "2" }, note: "Between 2 heroes." },
            { line: 5, vars: { gold: "7", heroes: "2", each: "3" }, note: "int / int is integer division: 7 / 2 = 3." },
            { line: 6, vars: { gold: "7", heroes: "2", each: "3", left: "1" }, note: "% gives the remainder: 7 = 2 * 3 + 1." },
            { line: 7, vars: { gold: "7", heroes: "2", each: "3", left: "1", exact: "3.5" }, note: "gold becomes 7.0 first, so it's a real division: 3.5." },
            { line: 8, vars: { gold: "7", heroes: "2", each: "3", left: "1", exact: "3.5" }, out: "3 r1\n", note: "3 each, remainder 1." },
            { line: 9, vars: { gold: "7", heroes: "2", each: "3", left: "1", exact: "3.5" }, out: "3.5\n", note: "The exact share." },
            { line: 10, note: "Done!" },
          ],
        },
        challenges: [
          {
            id: "w2.l4.c1", type: "predict", tags: ["w2.convert", "w2.int"],
            short: "a / b is integer division (3) before r stores it.",
            prompt: "What does this print?",
            code: C`int a{7};
int b{2};
double r = a / b;
std::cout << r << '\n';`,
            options: [
              { t: "3\n", why: "Correct: int / int gives 3, then it's stored as 3.0 and printed as 3." },
              { t: "3.5\n", why: "The division happens first, with two ints, so the .5 is lost before r ever sees it." },
              { t: "3.0\n", why: "r does hold 3.0, but default cout formatting prints it as 3." },
              { t: "4\n", why: "Integer division truncates; it never rounds up." },
            ],
            answer: 0,
            hints: ["What types are on each side of / ?", "The right side is computed before it's stored in r."],
            explain: "The type of the variable on the left doesn't change how the right side is computed. `a / b` is integer division (3), which is then stored as 3.0 and printed as `3`.",
          },
          {
            id: "w2.l4.c2", type: "predict", tags: ["w2.convert"],
            short: "Converting to int truncates toward zero: -3.9 becomes -3.",
            prompt: "What does this print?",
            code: C`double temp{-3.9};
int t{static_cast<int>(temp)};
std::cout << t << '\n';`,
            options: [
              { t: "-3\n", why: "Correct: conversion to int truncates toward zero, so -3.9 becomes -3." },
              { t: "-4\n", why: "That would be rounding down (floor). Truncation goes toward zero: -3." },
              { t: "-3.9\n", why: "t is an int; it can't hold the .9." },
              { t: "3\n", why: "Truncation drops the fraction but keeps the sign." },
            ],
            answer: 0,
            hints: ["Truncation just chops off everything after the decimal point.", "Chopping -3.9 leaves -3."],
            explain: "`static_cast<int>` on a double truncates toward zero: 3.9 → 3 and -3.9 → -3.",
          },
          {
            id: "w2.l4.c3", type: "mcq", tags: ["w2.convert", "w2.double"],
            short: "Division is fractional only if an operand is already a double.",
            prompt: "Which expression evaluates to 2.5?",
            options: [
              { t: "5.0 / 2", why: "Correct: 5.0 is a double, so 2 is promoted and the division is real: 2.5." },
              { t: "5 / 2", why: "int / int is integer division: 2." },
              { t: "static_cast<double>(5 / 2)", why: "5 / 2 is computed first (2), then cast: 2.0. The cast came too late." },
              { t: "5 % 2", why: "% is the remainder: 1." },
            ],
            answer: 0,
            hints: ["At least one side of / must be a double before dividing.", "Watch where the cast happens."],
            explain: "Division is only real (fractional) if at least one operand is floating-point when the division happens.",
          },
          {
            id: "w2.l4.c4", type: "bug", tags: ["w2.convert"], unsafe: true,
            short: "Cast an operand before dividing, not the result.",
            prompt: "This compiles, but prints 4 instead of 4.5 (a logic bug, not UB). Tap the buggy line, then pick the fix.",
            code: C`#include <iostream>

int main() {
    int total{9};
    int count{2};
    double average{static_cast<double>(total / count)};
    std::cout << average << '\n';
    return 0;
}`,
            bugLine: 5,
            options: [
              { t: "double average{static_cast<double>(total) / count};", why: "Correct: total becomes 9.0 before dividing, so the division is 9.0 / 2 = 4.5." },
              { t: "double average = total / count;", why: "Still int / int: 4. Moving to = changes nothing about the division." },
              { t: "double average{(total / count) * 1.0};", why: "The integer division (4) happens first; multiplying by 1.0 afterwards just gives 4.0." },
            ],
            answer: 0,
            hints: ["When does the fraction get lost: before or after the cast?", "Cast an operand, not the result."],
            explain: "`static_cast<double>(total / count)` casts the result of integer division, which is already 4. Cast `total` first so the division itself is done in double.",
            sideBySide: {
              unsafe: C`double average{static_cast<double>(total / count)};  // 4`,
              hardened: C`double average{static_cast<double>(total) / count};  // 4.5`,
            },
          },
          {
            id: "w2.l4.c5", type: "edge", tags: ["w2.convert", "w2.int"], unsafe: true,
            short: "Only values that don't divide evenly expose integer division.",
            prompt: "This accuracy calculation has a logic bug. Which test values expose it? Select all that apply.",
            code: C`int hits{/* test value */};
int shots{/* test value */};
double accuracy = hits / shots;
std::cout << accuracy << '\n';`,
            options: [
              { t: "hits = 10, shots = 10", why: "10 / 10 = 1, which is the right answer, so this test passes and hides the bug." },
              { t: "hits = 3, shots = 4", why: "Exposes it: prints 0 instead of 0.75." },
              { t: "hits = 8, shots = 2", why: "8 / 2 = 4 exactly, so the bug stays hidden." },
              { t: "hits = 7, shots = 2", why: "Exposes it: prints 3 instead of 3.5." },
              { t: "hits = 0, shots = 5", why: "0 / 5 = 0, which is correct, so the bug stays hidden." },
            ],
            answers: [1, 3],
            hints: ["The bug only shows when the real answer has a fractional part.", "Which pairs don't divide evenly?"],
            explain: "Integer division only goes wrong when the true result isn't whole. Tests where the numbers divide evenly pass and hide the bug, which is why good tests include \"awkward\" values.",
            sideBySide: {
              unsafe: C`double accuracy = hits / shots;  // int division`,
              hardened: C`double accuracy{static_cast<double>(hits) / shots};`,
            },
          },
          {
            id: "w2.l4.c6", type: "fill", tags: ["w2.convert"],
            short: "static_cast<double>(hp) / 2 gives 4.5.",
            prompt: "Make this print 4.5 by converting hp before the division.",
            code: C`int hp{9};
double half{___(hp) / 2};
std::cout << half << '\n';`,
            accept: ["static_cast<double>", "double"],
            placeholder: "conversion",
            hints: ["Use the explicit C++ cast.", "static_cast<...>"],
            explain: "`static_cast<double>(hp) / 2` is 9.0 / 2 = 4.5. (`double(hp)` also works, but static_cast is clearer and easier to search for.)",
          },
        ],
        recap: [
          "int / int drops fractions: 7 / 2 is 3.",
          "double → int truncates toward zero: -3.9 → -3.",
          "Cast an operand before dividing: `static_cast<double>(a) / b`.",
          "Tests with values that divide evenly can hide conversion bugs.",
        ],
        vault: [
          {
            id: "w2.convert", title: "Conversions & division",
            code: C`7 / 2                          // 3   (int division)
7 % 2                          // 1   (remainder)
7.0 / 2                        // 3.5
static_cast<double>(a) / b     // real division
static_cast<int>(-3.9)         // -3  (truncates toward zero)`,
            note: "Convert before you divide, not after.", defense: false,
          },
        ],
        reviewTags: ["w1.compile", "w2.double", "w2.auto", "w2.char"],
      },

      /* =====================================================================
       * Lesson 5 (SHIELD): Always initialize; braces catch narrowing
       * =================================================================== */
      {
        id: "w2.l5", title: "Shield: No empty boxes", skill: "defense", shield: true,
        concept: {
          short: "Always give variables a value: reading an empty one is UB. Braces block lossy conversions.",
          analogy: "An uninitialized variable is an attic box still full of old junk, and braces `{}` are a gate that rejects anything that doesn't fit.",
          body: [
            "`int hp;` inside a function creates a box but puts nothing in it. It holds an **indeterminate** value: leftover bits from whatever used that memory before.",
            "Reading it (`std::cout << hp;`, `hp + 1`) is **undefined behavior (UB)**: it might print 0, print garbage, crash, or seem fine today and break on another compiler. \"It worked on my machine\" proves nothing.",
            "The fix: **always initialize**. `int hp{100};` or `int hp{};` (empty braces give 0). A `std::string` starts empty on its own; ints, doubles, chars and bools don't.",
            "Braces also block **narrowing** (conversions that lose data): `int hp{3.7};` is a **compile error**, while `int hp = 3.7;` silently stores 3. A compile error is a gift: the bug never ships.",
            "Narrowing from a **variable** (`int n{someDouble};`) is just as illegal: Clang and MSVC reject it, GCC only warns by default. Treat that warning as an error.",
            "Keep compiler warnings on (`-Wall -Wextra`, from World 1). They often catch \"may be used uninitialized\".",
          ],
          pitfall: "\"It printed 0, so it's fine.\" Memory is often zero by luck in tiny programs. UB doesn't guarantee a crash, which is what makes it dangerous.",
        },
        demo: {
          code: C`#include <iostream>

int main() {
    int damage;               // UNSAFE: no value!
    int total = damage + 5;   // reads garbage: UB
    std::cout << total << '\n';

    int shield{};             // SAFE: empty braces give 0
    int armor{10};            // SAFE: explicit value
    std::cout << shield + armor << '\n';
    return 0;
}`,
          steps: [
            { line: 2, note: "main() starts." },
            { line: 3, vars: { damage: "?" }, note: "A box is created but never filled. Its contents are garbage." },
            { line: 4, vars: { damage: "?", total: "?" }, crash: "Reading garbage! Undefined behavior: the rules of C++ no longer apply.", note: "damage + 5 reads the garbage. total is garbage too." },
            { line: 5, vars: { damage: "?", total: "?" }, out: "21980\n", note: "This run printed 21980. Another might print 5, or crash." },
            { line: 7, vars: { damage: "?", total: "?", shield: "0" }, shield: "Empty braces: shield is guaranteed to be 0.", note: "int shield{}; value-initializes to 0." },
            { line: 8, vars: { damage: "?", total: "?", shield: "0", armor: "10" }, note: "An explicit starting value: the safest and clearest." },
            { line: 9, vars: { damage: "?", total: "?", shield: "0", armor: "10" }, out: "10\n", note: "0 + 10 = 10, every time, on every compiler." },
            { line: 10, note: "Moral: never read a box you didn't fill." },
          ],
        },
        challenges: [
          {
            id: "w2.l5.c1", type: "safe", tags: ["w2.init", "w2.narrowing"], bug: "uninit-var",
            short: "Read only what you've filled; braces stop silent truncation.",
            prompt: "Safe or unsafe? Go fast!",
            seconds: 30,
            items: [
              { code: "int hp{};\nstd::cout << hp;", safe: true, why: "Empty braces value-initialize hp to 0." },
              { code: "int hp;\nstd::cout << hp;", safe: false, why: "hp was never given a value; reading it is UB." },
              { code: "double ratio{0.75};", safe: true, why: "Initialized with a value that fits its type." },
              { code: "int x;\nx = x + 1;", safe: false, why: "x + 1 reads x before it has a value: UB." },
              { code: "std::string name;\nstd::cout << name.size();", safe: true, why: "std::string's default is an empty string, so this prints 0. (ints, doubles, chars and bools get no such default.)" },
              { code: "int level = 7.9;", safe: false, why: "It compiles, but silently truncates to 7: hidden data loss. Braces would have refused it." },
              { code: "char grade{'A'};", safe: true, why: "Initialized with a char literal." },
              { code: "bool done;\nstd::cout << done;", safe: false, why: "An uninitialized bool is garbage too; reading it is UB (it might not even be a valid 0 or 1)." },
            ],
            hints: ["Is every variable given a value before it's read?", "Watch for silent double-to-int conversions with =."],
            explain: "Read a variable only after it has a value, and prefer braces so the compiler flags lossy conversions instead of silently truncating.",
          },
          {
            id: "w2.l5.c2", type: "review", tags: ["w2.init", "w2.string"], bug: "uninit-var", unsafe: true,
            short: "int xp; holds garbage, and xp + 10 reads it: UB.",
            prompt: "Code review: tap the line that creates garbage AND the line that reads it, then submit.",
            code: C`#include <iostream>
#include <string>

int main() {
    int level{1};
    int xp;
    std::string title;
    double bonus{1.5};
    std::cout << title << level << '\n';
    std::cout << xp + 10 << '\n';
    std::cout << bonus << '\n';
    return 0;
}`,
            dangerous: [5, 9],
            lineNotes: {
              4: "Safe: level starts at 1.",
              5: "Dangerous: xp is declared with no value, so it holds garbage.",
              6: "Safe: a std::string with no initializer is an empty string, not garbage.",
              7: "Safe: bonus starts at 1.5.",
              9: "Dangerous: xp + 10 reads the uninitialized xp: undefined behavior.",
            },
            hints: ["Which variable was never given a value?", "std::string is the exception: it starts empty on its own."],
            explain: "`int xp;` leaves garbage in the box and `xp + 10` reads it: UB. It might print 10, a huge number, or misbehave only in release builds. `std::string title;` is fine because strings start empty.",
            sideBySide: {
              unsafe: C`int xp;
std::cout << xp + 10 << '\n';   // UB`,
              hardened: C`int xp{};
std::cout << xp + 10 << '\n';   // always 10`,
            },
          },
          {
            id: "w2.l5.c3", type: "harden", tags: ["w2.init"], bug: "uninit-var",
            short: "int potions{}; guarantees 0 and never parses as a function.",
            prompt: "Harden this so potions always starts at 0.",
            code: C`int potions___;
std::cout << "Potions: " << potions << '\n';`,
            options: [
              { t: "{}", why: "Correct: empty braces value-initialize potions to 0." },
              { t: "= potions", why: "Initializing a variable from itself still reads garbage: UB." },
              { t: "()", why: "Trap! `int potions();` declares a function named potions, not a variable (the \"most vexing parse\"). Braces never have this problem." },
              { t: "{0.0}", why: "0.0 is a double, and braces refuse to narrow double to int: compile error." },
            ],
            answer: 0,
            hints: ["Braces with nothing inside mean \"the zero value\".", "Parentheses after a name can look like a function declaration."],
            explain: "`int potions{};` guarantees 0. Braces are the safest initializer: they zero-fill when empty, never parse as a function, and refuse narrowing.",
            sideBySide: {
              unsafe: C`int potions;   // garbage
std::cout << "Potions: " << potions << '\n';`,
              hardened: C`int potions{};   // 0
std::cout << "Potions: " << potions << '\n';`,
            },
          },
          {
            id: "w2.l5.c4", type: "mcq", tags: ["w2.narrowing", "w1.compile"],
            short: "= silently truncates; braces reject narrowing at compile time.",
            prompt: "Intentionally broken snippet: what does the compiler do with these two lines?",
            code: C`int a = 3.7;
int b{3.7};`,
            options: [
              { t: "Line 1 compiles (a becomes 3); line 2 is a compile error: narrowing", why: "Correct: = silently truncates, but braces refuse any conversion that can lose data." },
              { t: "Both compile; a and b are both 3", why: "Brace initialization doesn't allow narrowing: double to int is rejected." },
              { t: "Both compile; a and b are both 4", why: "Double-to-int never rounds, and line 2 doesn't compile anyway." },
              { t: "Both lines are compile errors", why: "Line 1 is legal C++ (maybe with a warning), which is why it's sneaky." },
            ],
            answer: 0,
            hints: ["One of these syntaxes is picky about lost data.", "Braces are the picky ones."],
            explain: "`int a = 3.7;` quietly stores 3. `int b{3.7};` is ill-formed (narrowing), so the compiler stops you. Prefer braces: they turn silent data loss into an error you can fix.",
          },
          {
            id: "w2.l5.c5", type: "breakit", tags: ["w2.narrowing", "w2.convert"], unsafe: true,
            short: "0.9 silently truncates to 0: the shield vanishes.",
            prompt: "The shield strength comes from a double. Which value breaks this code the worst?",
            code: C`double boost{/* value */};
int shieldPower = boost;   // silent double to int
std::cout << shieldPower << '\n';`,
            options: [
              { t: "2.0", why: "Becomes 2: nothing lost." },
              { t: "5.0", why: "Becomes 5: nothing lost." },
              { t: "0.9", why: "Correct: truncates to 0. The hero's shield silently drops to nothing!" },
              { t: "3.0", why: "Becomes 3: nothing lost." },
            ],
            answer: 2,
            hints: ["Which value has a fractional part?", "What's 0.9 with the fraction chopped off?"],
            explain: "`int shieldPower = boost;` silently truncates. With 0.9 the shield becomes 0. Writing `int shieldPower{boost};` is ill-formed narrowing (an error on Clang/MSVC, a narrowing warning on GCC by default), forcing you to choose: keep a double, or convert on purpose with static_cast.",
            sideBySide: {
              unsafe: C`int shieldPower = boost;   // 0.9 becomes 0, silently`,
              hardened: C`double shieldPower{boost};  // keeps 0.9
// or, if you truly want a whole number, say so:
// int shieldPower{static_cast<int>(boost)};`,
            },
          },
          {
            id: "w2.l5.c6", type: "write", tags: ["w2.init"], bug: "uninit-var",
            short: "int gold{}; starts gold at a known 0.",
            prompt: "`int gold;` is an empty box. Rewrite the declaration so gold starts at zero.",
            accept: ["int gold{};", "int gold{0};", "int gold = 0;"],
            placeholder: "int gold...",
            hints: ["Add an initializer.", "Braces work: int gold{...};"],
            explain: "`int gold{};` (or `int gold{0};`) guarantees a known starting value. Initialize every variable where you declare it.",
          },
        ],
        recap: [
          "Reading an uninitialized variable is UB: always initialize.",
          "`int x{};` gives 0; std::string starts empty on its own.",
          "Braces refuse narrowing: `int x{3.7};` is a compile error.",
          "UB can seem fine, then break later.",
        ],
        vault: [
          {
            id: "w2.always-init", title: "Always initialize",
            code: C`int hp;          // UNSAFE: garbage, reading it is UB
int hp{};        // SAFE: 0
int hp{100};     // SAFE: explicit value
std::string s;   // OK: strings start empty`,
            note: "Give every variable a value the moment it exists. UB doesn't promise a crash; it can look fine and fail later.", defense: true,
          },
          {
            id: "w2.brace-narrowing", title: "Braces catch narrowing",
            code: C`int a = 3.7;                        // compiles, silently 3
// int b{3.7};                      // compile error: narrowing
int c{static_cast<int>(3.7)};       // explicit: 3 on purpose`,
            note: "Prefer {} so the compiler flags lossy conversions (from a variable, GCC only warns by default: treat it as an error). Convert on purpose with static_cast.", defense: true,
          },
        ],
        reviewTags: ["w1.warnings", "w2.int", "w2.double", "w2.convert"],
      },
    ],

    /* =======================================================================
     * Project: Hero Profile Card
     * ===================================================================== */
    project: {
      id: "w2.p", title: "Hero Profile Card",
      intro: "Let's build your Hero Profile Card from well-typed, initialized boxes! {:)}",
      steps: [
        {
          id: "w2.p.s1", type: "fill", tags: ["w2.string", "w2.const"],
          short: "A name is text: const std::string.",
          prompt: "Step 1: the hero's name never changes. Fill in the type.",
          code: C`#include <iostream>
#include <string>

int main() {
    const ___ name{"Ada"};
    std::cout << "Name: " << name << '\n';
    return 0;
}`,
          accept: ["std::string"],
          placeholder: "type",
          hints: ["A name is text.", "Don't forget the std:: prefix."],
          explain: "`const std::string name{\"Ada\"};` stores text that can't be changed by accident.",
        },
        {
          id: "w2.p.s2", type: "write", tags: ["w2.const", "w2.int"],
          short: "const int maxHp{120}; can't change by accident.",
          prompt: "Step 2: add a line declaring a constant int named maxHp equal to 120.",
          code: C`#include <iostream>
#include <string>

int main() {
    const std::string name{"Ada"};
    int level{7};
    // your line here
    int hp{90};
    return 0;
}`,
          accept: ["const int maxHp{120};", "constexpr int maxHp{120};", "const int maxHp = 120;", "int const maxHp{120};"],
          placeholder: "const int ...",
          hints: ["Sealed-jar keyword, then the type, then the name.", "const int maxHp{...};"],
          explain: "`const int maxHp{120};` is the ceiling for hp, and nothing can change it by accident.",
        },
        {
          id: "w2.p.s3", type: "fill", tags: ["w2.convert"],
          short: "Convert hp first so 90 / 120 gives 0.75, not 0.",
          prompt: "Step 3: compute the HP ratio (90 out of 120 should be 0.75, not 0). Convert hp first.",
          code: C`#include <iostream>
#include <string>

int main() {
    const std::string name{"Ada"};
    int level{7};
    const int maxHp{120};
    int hp{90};
    char rank{'B'};
    bool shielded{true};
    double hpRatio{___(hp) / maxHp};
    return 0;
}`,
          accept: ["static_cast<double>", "double"],
          placeholder: "conversion",
          hints: ["int / int would be integer division: 0.", "static_cast<...>(hp)"],
          explain: "`static_cast<double>(hp) / maxHp` is 90.0 / 120 = 0.75. Without the cast, 90 / 120 would be 0.",
        },
        {
          id: "w2.p.s4", type: "predict", tags: ["w2.double", "w2.convert"],
          short: "Real division gives 0.75, printed without trailing zeros.",
          prompt: "Step 4: before printing the card, predict the ratio line.",
          code: C`int hp{90};
const int maxHp{120};
double hpRatio{static_cast<double>(hp) / maxHp};
std::cout << "HP ratio: " << hpRatio << '\n';`,
          options: [
            { t: "HP ratio: 0.75\n", why: "Correct: 90.0 / 120 = 0.75, printed without trailing zeros." },
            { t: "HP ratio: 0\n", why: "That's what integer division would give, but hp was converted to double first." },
            { t: "HP ratio: 0.750000\n", why: "Default cout doesn't pad with zeros; that needs std::fixed." },
            { t: "HP ratio: 75\n", why: "Nothing multiplies by 100 here." },
          ],
          answer: 0,
          hints: ["Is the division int or double?", "Default cout: no trailing zeros."],
          explain: "The cast makes it a real division: 0.75, printed as `0.75`.",
        },
        {
          id: "w2.p.s5", type: "order", tags: ["w2.bool", "w2.char", "w1.cout"],
          short: "Print in card order; hp / maxHp with ints prints 0.",
          prompt: "Step 5: order the print lines so the card reads top to bottom: title, name, level, HP, ratio, shield. One line doesn't belong.",
          lines: [
            C`    std::cout << "=== Hero Profile ===\n";`,
            C`    std::cout << "Name: " << name << '\n';`,
            C`    std::cout << "Level: " << level << " (rank " << rank << ")\n";`,
            C`    std::cout << "HP: " << hp << '/' << maxHp << '\n';`,
            C`    std::cout << "HP ratio: " << hpRatio << '\n';`,
            C`    std::cout << std::boolalpha << "Shielded: " << shielded << '\n';`,
          ],
          distractors: [C`    std::cout << "HP ratio: " << hp / maxHp << '\n';`],
          hints: ["Follow the order in the prompt.", "One ratio line uses integer division."],
          explain: "The card prints in the order listed. The distractor computes `hp / maxHp` with ints, which prints 0.",
        },
      ],
      program: C`#include <iostream>
#include <string>

int main() {
    const std::string name{"Ada"};
    int level{7};
    const int maxHp{120};
    int hp{90};
    char rank{'B'};
    bool shielded{true};
    double hpRatio{static_cast<double>(hp) / maxHp};

    std::cout << "=== Hero Profile ===\n";
    std::cout << "Name: " << name << '\n';
    std::cout << "Level: " << level << " (rank " << rank << ")\n";
    std::cout << "HP: " << hp << '/' << maxHp << '\n';
    std::cout << "HP ratio: " << hpRatio << '\n';
    std::cout << std::boolalpha << "Shielded: " << shielded << '\n';
    return 0;
}`,
      stress: {
        intro: "Stress Test! I'll throw bad values at your card. Brace yourself!",
        attacks: [
          {
            input: "int hp;", label: "Uninitialized variable!",
            challenge: {
              id: "w2.p.a1", type: "bug", tags: ["w2.init"], bug: "uninit-var", unsafe: true,
              short: "Reading uninitialized hp is UB; give it a value when declared.",
              prompt: "A bug erased hp's starting value. Tap the dangerous line, then pick the fix.",
              code: C`#include <iostream>

int main() {
    const int maxHp{120};
    int hp;
    std::cout << "HP: " << hp << '/' << maxHp << '\n';
    return 0;
}`,
              bugLine: 4,
              options: [
                { t: "int hp{90};", why: "Correct: hp gets a real starting value before it's read." },
                { t: "int hp;  // set later", why: "A comment doesn't fill the box; the read on the next line is still UB." },
                { t: "int hp = hp;", why: "Copies hp's own garbage into itself: still UB." },
              ],
              answer: 0,
              hints: ["Which variable is read before it has a value?", "Give it a value where it's declared."],
              explain: "Printing an uninitialized hp is UB: the card might show 0, 32767 or anything else, and might differ between runs. Initialize it where you declare it.",
              sideBySide: {
                unsafe: C`int hp;   // garbage
std::cout << "HP: " << hp << '/' << maxHp << '\n';`,
                hardened: C`int hp{90};
std::cout << "HP: " << hp << '/' << maxHp << '\n';`,
              },
            },
          },
          {
            input: "119.5", label: "A fractional max HP from the config!",
            challenge: {
              id: "w2.p.a2", type: "harden", tags: ["w2.narrowing", "w2.convert"],
              short: "static_cast makes dropping the .5 a visible decision.",
              prompt: "The config file says max HP is 119.5, but maxHp must be a whole number, rounded down on purpose. Pick the safest initializer.",
              code: C`double configMaxHp{119.5};   // value from a config file
const int maxHp___;`,
              options: [
                { t: "{static_cast<int>(configMaxHp)}", why: "Correct: an explicit, visible conversion. Anyone reading it sees that rounding down is intentional (119)." },
                { t: "= configMaxHp", why: "Also gives 119, but silently: nobody can tell whether dropping the .5 was intended, and braces would have flagged it." },
                { t: "{configMaxHp}", why: "Ill-formed narrowing: Clang/MSVC reject it, GCC warns. You still must decide about the .5." },
                { t: "{119.5}", why: "Also a narrowing compile error, and it hardcodes the config value." },
              ],
              answer: 0,
              hints: ["Braces reject silent double-to-int conversions.", "Say what you mean with static_cast."],
              explain: "Brace init makes the compiler flag a lossy conversion, and `static_cast<int>` is how you say \"yes, drop the fraction, on purpose\". The data loss is now a decision, not an accident.",
              sideBySide: {
                unsafe: C`const int maxHp = configMaxHp;   // silently 119`,
                hardened: C`const int maxHp{static_cast<int>(configMaxHp)};   // 119, on purpose`,
              },
            },
          },
          {
            input: "hp = 45", label: "Integer division surprise!",
            challenge: {
              id: "w2.p.a3", type: "breakit", tags: ["w2.convert", "w2.int"], unsafe: true,
              short: "45 / 120 with ints is 0, not 0.375.",
              prompt: "Someone \"simplified\" the ratio line. Which hp value breaks it? (maxHp is 120.)",
              code: C`const int maxHp{120};
int hp{/* value */};
double hpRatio = hp / maxHp;
std::cout << "HP ratio: " << hpRatio << '\n';`,
              options: [
                { t: "hp = 120", why: "120 / 120 = 1: the right answer, so it hides the bug." },
                { t: "hp = 0", why: "0 / 120 = 0: correct by luck." },
                { t: "hp = 45", why: "Correct: 45 / 120 is integer division, 0, instead of 0.375." },
              ],
              answer: 2,
              hints: ["Which value gives a fractional true ratio?", "int / int drops the fraction."],
              explain: "`hp / maxHp` is int / int, so any hp below 120 gives 0. Convert hp to double before dividing.",
              sideBySide: {
                unsafe: C`double hpRatio = hp / maxHp;   // 45 / 120 = 0`,
                hardened: C`double hpRatio{static_cast<double>(hp) / maxHp};   // 0.375`,
              },
            },
          },
        ],
      },
    },

    /* =======================================================================
     * Boss: The Garbage Blob
     * ===================================================================== */
    boss: {
      id: "w2.boss", name: "The Garbage Blob", art: "blob",
      hp: 6,
      intro: "Blorp! I'm made of every variable you forgot to fill!",
      taunt: [
        "Go on, read me. I might be 0. I might be 21980. Blorp!",
        "It worked on your machine? Heh heh. Wait until release mode.",
        "Seven divided by two is three, little hero. Squelch!",
      ],
      rounds: [
        {
          id: "w2.boss.r1", type: "mcq", tags: ["w2.init"], bug: "uninit-var",
          short: "An uninitialized int holds garbage; reading it is UB.",
          prompt: "The Blob oozes out of `int x;` inside main(). What's in x?",
          options: [
            { t: "An indeterminate garbage value; reading it is undefined behavior", why: "Correct: nothing was stored, so reading it is UB." },
            { t: "Always 0", why: "Local ints are not zeroed for you. It might happen to be 0, which is the sneaky part." },
            { t: "Nothing: reading it just prints an empty line", why: "An int always has some bit pattern; you just don't know which, and reading it is UB." },
            { t: "A random number the compiler picks on purpose", why: "Nothing is picked on purpose: it's leftover memory, and the rules don't define what you get." },
          ],
          answer: 0,
          hints: ["Was anything ever put in the box?", "The Shield Lesson called it UB."],
          explain: "An uninitialized local int holds an indeterminate value. Reading it is undefined behavior: it may look fine, then fail later. Initialize it: `int x{};`.",
        },
        {
          id: "w2.boss.r2", type: "predict", tags: ["w2.int", "w2.convert"],
          short: "9 / 4 is 2 with ints; 9 % 4 is 1.",
          prompt: "What does this print?",
          code: C`int a{9};
int b{4};
std::cout << a / b << ' ' << a % b << '\n';`,
          options: [
            { t: "2 1\n", why: "Correct: 9 / 4 is 2 (integer division), 9 % 4 is 1." },
            { t: "2.25 1\n", why: "Both are ints, so / drops the fraction." },
            { t: "2 0.25\n", why: "% is the integer remainder: 9 = 4 * 2 + 1." },
            { t: "21\n", why: "The ' ' prints a space between the two numbers." },
          ],
          answer: 0,
          hints: ["int / int drops the fraction.", "9 = 4 * 2 + ?"],
          explain: "9 / 4 = 2 with ints, and the remainder 9 % 4 = 1.",
        },
        {
          id: "w2.boss.r3", type: "speed", tags: ["w2.auto", "w2.convert", "w2.bool", "w2.char", "w2.init"],
          short: "3.0 is double, 7 / 2 is 3, -2.8 truncates to -2.",
          prompt: "The Blob splits into six blobs! Speed round!",
          seconds: 45,
          items: [
            { q: "What type is v?", code: "auto v{3.0};", options: ["int", "double", "char"], answer: 1 },
            { q: "What does this print?", code: "std::cout << 7 / 2;", options: ["3", "3.5", "4"], answer: 0 },
            { q: "What value does t hold?", code: "int t{static_cast<int>(-2.8)};", options: ["-3", "3", "-2"], answer: 2 },
            { q: "What does this print?", code: "std::cout << true;", options: ["1", "true", "T"], answer: 0 },
            { q: "What type is 'A' + 1?", options: ["char", "int", "std::string"], answer: 1 },
            { q: "What does n hold?", code: "int n{};", options: ["garbage", "nothing", "0"], answer: 2 },
          ],
          hints: ["A decimal point means double; int / int drops fractions.", "Truncation goes toward zero; empty braces mean zero."],
          explain: "3.0 is double; 7 / 2 is 3; -2.8 truncates to -2; true prints 1; char + int is int; `int n{};` is 0.",
        },
        {
          id: "w2.boss.r4", type: "bug", tags: ["w2.init"], bug: "uninit-var", unsafe: true,
          short: "blobHp - 1 reads garbage; initialize it where it's declared.",
          prompt: "The Blob's own HP counter is garbage! Tap the buggy line, then pick the fix.",
          code: C`#include <iostream>

int main() {
    int blobHp;
    blobHp = blobHp - 1;
    std::cout << blobHp << '\n';
    return 0;
}`,
          bugLine: 3,
          options: [
            { t: "int blobHp{6};", why: "Correct: now line 4 computes 6 - 1 = 5, every time." },
            { t: "int blobHp;  // TODO: set this", why: "A TODO doesn't fill the box; blobHp - 1 still reads garbage." },
            { t: "unsigned blobHp;", why: "Changing the type doesn't initialize it: still garbage, still UB." },
          ],
          answer: 0,
          hints: ["Line 4 reads blobHp. Did it ever get a value?", "Initialize at the declaration."],
          explain: "`blobHp - 1` reads an uninitialized variable: UB. The fix is on the declaration line: give it a value.",
          sideBySide: {
            unsafe: C`int blobHp;
blobHp = blobHp - 1;   // UB: reads garbage`,
            hardened: C`int blobHp{6};
blobHp = blobHp - 1;   // 5`,
          },
        },
        {
          id: "w2.boss.r5", type: "predict", tags: ["w2.char", "w2.convert"],
          short: "c + 1 is int 67, stored back into a char as 'C'.",
          prompt: "What does this print? (Compare with char + int from Lesson 2.)",
          code: C`char c{'B'};
c = c + 1;
std::cout << c << '\n';`,
          options: [
            { t: "C\n", why: "Correct: c + 1 is int 67, but storing it in a char makes it 'C'." },
            { t: "67\n", why: "c + 1 is an int, but it's stored back into c, a char, so cout prints a character." },
            { t: "B1\n", why: "+ on a char does arithmetic on its code, not text joining." },
            { t: "66\n", why: "c is printed after the update, and it's printed as a character." },
          ],
          answer: 0,
          hints: ["What type is c after the assignment?", "'B' is 66, so 66 + 1 is 67, which is 'C'."],
          explain: "`c + 1` is int 67, then it's converted back to char when assigned to c. A char prints as a character: `C`.",
        },
        {
          id: "w2.boss.r6", type: "safe", tags: ["w2.init", "w2.narrowing", "w2.const", "w2.auto"], bug: "uninit-var",
          short: "Initialize everything; only std::string starts safely empty on its own.",
          prompt: "The Blob spits code at you. Safe or unsafe? Hurry!",
          seconds: 30,
          items: [
            { code: "double d{5};", safe: true, why: "5 is a constant that fits a double exactly, so braces allow it: d is 5.0." },
            { code: "int total;\ntotal += 5;", safe: false, why: "+= reads total first, and total was never initialized: UB." },
            { code: "const int k{3};", safe: true, why: "A const with a value: can't be garbage, can't change." },
            { code: "auto ratio{0.5};", safe: true, why: "auto deduces double from 0.5 and it's initialized." },
            { code: "int hp{};\nhp = hp + 1;", safe: true, why: "hp starts at 0, so hp + 1 is 1." },
            { code: "char c;\nstd::cout << c;", safe: false, why: "c holds garbage; reading it is UB." },
            { code: "std::string s;\nstd::cout << s.size();", safe: true, why: "A std::string starts empty: prints 0." },
            { code: "int hits = 4.9;", safe: false, why: "Compiles, but silently becomes 4: lost data the compiler would have caught with braces." },
          ],
          hints: ["Is every variable filled before it's read?", "Silent double-to-int with = is a hidden bug."],
          explain: "Initialize everything, prefer braces, and remember std::string is the one type here that starts safely empty on its own.",
        },
        {
          id: "w2.boss.r7", type: "order", tags: ["w2.init", "w1.main"],
          short: "Declare blobHp with a value before subtracting.",
          prompt: "Rebuild the Blob's HP counter safely so it prints 5. One line doesn't belong.",
          lines: [
            "#include <iostream>",
            "int main() {",
            "    int blobHp{6};",
            "    blobHp = blobHp - 1;",
            C`    std::cout << blobHp << '\n';`,
            "    return 0;",
            "}",
          ],
          distractors: ["    int blobHp;"],
          hints: ["Declare with a value before you subtract.", "The uninitialized declaration is the Blob's trick."],
          explain: "Include, open main, declare blobHp with a real value, subtract, print 5, return. `int blobHp;` would bring the garbage back.",
        },
        {
          id: "w2.boss.r8", type: "edge", tags: ["w2.convert", "w2.int"], unsafe: true,
          short: "Any odd sum loses its .5; divide by 2.0 instead.",
          prompt: "The Blob hid a bug in this average. Which test values expose it? Select all that apply.",
          code: C`int a{/* test */};
int b{/* test */};
double avg = (a + b) / 2;
std::cout << avg << '\n';`,
          options: [
            { t: "a = 4, b = 6", why: "(4 + 6) / 2 = 5 exactly: the bug stays hidden." },
            { t: "a = 3, b = 4", why: "Exposes it: prints 3 instead of 3.5." },
            { t: "a = 1, b = 2", why: "Exposes it: prints 1 instead of 1.5." },
            { t: "a = 10, b = 10", why: "20 / 2 = 10 exactly: hidden." },
            { t: "a = -3, b = 0", why: "Exposes it: -3 / 2 truncates toward zero to -1, instead of -1.5." },
          ],
          answers: [1, 2, 4],
          hints: ["The bug shows whenever a + b is odd.", "Negative odd sums count too: truncation goes toward zero."],
          explain: "`(a + b) / 2` is integer division, so any odd sum loses its .5. Divide by `2.0` so the division is done in double.",
          sideBySide: {
            unsafe: C`double avg = (a + b) / 2;     // int division`,
            hardened: C`double avg{(a + b) / 2.0};    // real division`,
          },
        },
      ],
      defense: [
        {
          attack: "?", label: "Garbage value!",
          challenge: {
            id: "w2.boss.d1", type: "harden", tags: ["w2.init", "w2.bool"], bug: "uninit-var",
            short: "bool isShielded{false}; starts the switch in a known position.",
            prompt: "The Blob fires a glob of garbage at isShielded. Block it: make isShielded start as false.",
            code: C`bool isShielded___;
std::cout << std::boolalpha << isShielded << '\n';`,
            options: [
              { t: "{false}", why: "Correct: the switch starts in a known position." },
              { t: "= isShielded", why: "Self-initialization reads the garbage it's supposed to replace: UB." },
              { t: "{maybe}", why: "There is no maybe: bools are true or false, and maybe is an undeclared name, so it won't compile." },
            ],
            answer: 0,
            hints: ["A bool must start as true or false.", "Put the value in braces."],
            explain: "An uninitialized bool is garbage like any other; reading it is UB. `bool isShielded{false};` prints `false` every time.",
            sideBySide: {
              unsafe: C`bool isShielded;   // garbage
std::cout << std::boolalpha << isShielded << '\n';`,
              hardened: C`bool isShielded{false};
std::cout << std::boolalpha << isShielded << '\n';   // false`,
            },
          },
        },
        {
          attack: "0.9", label: "Narrowing slime!",
          challenge: {
            id: "w2.boss.d2", type: "breakit", tags: ["w2.narrowing", "w2.convert"], unsafe: true,
            short: "0.9 silently truncates to 0: no armor at all.",
            prompt: "The Blob tries different armor values. Which one slips through and wipes out the armor?",
            code: C`double blobArmor{/* value */};
int armor = blobArmor;   // silent double to int
std::cout << "Armor: " << armor << '\n';`,
            options: [
              { t: "4.0", why: "Becomes 4: nothing lost." },
              { t: "0.9", why: "Correct: silently truncated to 0. No armor at all!" },
              { t: "10.0", why: "Becomes 10: nothing lost." },
            ],
            answer: 1,
            hints: ["Truncation chops the fraction.", "What's left of 0.9 without its fraction?"],
            explain: "`int armor = blobArmor;` silently truncates, so 0.9 becomes 0. Brace init (`int armor{blobArmor};`) is ill-formed narrowing that the compiler flags (an error on Clang/MSVC, a narrowing warning on GCC), forcing you to keep a double or convert on purpose.",
            sideBySide: {
              unsafe: C`int armor = blobArmor;   // 0.9 becomes 0`,
              hardened: C`double armor{blobArmor};   // keeps 0.9`,
            },
          },
        },
        {
          attack: "7 / 2", label: "Division drip!",
          challenge: {
            id: "w2.boss.d3", type: "harden", tags: ["w2.convert", "w2.narrowing"],
            short: "Cast blobs to double before dividing to get 3.5.",
            prompt: "7 blobs split between 2 squads. Make perSquad exactly 3.5.",
            code: C`int blobs{7};
int squads{2};
double perSquad{___};
std::cout << perSquad << '\n';`,
            options: [
              { t: "static_cast<double>(blobs) / squads", why: "Correct: blobs becomes 7.0 first, so the division is real: 3.5." },
              { t: "blobs / squads", why: "Gives 3, and braces flag int-to-double narrowing (error on Clang/MSVC, warning on GCC)." },
              { t: "static_cast<double>(blobs / squads)", why: "Too late: 7 / 2 is already 3 before the cast, so perSquad is 3." },
            ],
            answer: 0,
            hints: ["Convert before dividing.", "Cast an operand, not the result."],
            explain: "Only a double operand makes the division real. `static_cast<double>(blobs) / squads` is 3.5.",
            sideBySide: {
              unsafe: C`double perSquad = blobs / squads;   // 3`,
              hardened: C`double perSquad{static_cast<double>(blobs) / squads};   // 3.5`,
            },
          },
        },
      ],
      victory: "Blorrrp... my garbage... it's all zeros now... So... tidy... *splat*",
      reward: { xp: 150, cosmetic: "blob-bowtie", bug: "uninit-var" },
    },
  });
})();
