/* Cpp Hero: developer test world ("Dev Playground").
 * Loaded only when the URL has #dev. Exercises every engine feature:
 * all 12 challenge types, demo out/vars/"?"/note/crash/shield steps, vault cards
 * (normal + defense), reviewTags interleaving, project + stress test, boss rounds +
 * defense phase + reward, bestiary, cosmetic and achievement data.
 * All ids use the "wdev." / "dev-" prefix so they never collide with real content.
 */
window.CH = window.CH || {};
CH.content = CH.content || {};
["worlds", "bestiary", "achievements", "cosmetics", "quests"].forEach(function (k) {
  if (!Array.isArray(CH.content[k])) CH.content[k] = [];
});

CH.content.worlds.push({
  id: "wdev", num: 0, title: "Dev Playground", icon: "star",
  blurb: "A tiny test world that touches every engine feature. Not real teaching content.",
  story: {
    intro: "Welcome to the Dev Playground! Everything here is a test. Poke it all.",
    bossIntro: "The Dev Gremlin wants to break the build. Let's stop it!",
    victory: "Build is green! The Dev Gremlin retreats into the backlog.",
  },

  lessons: [
    /* ---------------- Lesson A: core challenge types ---------------- */
    {
      id: "wdev.l1", title: "Printing and variables", skill: "structure", shield: false,
      concept: {
        analogy: "A variable is a labeled box: you put a value in, and read it back later.",
        body: [
          "`std::cout` prints text; `<<` sends each piece to it in order.",
          "A variable declared with no value holds **garbage** until you assign it. Prefer `int hp = 3;` or `int hp{};`.",
        ],
        pitfall: "Beginners forget `std::` (or the `#include <iostream>`) and get \"cout was not declared\" errors.",
      },
      demo: {
        code: "#include <iostream>\n\nint main() {\n    int hp;\n    hp = 3;\n    std::cout << \"HP: \" << hp << '\\n';\n    std::cout << \"Bye!\\n\";\n    return 0;\n}",
        steps: [
          { line: 2, note: "Execution starts at main()." },
          { line: 3, vars: { hp: "?" }, note: "hp exists but holds garbage: reading it now would be UB." },
          { line: 4, vars: { hp: "3" }, note: "Now hp holds 3. (Better: initialize on the same line.)" },
          { line: 5, out: "HP: 3\n", note: "Each << piece prints in order; '\\n' ends the line." },
          { line: 6, out: "Bye!\n", note: "A second line of output." },
          { line: 7, note: "return 0 means success." },
        ],
      },
      challenges: [
        {
          id: "wdev.l1.c1", type: "mcq", tags: ["wdev.cout"],
          prompt: "What does `return 0;` at the end of main() mean?",
          options: [
            { t: "The program finished successfully", why: "Correct: 0 tells the OS the program succeeded." },
            { t: "The program printed nothing", why: "Return values have nothing to do with output." },
            { t: "Restart main() from the top", why: "return ends the function; it never loops." },
            { t: "The program crashed", why: "A non-zero value usually signals failure, not 0." },
          ],
          answer: 0,
          hints: ["Think about what the operating system learns from it.", "0 is the conventional success code."],
          explain: "main() returns an exit status to the OS; 0 means success.",
        },
        {
          id: "wdev.l1.c2", type: "predict", tags: ["wdev.cout"],
          prompt: "What does this print? (Watch the spaces.)",
          code: "#include <iostream>\n\nint main() {\n    std::cout << \"a b\" << ' ' << 1 + 2 << '\\n';\n    return 0;\n}",
          options: [
            { t: "a b 3\n", why: "Correct: \"a b\", then a space, then 3, then a newline." },
            { t: "a b3\n", why: "The ' ' character adds a space before 3." },
            { t: "a b 1 + 2\n", why: "1 + 2 is an expression, evaluated to 3 before printing." },
            { t: "a b 3", why: "'\\n' prints a newline at the end." },
          ],
          answer: 0,
          hints: ["Print each << piece in order.", "' ' is one space; 1 + 2 is computed first."],
          explain: "Output is \"a b\" + \" \" + \"3\" + newline.",
        },
        {
          id: "wdev.l1.c3", type: "fill", tags: ["wdev.cout"],
          prompt: "Fill the blank so this prints Hi.",
          code: "#include <iostream>\n\nint main() {\n    std::___ << \"Hi\\n\";\n    return 0;\n}",
          accept: ["cout"],
          placeholder: "name",
          hints: ["It's the standard output stream.", "c + out"],
          explain: "std::cout is the standard output stream.",
        },
        {
          id: "wdev.l1.c4", type: "order", tags: ["wdev.structure"],
          prompt: "Put the lines in order to build a working program.",
          lines: [
            "#include <iostream>",
            "int main() {",
            "    std::cout << \"Hi\\n\";",
            "    return 0;",
            "}",
          ],
          distractors: ["    cout << \"Hi\\n\";"],
          hints: ["Includes come first.", "The line without std:: won't compile here."],
          explain: "Include, open main, print, return, close. Plain `cout` needs `std::`.",
        },
        {
          id: "wdev.l1.c5", type: "write", tags: ["wdev.cout"],
          prompt: "Write one line that prints Hello followed by a newline using std::cout.",
          accept: ["std::cout << \"Hello\\n\";", "std::cout << \"Hello\" << '\\n';"],
          acceptRe: [
            "^std::cout\\s*<<\\s*\"Hello\\\\n\"\\s*;$",
            "^std::cout\\s*<<\\s*\"Hello\"\\s*<<\\s*('\\\\n'|\"\\\\n\"|std::endl)\\s*;$",
          ],
          placeholder: "std::cout << ...",
          hints: ["Start with std::cout <<", "Put \"Hello\\n\" in quotes and end with ;"],
          explain: "`std::cout << \"Hello\\n\";` prints Hello and ends the line.",
        },
        {
          id: "wdev.l1.c6", type: "speed", tags: ["wdev.cout", "wdev.structure"],
          prompt: "Speed round! Answer as many as you can.",
          seconds: 45,
          items: [
            { q: "Which header provides std::cout?", options: ["<iostream>", "<string>", "<vector>"], answer: 0 },
            { q: "What does this print?", code: "std::cout << 2 + 3;", options: ["23", "5", "2 + 3"], answer: 1 },
            { q: "Every statement ends with…", options: [":", ".", ";"], answer: 2 },
          ],
          hints: ["Don't overthink it.", "Speed matters; accuracy too."],
          explain: "<iostream> gives std::cout; 2 + 3 evaluates to 5; statements end with ;.",
        },
      ],
      recap: [
        "std::cout << prints each piece in order.",
        "Uninitialized variables hold garbage: initialize them.",
      ],
      vault: [
        { id: "wdev.v.hello", title: "Print a line", code: "std::cout << \"Hello\\n\";", note: "'\\n' ends the line.", defense: false },
      ],
      reviewTags: [],
    },

    /* ---------------- Lesson B: shield lesson, defensive types ---------------- */
    {
      id: "wdev.l2", title: "Guard your indexes", skill: "defense", shield: true,
      concept: {
        analogy: "Reading past the end of a vector is like opening a mailbox that isn't yours: anything can be inside.",
        body: [
          "`v[i]` does **no** bounds check; an out-of-range index is undefined behavior.",
          "Check `i < v.size()` first, or use `v.at(i)`, which throws `std::out_of_range`.",
        ],
        pitfall: "UB doesn't guarantee a crash: it can seem to work today and fail tomorrow or on another compiler.",
      },
      demo: {
        code: "#include <cstddef>\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> v{1, 2, 3};\n    std::size_t i = 5;\n    if (i < v.size()) {\n        std::cout << v[i] << '\\n';\n    } else {\n        std::cout << \"Index out of range\\n\";\n    }\n    return 0;\n}",
        steps: [
          { line: 5, vars: { v: "{1, 2, 3}" }, note: "A vector with 3 elements: valid indexes are 0..2." },
          { line: 6, vars: { v: "{1, 2, 3}", i: "5" }, note: "i is 5: too big!" },
          { line: 8, crash: "v[5] reads past the end: UB!", note: "Without a check, this line would read memory that isn't ours." },
          { line: 7, shield: "Bounds check blocked it!", note: "i < v.size() is false, so v[i] is skipped." },
          { line: 10, out: "Index out of range\n", note: "We report the problem instead of reading garbage." },
          { line: 12, note: "Program ends safely." },
        ],
      },
      challenges: [
        {
          id: "wdev.l2.c1", type: "bug", tags: ["wdev.bounds"], bug: "dev-imp", unsafe: true,
          prompt: "This loop reads out of bounds. Tap the buggy line, then pick the fix.",
          code: "#include <cstddef>\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> v{1, 2, 3};\n    for (std::size_t i = 0; i <= v.size(); ++i) {\n        std::cout << v[i] << '\\n';\n    }\n    return 0;\n}",
          bugLine: 6,
          options: [
            { t: "for (std::size_t i = 0; i < v.size(); ++i) {", why: "Correct: stops at the last valid index, size() - 1." },
            { t: "for (std::size_t i = 0; i <= v.size() + 1; ++i) {", why: "Goes even further past the end." },
            { t: "for (std::size_t i = 1; i <= v.size(); ++i) {", why: "Skips v[0] and still reads v[3]." },
          ],
          answer: 0,
          hints: ["How many times does the loop run for 3 elements?", "<= lets i reach v.size(), which is one past the end."],
          explain: "With <=, the last iteration reads v[3], past the end: UB. Use < v.size().",
          sideBySide: {
            unsafe: "for (std::size_t i = 0; i <= v.size(); ++i) {\n    std::cout << v[i] << '\\n';\n}",
            hardened: "for (int x : v) {\n    std::cout << x << '\\n';\n}",
          },
        },
        {
          id: "wdev.l2.c2", type: "breakit", tags: ["wdev.input"], unsafe: true,
          prompt: "Pick the input that breaks this program.",
          code: "#include <iostream>\n\nint divide(int a, int b) {\n    return a / b;\n}\n\nint main() {\n    int b = 0;\n    std::cin >> b;\n    std::cout << divide(10, b) << '\\n';\n    return 0;\n}",
          options: [
            { t: "2", why: "10 / 2 = 5: works fine." },
            { t: "0", why: "Correct: integer division by zero is undefined behavior." },
            { t: "-2", why: "10 / -2 = -5: works fine." },
            { t: "10", why: "10 / 10 = 1: works fine." },
          ],
          answer: 1,
          hints: ["Which number can't you divide by?", "Look at the divisor b."],
          explain: "Dividing an int by 0 is UB: it may crash, or not. Check b before dividing.",
          sideBySide: {
            unsafe: "int divide(int a, int b) {\n    return a / b;\n}",
            hardened: "#include <optional>\n\nstd::optional<int> divide(int a, int b) {\n    if (b == 0) {\n        return std::nullopt;\n    }\n    return a / b;\n}",
          },
        },
        {
          id: "wdev.l2.c3", type: "harden", tags: ["wdev.input"],
          prompt: "Choose the check that protects name[0].",
          code: "#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    std::getline(std::cin, name);\n    if (___) {\n        std::cout << \"Name can't be empty\\n\";\n        return 1;\n    }\n    std::cout << \"First letter: \" << name[0] << '\\n';\n    return 0;\n}",
          options: [
            { t: "name.empty()", why: "Correct: rejects the empty string before name[0] is used." },
            { t: "name.size() > 0", why: "Inverted: this rejects every valid name." },
            { t: "name[0] == ' '", why: "Checks the wrong thing; an empty name slips through." },
            { t: "name == nullptr", why: "A std::string is never a pointer; this doesn't compile." },
          ],
          answer: 0,
          hints: ["What input has no first letter?", "std::string has a member that checks for zero length."],
          explain: "Check name.empty() first; an empty name has no first letter to print.",
          sideBySide: {
            unsafe: "std::cout << \"First letter: \" << name[0] << '\\n';",
            hardened: "if (name.empty()) {\n    std::cout << \"Name can't be empty\\n\";\n    return 1;\n}\nstd::cout << \"First letter: \" << name[0] << '\\n';",
          },
        },
        {
          id: "wdev.l2.c4", type: "review", tags: ["wdev.bounds", "wdev.init"], bug: "dev-slime", unsafe: true,
          prompt: "Code review: tap every dangerous line, then submit.",
          code: "#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> v{4, 5, 6};\n    int n;\n    std::cout << v[3] << '\\n';\n    std::cout << n << '\\n';\n    std::cout << v.at(0) << '\\n';\n    return 0;\n}",
          dangerous: [6, 7],
          lineNotes: {
            5: "Declaring n without a value is legal, but it sets up the bug on the next reads.",
            6: "v has 3 elements; v[3] is out of bounds: UB.",
            7: "n was never initialized; reading it is UB.",
            8: "Safe: at(0) is bounds-checked and 0 is valid.",
          },
          hints: ["Two lines read something they shouldn't.", "Check the index against the size, and look for a variable with no value."],
          explain: "v[3] reads past the end and n is read uninitialized; both are UB.",
          sideBySide: {
            unsafe: "int n;\nstd::cout << v[3] << '\\n';\nstd::cout << n << '\\n';",
            hardened: "int n{};\nstd::cout << v.at(2) << '\\n';\nstd::cout << n << '\\n';",
          },
        },
        {
          id: "wdev.l2.c5", type: "edge", tags: ["wdev.edge"], unsafe: true,
          prompt: "Which test inputs expose a bug in average()? Select all that apply. (Assume 32-bit int.)",
          code: "#include <vector>\n\nint average(const std::vector<int>& v) {\n    int sum = 0;\n    for (int x : v) {\n        sum += x;\n    }\n    return sum / static_cast<int>(v.size());\n}",
          options: [
            { t: "{1, 2, 3}", why: "Normal input: returns 2." },
            { t: "{}", why: "Exposes it: size() is 0, so it divides by zero (UB)." },
            { t: "{2147483647, 1}", why: "Exposes it: the sum overflows int (UB)." },
            { t: "{-4, 4}", why: "Sums to 0, returns 0: fine." },
          ],
          answers: [1, 2],
          hints: ["Think about the smallest possible vector.", "Also think about very big numbers."],
          explain: "An empty vector divides by zero, and huge values overflow the int sum.",
          sideBySide: {
            unsafe: "int average(const std::vector<int>& v) {\n    int sum = 0;\n    for (int x : v) {\n        sum += x;\n    }\n    return sum / static_cast<int>(v.size());\n}",
            hardened: "#include <optional>\n#include <vector>\n\nstd::optional<double> average(const std::vector<int>& v) {\n    if (v.empty()) {\n        return std::nullopt;\n    }\n    long long sum = 0;\n    for (int x : v) {\n        sum += x;\n    }\n    return static_cast<double>(sum) / static_cast<double>(v.size());\n}",
          },
        },
        {
          id: "wdev.l2.c6", type: "safe", tags: ["wdev.bounds", "wdev.init"],
          prompt: "Safe or unsafe? Go fast!",
          seconds: 30,
          items: [
            { code: "int x{};\nstd::cout << x;", safe: true, why: "x is value-initialized to 0." },
            { code: "int* p = nullptr;\n*p = 5;", safe: false, why: "Dereferencing nullptr is UB." },
            { code: "std::vector<int> v(3);\nv.at(2) = 1;", safe: true, why: "Index 2 is valid, and at() checks anyway." },
            { code: "int a[3];\na[3] = 0;", safe: false, why: "a[3] is one past the end: UB." },
          ],
          hints: ["Look for reads/writes past the end.", "Look for missing initialization or null pointers."],
          explain: "Out-of-bounds and null dereferences are UB; initialized values and checked access are safe.",
        },
      ],
      recap: [
        "v[i] is unchecked: verify i < v.size() or use v.at(i).",
        "UB may seem to work: don't trust it.",
      ],
      vault: [
        { id: "wdev.v.at", title: "Checked access", code: "int x = v.at(i); // throws std::out_of_range", note: "at() checks the index.", defense: false },
        { id: "wdev.v.bounds", title: "Check before you index", code: "if (i < v.size()) {\n    use(v[i]);\n}", note: "Never index without knowing i is in range.", defense: true },
      ],
      reviewTags: ["wdev.cout"],
    },
  ],

  /* ---------------- Project ---------------- */
  project: {
    id: "wdev.p", title: "Age Checker", intro: "Build a tiny program that reads an age and prints it.",
    steps: [
      {
        id: "wdev.p.s1", type: "fill", tags: ["wdev.init"],
        prompt: "Initialize age so it never holds garbage.",
        code: "#include <iostream>\n\nint main() {\n    int age = ___;\n    return 0;\n}",
        accept: ["0"],
        placeholder: "value",
        hints: ["Pick a safe starting number.", "Zero works."],
        explain: "Starting at 0 means age always has a known value.",
      },
      {
        id: "wdev.p.s2", type: "order", tags: ["wdev.cout", "wdev.input"],
        prompt: "Order the lines: declare, read, print.",
        lines: [
          "int age = 0;",
          "std::cin >> age;",
          "std::cout << \"Age: \" << age << '\\n';",
        ],
        hints: ["You can't read into a variable that doesn't exist yet.", "Print last."],
        explain: "Declare, then read, then print.",
      },
    ],
    program: "#include <iostream>\n\nint main() {\n    int age = 0;\n    if (!(std::cin >> age) || age < 0) {\n        std::cout << \"Invalid age\\n\";\n        return 1;\n    }\n    std::cout << \"Age: \" << age << '\\n';\n    return 0;\n}",
    stress: {
      intro: "Curlo throws bad input at your program!",
      attacks: [
        {
          input: "abc", label: "Text instead of a number",
          challenge: {
            id: "wdev.p.a1", type: "harden", tags: ["wdev.input"],
            prompt: "Typing \"abc\" makes std::cin fail. Choose the check.",
            code: "#include <iostream>\n\nint main() {\n    int age = 0;\n    if (___) {\n        std::cout << \"Invalid age\\n\";\n        return 1;\n    }\n    std::cout << \"Age: \" << age << '\\n';\n    return 0;\n}",
            options: [
              { t: "!(std::cin >> age)", why: "Correct: reads and detects a failed read in one step." },
              { t: "age == 0", why: "0 is a valid age, and this doesn't check the stream state." },
              { t: "std::cin >> age", why: "Inverted: this rejects every successful read." },
            ],
            answer: 0,
            hints: ["The stream itself tells you if the read worked.", "A stream converts to false after a failed read."],
            explain: "`std::cin >> age` returns the stream; it is false if the read failed.",
            sideBySide: {
              unsafe: "std::cin >> age;\nstd::cout << \"Age: \" << age << '\\n';",
              hardened: "if (!(std::cin >> age)) {\n    std::cout << \"Invalid age\\n\";\n    return 1;\n}\nstd::cout << \"Age: \" << age << '\\n';",
            },
          },
        },
        {
          input: "-5", label: "Negative age",
          challenge: {
            id: "wdev.p.a2", type: "bug", tags: ["wdev.input"], bug: "dev-imp",
            prompt: "\"-5\" is accepted as an age. Tap the buggy line, then pick the fix.",
            code: "#include <iostream>\n\nint main() {\n    int age = 0;\n    if (!(std::cin >> age)) {\n        std::cout << \"Invalid age\\n\";\n        return 1;\n    }\n    std::cout << \"Age: \" << age << '\\n';\n    return 0;\n}",
            bugLine: 4,
            options: [
              { t: "if (!(std::cin >> age) || age < 0) {", why: "Correct: rejects failed reads and negative ages." },
              { t: "if (!(std::cin >> age) && age < 0) {", why: "&& needs both to be true, so -5 still gets through." },
              { t: "if (age < 0) {", why: "Never reads input at all." },
            ],
            answer: 0,
            hints: ["The check only looks at whether the read worked.", "Also reject values below 0."],
            explain: "A successful read isn't enough: the value must also be in range.",
            sideBySide: {
              unsafe: "if (!(std::cin >> age)) {",
              hardened: "if (!(std::cin >> age) || age < 0) {",
            },
          },
        },
      ],
    },
  },

  /* ---------------- Boss ---------------- */
  boss: {
    id: "wdev.boss", name: "The Dev Gremlin", art: "gremlin",
    hp: 3,
    intro: "I'll break your build!",
    taunt: ["Your tests are flaky!", "I love a missing bounds check!"],
    rounds: [
      {
        id: "wdev.boss.r1", type: "mcq", tags: ["wdev.cout"],
        prompt: "Which header do you need for std::cout?",
        options: [
          { t: "<iostream>", why: "Correct: it declares std::cout." },
          { t: "<string>", why: "That's for std::string." },
          { t: "<cout>", why: "No such standard header." },
        ],
        answer: 0,
        hints: ["Input/output stream.", "io + stream"],
        explain: "std::cout lives in <iostream>.",
      },
      {
        id: "wdev.boss.r2", type: "predict", tags: ["wdev.cout"],
        prompt: "What does this print?",
        code: "#include <iostream>\n\nint main() {\n    std::cout << \"x\" << 2 * 3 << \"y\\n\";\n    return 0;\n}",
        options: [
          { t: "x6y\n", why: "Correct: no spaces are printed between the pieces." },
          { t: "x 6 y\n", why: "<< doesn't add spaces." },
          { t: "x2 * 3y\n", why: "2 * 3 is evaluated to 6." },
          { t: "x6y", why: "\"y\\n\" ends with a newline." },
        ],
        answer: 0,
        hints: ["Pieces are glued together.", "Compute 2 * 3 first."],
        explain: "\"x\" + \"6\" + \"y\" + newline, with no spaces.",
      },
      {
        id: "wdev.boss.r3", type: "speed", tags: ["wdev.cout", "wdev.bounds"],
        prompt: "Speed round!",
        seconds: 45,
        items: [
          { q: "Valid indexes of a 3-element vector?", options: ["0..2", "1..3", "0..3"], answer: 0 },
          { q: "Which access is bounds-checked?", options: ["v[i]", "v.at(i)"], answer: 1 },
          { q: "What does this print?", code: "std::cout << 7 / 2;", options: ["3.5", "4", "3"], answer: 2 },
        ],
        hints: ["Indexes start at 0.", "Integer division drops the fraction."],
        explain: "Indexes run 0..size()-1; at() checks; 7 / 2 is 3 with ints.",
      },
      {
        id: "wdev.boss.r4", type: "fill", tags: ["wdev.bounds"],
        prompt: "Fill in the safe accessor.",
        code: "int x = v.___(i);",
        accept: ["at"],
        placeholder: "member",
        hints: ["It throws on a bad index.", "Two letters."],
        explain: "v.at(i) throws std::out_of_range instead of causing UB.",
      },
    ],
    defense: [
      {
        attack: "-5", label: "Negative number!",
        challenge: {
          id: "wdev.boss.d1", type: "harden", tags: ["wdev.bounds"],
          prompt: "The gremlin passes i = -5. Choose the guard.",
          code: "#include <vector>\n\nint pick(const std::vector<int>& v, int i) {\n    if (___) {\n        return -1;\n    }\n    return v[i];\n}",
          options: [
            { t: "i < 0 || i >= static_cast<int>(v.size())", why: "Correct: rejects negatives and too-large indexes." },
            { t: "i >= static_cast<int>(v.size())", why: "Misses negative indexes like -5." },
            { t: "i < 0", why: "Misses indexes that are too large." },
            { t: "v.empty()", why: "A non-empty vector still has out-of-range indexes." },
          ],
          answer: 0,
          hints: ["An index can be wrong in two directions.", "Check both the lower and upper bound."],
          explain: "A valid index satisfies 0 <= i < size(); check both ends.",
          sideBySide: {
            unsafe: "int pick(const std::vector<int>& v, int i) {\n    return v[i];\n}",
            hardened: "int pick(const std::vector<int>& v, int i) {\n    if (i < 0 || i >= static_cast<int>(v.size())) {\n        return -1;\n    }\n    return v[i];\n}",
          },
        },
      },
      {
        attack: "\"\"", label: "Empty string!",
        challenge: {
          id: "wdev.boss.d2", type: "breakit", tags: ["wdev.input"], bug: "dev-slime", unsafe: true,
          prompt: "Which name breaks greet()?",
          code: "#include <iostream>\n#include <string>\n\nvoid greet(const std::string& name) {\n    std::cout << \"Hi, \" << name.at(0) << \"!\\n\";\n}",
          options: [
            { t: "\"Ada\"", why: "Prints Hi, A!" },
            { t: "\"\"", why: "Correct: at(0) on an empty string throws std::out_of_range, and nothing catches it." },
            { t: "\"B\"", why: "Prints Hi, B!" },
            { t: "\"  \"", why: "The first char is a space; it prints, just oddly." },
          ],
          answer: 1,
          hints: ["Which string has no character at index 0?", "Think about length 0."],
          explain: "An empty string has no index 0; the uncaught exception ends the program.",
          sideBySide: {
            unsafe: "void greet(const std::string& name) {\n    std::cout << \"Hi, \" << name.at(0) << \"!\\n\";\n}",
            hardened: "void greet(const std::string& name) {\n    if (name.empty()) {\n        std::cout << \"Hi, stranger!\\n\";\n        return;\n    }\n    std::cout << \"Hi, \" << name[0] << \"!\\n\";\n}",
          },
        },
      },
    ],
    victory: "Nooo! My beautiful bugs!",
    reward: { xp: 100, cosmetic: "dev-cap", bug: "dev-imp" },
  },
});

/* ---------------- Shared-style dev data ---------------- */
CH.content.bestiary.push(
  {
    id: "dev-imp", name: "Dev Imp", world: "wdev",
    how: "Reads one element past the end of a container.",
    prevent: "Loop with i < size(), use range-for, or use at().",
    art: "imp", color: "#7A4FD0",
  },
  {
    id: "dev-slime", name: "Dev Slime", world: "wdev",
    how: "Uses a value before it's valid (uninitialized or empty).",
    prevent: "Initialize everything and check for empty input.",
    art: "slime",
  }
);
CH.content.cosmetics.push({ id: "dev-cap", slot: "hat", name: "Dev Cap" });
CH.content.achievements.push({ id: "dev-first", name: "Hello, Dev", desc: "Finish a dev lesson", test: "lessons:1" });
