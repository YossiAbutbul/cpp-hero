/* Cpp Hero: World 1 "Hello, World"
 * Pure content data (see docs/ARCHITECTURE.md, "Content schema" and "Text length").
 *
 * Authoring notes:
 * - C++ snippets are written with String.raw (R`...`) so the code reads exactly as the
 *   learner sees it: R`"Hi\n"` is the C++ text  "Hi\n"  (backslash + n), not a real newline.
 * - Predict options (`t`) are the EXACT program output, so they use normal JS strings,
 *   where "\n" is a real newline character and "\t" a real tab.
 * - Intentionally broken snippets (compile errors) say so in their prompt and carry unsafe: true.
 * - Line indices (demo steps, bugLine, dangerous) are 0-based into the code's lines.
 * - Text limits: concept.short <= 20 words, challenge.short <= 15, step notes <= 12,
 *   hints <= 15, recap <= 10, speech lines <= 15, option whys <= 20.
 *   Story fields are arrays of short speech lines (one bubble each).
 */
(function () {
  var R = String.raw;
  var CH = window.CH;

  CH.content.worlds.push({
    id: "w1",
    num: 1,
    title: "Hello, World",
    icon: "rocket",
    blurb: "Your first program: what C++ code looks like and how it becomes something that runs.",
    story: {
      intro: [
        "Oh! A visitor! Hi hi! I'm Curlo, and I live between these braces { }.",
        "This is my home, the Codebase. It used to be so tidy...",
        "But bugs keep sneaking in through every missing semicolon!",
        "Learn C++ with me, and together we'll kick out the bug lords.",
        "First up: making a program say hello. I'm brace-d and ready!"
      ],
      bossIntro: [
        "Uh-oh. Hear that giggling? It's the Syntax Gremlin, the first bug lord!",
        "He steals semicolons, scrambles #includes and misspells std::cout.",
        "But you can read error messages now. Let's end this statement properly;"
      ],
      victory: [
        "YOU DID IT! The Syntax Gremlin is gone, and every semicolon is home!",
        "Wait, he dropped a note: \"The Garbage Blob sends its regards.\"",
        "It's covered in random numbers. Something uninitialized stirs in World 2...",
        "Rest your fingers, hero. We march when you tap Continue!"
      ]
    },

    lessons: [
      /* ------------------------------------------------------------------ L1 */
      {
        id: "w1.l1",
        title: "Your first program",
        skill: "structure",
        shield: false,
        concept: {
          short: "Every C++ program starts running at the first line inside main(), and statements end with ;.",
          analogy: "A program is like a recipe card: tools listed at the top, cooking starts at **main**.",
          body: [
            "Every program has exactly one `main()`. Execution starts at the first line inside its braces `{ }` and runs down, statement by statement.",
            "Most statements end with a semicolon `;`, like a full stop. The braces group the statements that belong to `main()`.",
            "`return 0;` tells the operating system \"all good\". Only in `main()` may you leave it out (0 is returned for you)."
          ],
          pitfall: "Writing `Main()`. C++ is case-sensitive, so the linker can't find `main` and your program has no starting point."
        },
        demo: {
          code: R`#include <iostream>

int main() {
    std::cout << "Hello, Codebase!\n";
    return 0;
}`,
          steps: [
            { line: 0, note: "Brings in the printing tools." },
            { line: 2, note: "The program starts here, at main()." },
            { line: 3, out: "Hello, Codebase!\n", note: "std::cout prints the text; \\n ends the line." },
            { line: 4, note: "return 0; reports success." },
            { line: 5, note: "The closing } ends the program. Balanced braces!" }
          ]
        },
        challenges: [
          {
            id: "w1.l1.c1",
            type: "mcq",
            tags: ["w1.main"],
            prompt: "When you run a C++ program, where does execution begin?",
            options: [
              { t: "At the very first line of the file", why: "Those are usually #include lines, handled while building, not run as steps." },
              { t: "At the first statement inside main()", why: "Correct! main() is every program's one starting point." },
              { t: "At whichever function is written last", why: "File order doesn't matter. main() is the start, wherever it is." },
              { t: "At the line with return 0;", why: "return 0; is where main() finishes, not where it begins." }
            ],
            answer: 1,
            hints: ["Every program needs one clearly marked starting point.", "Four letters, followed by ()."],
            short: "Execution always begins inside main().",
            explain: "Execution always begins inside main(). Everything else in the file is either setup for the compiler (like #include) or code that main() eventually uses."
          },
          {
            id: "w1.l1.c2",
            type: "predict",
            tags: ["w1.cout", "w1.main"],
            prompt: "What exactly does this program print?",
            code: R`#include <iostream>

int main() {
    std::cout << "Hi";
    std::cout << "!\n";
    return 0;
}`,
            options: [
              { t: "Hi\n!\n", why: "cout never starts a new line by itself. Only the \\n does." },
              { t: "Hi !\n", why: "No space appears unless it's inside the quotes." },
              { t: "Hi!\n", why: "Correct! \"Hi\", then \"!\", then the newline." },
              { t: "Hi!", why: "The \\n at the end really is printed: it ends the line." }
            ],
            answer: 2,
            hints: ["Two cout statements still share one line unless \\n says otherwise.", "Glue the two strings together exactly, including the \\n."],
            short: "cout prints exactly what you give it: no extra spaces or line breaks.",
            explain: "cout prints exactly what you give it, in order: \"Hi\", then \"!\", then a newline. Splitting text across two statements doesn't add spaces or line breaks."
          },
          {
            id: "w1.l1.c3",
            type: "order",
            tags: ["w1.main"],
            prompt: "Put the lines in order to build a complete program that prints Hello!",
            lines: [
              "#include <iostream>",
              "int main() {",
              R`    std::cout << "Hello!\n";`,
              "    return 0;",
              "}"
            ],
            distractors: ["int Main() {"],
            hints: ["The #include line comes before the code that uses it.", "Open main with {, print, return 0;, close with }. Watch capitals!"],
            short: "Include, main() {, statements, return 0;, }. And main is lowercase.",
            explain: "Includes first, then main() with its opening brace, the statements in the order they should run, and finally the closing brace. \"int Main()\" is a trap: C++ is case-sensitive, and the program needs a lowercase main."
          },
          {
            id: "w1.l1.c4",
            type: "fill",
            tags: ["w1.main"],
            prompt: "Fill in the blank so this program has a proper starting point.",
            code: R`#include <iostream>

int ___() {
    std::cout << "Ready for launch!\n";
    return 0;
}`,
            accept: ["main"],
            placeholder: "function name",
            hints: ["Every program starts at a function with a very specific name.", "Lowercase, four letters: m _ _ _."],
            short: "The starting function must be named exactly main.",
            explain: "The starting function must be named exactly main, all lowercase. Any other name compiles, but the linker won't find a starting point."
          },
          {
            id: "w1.l1.c5",
            type: "bug",
            tags: ["w1.main", "w1.compile"],
            prompt: "This program does NOT compile (intentionally broken). Tap the buggy line, then pick the fix.",
            code: R`#include <iostream>

int main() {
    std::cout << "Launch!\n"
    return 0;
}`,
            unsafe: true,
            bugLine: 3,
            options: [
              { t: "Add ; at the end of the std::cout line", why: "Correct! Without it, the compiler reads straight into return 0." },
              { t: "Add another ; after return 0;", why: "return 0; is already fine. The missing ; is on the line above." },
              { t: "Remove the #include line", why: "Then std::cout is unknown too. Worse, not better." },
              { t: "Change \\n to std::endl", why: "The newline isn't the problem. The semicolon is still missing." }
            ],
            answer: 0,
            bug: "missing-semicolon",
            hints: ["Look at the end of each statement inside main().", "One line is missing its full stop."],
            short: "Missing ; on the cout line. Errors often point at the next line.",
            explain: "The std::cout line is missing its ;. The compiler usually reports this at the end of that line, or at the start of the next one (\"expected ';' before 'return'\"). When an error points at a line that looks fine, check the line above it.",
            sideBySide: {
              unsafe: R`int main() {
    std::cout << "Launch!\n"   // missing ;
    return 0;
}`,
              hardened: R`int main() {
    std::cout << "Launch!\n";
    return 0;
}`
            }
          }
        ],
        recap: [
          "Programs start at the first line inside main().",
          "Statements end with ; and main lives in { }.",
          "C++ is case-sensitive: main is not Main.",
          "return 0; means success."
        ],
        vault: [
          {
            id: "w1.hello",
            title: "Hello World skeleton",
            code: R`#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
    return 0;
}`,
            note: "The smallest useful program. Execution starts inside main(); every statement ends with ;.",
            defense: false
          }
        ],
        reviewTags: []
      },

      /* ------------------------------------------------------------------ L2 */
      {
        id: "w1.l2",
        title: "#include and std::",
        skill: "toolkit",
        shield: false,
        concept: {
          short: "#include <iostream> brings in the printing tools; std::cout means the cout from the standard library.",
          analogy: "#include borrows a toolbox, and `std::` is the label on the shelf it came from.",
          body: [
            "`#include <iostream>` is a **preprocessor directive**: before compiling, it pastes in the declarations for `std::cout`. Directives start with `#` and take **no** semicolon.",
            "The standard library lives in the **namespace** `std`. `std::cout` = \"the `cout` in `std`\". `::` is the scope resolution operator.",
            "Skip `using namespace std;`: it dumps hundreds of names into your code and invites clashes. `std::` is short and clear.",
            "Rule: **include what you use**."
          ],
          pitfall: "Leaving out `#include <iostream>` and getting lucky because another header pulled it in. It breaks on another compiler."
        },
        demo: {
          code: R`#include <iostream>   // the input/output toolbox

int main() {
    std::cout << "Toolbox loaded.\n";
    std::cout << "std::cout found!\n";
    return 0;
}`,
          steps: [
            { line: 0, note: "Before compiling, <iostream>'s contents get pasted here. No semicolon!" },
            { line: 2, note: "Execution starts in main()." },
            { line: 3, out: "Toolbox loaded.\n", note: "std:: means: the cout from the standard library." },
            { line: 4, out: "std::cout found!\n", note: "Inside quotes, std::cout is just text." },
            { line: 5, note: "Done: return 0; means success." }
          ]
        },
        challenges: [
          {
            id: "w1.l2.c1",
            type: "mcq",
            tags: ["w1.include"],
            prompt: "What does #include <iostream> do?",
            options: [
              { t: "It prints the word iostream on the screen", why: "Nothing is printed. #include works before the program even exists." },
              { t: "It makes the program run faster", why: "Headers don't speed things up. They make names like std::cout available." },
              { t: "It creates a variable called iostream", why: "No variables here. It pastes in a header file's contents." },
              { t: "Before compiling, it pastes in the declarations for input/output tools like std::cout", why: "Correct! The compiler then knows what std::cout is." }
            ],
            answer: 3,
            hints: ["Lines starting with # are handled before real compiling begins.", "Think \"borrow a toolbox\": what tools live in iostream?"],
            short: "It pastes in the input/output declarations before compiling.",
            explain: "#include is a preprocessor directive. It pastes the header's contents into your file before compiling, so the compiler knows about std::cout and the other input/output tools."
          },
          {
            id: "w1.l2.c2",
            type: "write",
            tags: ["w1.include"],
            prompt: "Write the line that gives your program access to std::cout.",
            accept: ["#include <iostream>", "# include <iostream>"],
            placeholder: "#...",
            hints: ["It's a preprocessor directive, so it starts with #.", "The header is iostream, inside angle brackets."],
            short: "#include <iostream>, with no semicolon.",
            explain: "#include <iostream> is the one. Note there's no semicolon: preprocessor directives end at the end of the line."
          },
          {
            id: "w1.l2.c3",
            type: "mcq",
            tags: ["w1.include", "w1.cout"],
            prompt: "In std::cout, what does the std:: part mean?",
            options: [
              { t: "\"Standard output\": it's what makes cout print", why: "No: std names the namespace. The \"out\" in cout is the output part." },
              { t: "It's the cout that lives in the standard library's namespace, std", why: "Correct! :: picks a name out of the std namespace." },
              { t: "It's optional decoration the compiler ignores", why: "Not ignored! Without std::, the compiler says cout is not declared." },
              { t: "It marks cout as a comment", why: "Comments use // or /* */, not std::." }
            ],
            answer: 1,
            hints: ["The library keeps its names in a labelled box to avoid clashes.", "The :: operator reaches into a namespace to pick one name."],
            short: "std:: means \"from the standard library's namespace\".",
            explain: "std is the namespace holding the standard library, and :: is the scope resolution operator. std::cout = \"the cout from std\". Writing it out keeps your code clear and avoids name clashes."
          },
          {
            id: "w1.l2.c4",
            type: "bug",
            tags: ["w1.include", "w1.compile"],
            prompt: "Intentionally broken: the build fails with \"fatal error: iostrem: No such file or directory\". Tap the buggy line, then pick the fix.",
            code: R`#include <iostrem>

int main() {
    std::cout << "Where is my toolbox?\n";
    return 0;
}`,
            unsafe: true,
            bugLine: 0,
            options: [
              { t: "#include <iostrem>;", why: "Directives take no semicolon, and it's still misspelled." },
              { t: "#import <iostream>", why: "#import isn't standard C++. Use #include." },
              { t: "#include <iostream>", why: "Correct! i-o-s-t-r-e-a-m: input/output stream." },
              { t: "#include \"iostrem\"", why: "Quotes change where it searches, but the name is still misspelled." }
            ],
            answer: 2,
            bug: "typo-gremlin",
            hints: ["The error message names the file it couldn't find.", "Spell it out: i-o-s-t-r-e-a-m."],
            short: "A misspelled header can't be found, so the build stops.",
            explain: "One missing letter and the preprocessor can't find the header, so the build stops immediately (a \"fatal\" error). Error messages often quote the exact thing that's wrong. Read them!",
            sideBySide: {
              unsafe: R`#include <iostrem>    // typo: header not found`,
              hardened: R`#include <iostream>`
            }
          },
          {
            id: "w1.l2.c5",
            type: "predict",
            tags: ["w1.cout", "w1.include"],
            prompt: "What exactly does this program print?",
            code: R`#include <iostream>

int main() {
    std::cout << "std::cout";
    std::cout << " works\n";
    return 0;
}`,
            options: [
              { t: "cout works\n", why: "Text inside quotes prints exactly, std:: included." },
              { t: "std::cout works\n", why: "Correct! The second string starts with a space." },
              { t: "std::coutworks\n", why: "Look closely: the second string begins with a space." },
              { t: "std::cout\n works\n", why: "Nothing prints a newline after the first string." }
            ],
            answer: 1,
            hints: ["Inside quotes, code-looking text is just text.", "Check the very first character of the second string."],
            short: "Quoted text prints as-is, even if it looks like code.",
            explain: "Quotes make a string literal: its contents are printed character by character, even if they look like code. The space at the start of \" works\" separates the two words."
          }
        ],
        recap: [
          "#include <iostream> brings in std::cout.",
          "Directives start with # and take no semicolon.",
          "std:: means from the standard library.",
          "Include what you use; don't rely on luck."
        ],
        vault: [
          {
            id: "w1.include",
            title: "Include what you use",
            code: R`#include <iostream>   // std::cout, std::cin

int main() {
    std::cout << "Tools ready\n";
}`,
            note: "Directives start with # and take no ;. Standard names live in std, reached with ::.",
            defense: false
          }
        ],
        reviewTags: ["w1.main"]
      },

      /* ------------------------------------------------------------------ L3 */
      {
        id: "w1.l3",
        title: "Printing with std::cout",
        skill: "structure",
        shield: false,
        concept: {
          short: "std::cout << prints items in order, adding nothing extra. \\n ends a line.",
          analogy: "std::cout is a conveyor belt to the screen: each `<<` adds one item, in order.",
          body: [
            "`<<` is the **insertion operator**. Chain as many as you like: `std::cout << \"HP: \" << 3 << '\\n';`",
            "cout adds no spaces or new lines. Put spaces inside the quotes; end lines with `'\\n'` or a `\\n` in the string.",
            "**Escape sequences**: `\\n` new line, `\\t` tab, `\\\"` double quote, `\\\\` backslash.",
            "`std::endl` ends the line **and** flushes (slower). Prefer `'\\n'` unless you need the flush."
          ],
          pitfall: "Expecting `std::cout << \"Level\" << 1;` to print `Level 1`. It prints `Level1`."
        },
        demo: {
          code: R`#include <iostream>

int main() {
    std::cout << "HP: " << 3 << '\n';
    std::cout << "Shield:\t" << "wood" << '\n';
    std::cout << "Curlo says \"hi!\"\n";
    return 0;
}`,
          steps: [
            { line: 2, note: "Start at main()." },
            { line: 3, out: "HP: 3\n", note: "Three items: text, the number 3, a newline." },
            { line: 4, out: "Shield:\twood\n", note: "\\t is a tab: it jumps to the next tab stop." },
            { line: 5, out: "Curlo says \"hi!\"\n", note: "\\\" prints a quote without ending the string." },
            { line: 6, note: "All printed. return 0; means success." }
          ]
        },
        challenges: [
          {
            id: "w1.l3.c1",
            type: "predict",
            tags: ["w1.cout"],
            prompt: "What exactly does this program print?",
            code: R`#include <iostream>

int main() {
    std::cout << "Level" << 1 << '\n';
    std::cout << "XP: " << 20 << '\n';
    return 0;
}`,
            options: [
              { t: "Level 1\nXP: 20\n", why: "cout doesn't insert a space between \"Level\" and 1." },
              { t: "Level1XP: 20\n", why: "The first '\\n' ends the first line." },
              { t: "Level1\nXP:20\n", why: "\"XP: \" has a space inside its quotes, so it prints." },
              { t: "Level1\nXP: 20\n", why: "Correct! No space after Level, one after XP: (inside the quotes)." }
            ],
            answer: 3,
            hints: ["Spaces only appear if they're inside the quotes.", "Compare \"Level\" and \"XP: \" character by character."],
            short: "Spaces appear only where they're inside the quotes.",
            explain: "Every item is printed exactly as-is: \"Level\" then 1 (no gap), newline; then \"XP: \" (with its space) then 20, newline."
          },
          {
            id: "w1.l3.c2",
            type: "predict",
            tags: ["w1.cout"],
            prompt: "What exactly does this program print?",
            code: R`#include <iostream>

int main() {
    std::cout << "A\n";
    std::cout << "B";
    std::cout << "C\n";
    return 0;
}`,
            options: [
              { t: "A\nBC\n", why: "Correct! B has no newline, so C lands right next to it." },
              { t: "A\nB\nC\n", why: "Statements aren't lines. \"B\" has no \\n after it." },
              { t: "ABC\n", why: "\"A\\n\" ends with a newline, so B starts a new line." },
              { t: "A\nB C\n", why: "There's no space anywhere between B and C." }
            ],
            answer: 0,
            hints: ["Find every \\n. Those are the only line breaks.", "\"B\" has no \\n after it."],
            short: "Only \\n breaks lines, so B and C share a line.",
            explain: "Line breaks come only from \\n. After \"A\\n\" we're on line 2; \"B\" and \"C\\n\" both land there: BC, then the line ends."
          },
          {
            id: "w1.l3.c3",
            type: "fill",
            tags: ["w1.cout"],
            prompt: "Fill in the missing operator so both items go onto the output belt.",
            code: R`#include <iostream>

int main() {
    std::cout << "Ready" ___ '\n';
    return 0;
}`,
            accept: ["<<"],
            placeholder: "operator",
            hints: ["It's the same operator used right after std::cout.", "Two less-than signs pointing toward cout."],
            short: "Every item needs its own << in front.",
            explain: "Each item needs its own << in front of it. Chaining std::cout << a << b; sends a, then b."
          },
          {
            id: "w1.l3.c4",
            type: "write",
            tags: ["w1.cout"],
            prompt: "Write one statement that prints Hello! and then ends the line.",
            accept: [
              R`std::cout << "Hello!\n";`,
              R`std::cout << "Hello!" << '\n';`,
              R`std::cout << "Hello!" << "\n";`,
              R`std::cout << "Hello!" << std::endl;`
            ],
            placeholder: "std::cout << ...",
            hints: ["Start with std::cout << and put the text in double quotes.", "End the line with \\n, then finish with ;."],
            short: "std::cout << \"Hello!\\n\"; does it.",
            explain: "std::cout << \"Hello!\\n\"; is the classic. std::cout << \"Hello!\" << '\\n'; works just as well. std::endl also works but flushes too, which is slower."
          },
          {
            id: "w1.l3.c5",
            type: "mcq",
            tags: ["w1.cout"],
            prompt: "What's the difference between '\\n' and std::endl?",
            options: [
              { t: "No difference at all", why: "There is one: std::endl also flushes the stream." },
              { t: "'\\n' only works on Windows", why: "'\\n' works everywhere; the system handles line endings." },
              { t: "Both end the line, but std::endl also flushes the output, which is slower", why: "Correct! Default to '\\n'; use std::endl only when you need a flush." },
              { t: "std::endl adds a blank line; '\\n' doesn't", why: "Both end the current line exactly once." }
            ],
            answer: 2,
            hints: ["Both of them move to a new line.", "One does an extra job: forcing output out right away."],
            short: "Both end the line; std::endl also flushes, which is slower.",
            explain: "Both end the line. std::endl also flushes, forcing buffered output to the screen right away. That extra work adds up in loops, so prefer '\\n'."
          }
        ],
        recap: [
          "<< pushes items onto the output, in order.",
          "cout adds no spaces and no new lines.",
          "Escapes: \\n new line, \\t tab, \\\" quote.",
          "Prefer '\\n' over std::endl."
        ],
        vault: [
          {
            id: "w1.cout",
            title: "std::cout cheat sheet",
            code: R`std::cout << "HP: " << 3 << '\n';   // HP: 3
std::cout << "A\tB\n";              // tab between A and B
std::cout << "Say \"hi\"\n";        // Say "hi"
std::cout << "C:\\temp\n";          // C:\temp`,
            note: "cout prints exactly what you give it. Escapes: \\n \\t \\\" \\\\. Prefer '\\n' over std::endl.",
            defense: false
          }
        ],
        reviewTags: ["w1.main", "w1.include"]
      },

      /* ------------------------------------------------------------------ L4 */
      {
        id: "w1.l4",
        title: "Comments",
        skill: "structure",
        shield: false,
        concept: {
          short: "Comments are notes for humans. // lasts to the end of the line; /* */ can span lines.",
          analogy: "Comments are sticky notes that the compiler peels off before building.",
          body: [
            "`//` comments out the rest of the line. `/* ... */` can span many lines but does **not** nest: the first `*/` ends it.",
            "Good comments explain **why**, not what. `// retry: the network is flaky` helps; `// print hello` is noise.",
            "Debugging trick: put `//` in front of a line to switch it off.",
            "Inside a string, `//` is just text: `\"http://site\"` prints the slashes."
          ],
          pitfall: "Nesting block comments: `/* a /* b */ oops */` ends at the first `*/`, so `oops */` becomes code and the build fails."
        },
        demo: {
          code: R`#include <iostream>

// Mission log, day 1
int main() {
    std::cout << "Systems online\n"; // status line
    /* std::cout << "Self-destruct\n"; */
    std::cout << "All quiet\n";
    return 0;
}`,
          steps: [
            { line: 2, note: "A // comment. The compiler skips it." },
            { line: 3, note: "Execution starts in main()." },
            { line: 4, out: "Systems online\n", note: "The code runs; the trailing comment is ignored." },
            { line: 5, note: "Inside /* */, so it never runs. Phew, no self-destruct!" },
            { line: 6, out: "All quiet\n", note: "Back to normal code." },
            { line: 7, note: "return 0; means success." }
          ]
        },
        challenges: [
          {
            id: "w1.l4.c1",
            type: "predict",
            tags: ["w1.comments", "w1.cout"],
            prompt: "What exactly does this program print?",
            code: R`#include <iostream>

int main() {
    // std::cout << "one\n";
    std::cout << "two\n"; // std::cout << "three\n";
    /* std::cout << "four\n"; */
    std::cout << "five\n";
    return 0;
}`,
            options: [
              { t: "one\ntwo\nfive\n", why: "The \"one\" line starts with //, so it's all comment." },
              { t: "two\nthree\nfive\n", why: "// hides the rest of its line, including the second cout." },
              { t: "two\nfive\n", why: "Correct! Only the two statements outside comments run." },
              { t: "two\nfour\nfive\n", why: "\"four\" is wrapped in /* */, so it never runs." }
            ],
            answer: 2,
            hints: ["// hides the REST of its line, even after real code.", "/* */ hides everything between the markers."],
            short: "Only code outside comments runs: two and five.",
            explain: "Only \"two\" and \"five\" are outside comments. Note that the // on line 5 only hides the part after it: the first cout on that line still runs."
          },
          {
            id: "w1.l4.c2",
            type: "mcq",
            tags: ["w1.comments"],
            prompt: "Which comment is the most helpful to a future reader?",
            options: [
              { t: "// print the text", why: "It repeats what the code already says. Just noise." },
              { t: "// Report goes to a log reader that only understands plain text, so no tabs", why: "Correct! It explains WHY, which the code alone can't tell you." },
              { t: "// cout", why: "One word, no information. The code already shows cout." },
              { t: "// TODO", why: "A TODO with no details helps nobody." }
            ],
            answer: 1,
            hints: ["The code already shows WHAT it does.", "The best comment explains a reason the reader couldn't guess."],
            short: "Good comments explain why, not what.",
            explain: "Good comments capture intent and reasons (\"why\"), which code can't express. Comments that restate the code just go stale."
          },
          {
            id: "w1.l4.c3",
            type: "predict",
            tags: ["w1.comments", "w1.cout"],
            prompt: "Tricky one! What exactly does this program print?",
            code: R`#include <iostream>

int main() {
    std::cout << "http://codebase.dev\n";
    return 0;
}`,
            options: [
              { t: "http:", why: "Inside a string, // is just two slashes, not a comment." },
              { t: "http://codebase.dev\n", why: "Correct! Comment markers inside strings are ordinary text." },
              { t: "http:/codebase.dev\n", why: "Both slashes are printed; nothing is swallowed." },
              { t: "\n", why: "The whole string is printed, not just the newline." }
            ],
            answer: 1,
            hints: ["Does the compiler look for comments inside quotes?", "Strings are printed character by character."],
            short: "// inside a string is just text.",
            explain: "Comments are only recognized in code, never inside string literals. \"http://...\" prints its slashes just fine."
          },
          {
            id: "w1.l4.c4",
            type: "bug",
            tags: ["w1.comments", "w1.compile"],
            prompt: "Intentionally broken: this doesn't compile. Tap the buggy line, then pick the fix.",
            code: R`#include <iostream>

int main() {
    /* turn off the alarm /* for now */ please */
    std::cout << "Quiet mode\n";
    return 0;
}`,
            unsafe: true,
            bugLine: 3,
            options: [
              { t: "Move the comment below the std::cout line", why: "Position doesn't matter. It still ends early, leaving please */ as code." },
              { t: "/* turn off the alarm /* for now */ please */;", why: "A semicolon doesn't help: \"please */\" is still code." },
              { t: "/* turn off the alarm /* for now */ please /*", why: "That opens a comment that never closes and swallows the file." },
              { t: "/* turn off the alarm (for now) please */", why: "Correct! One /* and one */: the whole note is inside." }
            ],
            answer: 3,
            hints: ["Block comments end at the FIRST */ they meet.", "After the first */, what's left over on that line?"],
            short: "Block comments don't nest: the first */ ends them.",
            explain: "Block comments don't nest. The comment ends at the first */, leaving \"please */\" as code, which the compiler can't understand. GCC and Clang can also warn about a /* inside a comment (-Wcomment, part of -Wall).",
            sideBySide: {
              unsafe: R`/* turn off the alarm /* for now */ please */`,
              hardened: R`/* turn off the alarm (for now) please */`
            }
          },
          {
            id: "w1.l4.c5",
            type: "fill",
            tags: ["w1.comments"],
            prompt: "Turn this line into a single-line comment so the compiler ignores it.",
            code: R`#include <iostream>

int main() {
    ___ TODO: add the mission stats here
    std::cout << "Mission log\n";
    return 0;
}`,
            accept: ["//"],
            placeholder: "comment marker",
            hints: ["It's the short kind of comment, for one line.", "Two forward slashes."],
            short: "// comments out the rest of the line.",
            explain: "// comments out the rest of the line. /* would also start a comment, but it would need a matching */."
          }
        ],
        recap: [
          "// to end of line; /* */ spans lines.",
          "Block comments don't nest.",
          "Comment the why, not the what.",
          "// inside a string is just text."
        ],
        vault: [
          {
            id: "w1.comments",
            title: "Comment styles",
            code: R`// single line: until end of line
std::cout << "hi\n"; // after code, too
/* block comment,
   can span lines */`,
            note: "Block comments do NOT nest. Comment the why, not the what.",
            defense: false
          }
        ],
        reviewTags: ["w1.cout"]
      },

      /* ------------------------------------------------------------------ L5 */
      {
        id: "w1.l5",
        title: "What compiling means",
        skill: "structure",
        shield: false,
        concept: {
          short: "The compiler translates your C++ into a program the computer can run. Rebuild after every change.",
          analogy: "Compiling is translating a book once, so the CPU can read it as often as you like.",
          body: [
            "Building has stages: the **preprocessor** handles `#include`, the **compiler** turns code into machine code (an object file), and the **linker** joins it with library code into an **executable**.",
            "Typical: `g++ -std=c++20 -Wall -Wextra main.cpp -o hero`, then `./hero`. `-o hero` names the output.",
            "**Compile-time errors** (like a missing `;`) stop the build: no program at all. **Run-time** problems happen later, in a program that built fine.",
            "Changed the source? Compile again, or you run the old code."
          ],
          pitfall: "Editing the .cpp, forgetting to rebuild, and wondering why nothing changed. The executable is a snapshot of the last build."
        },
        demo: {
          code: R`#include <iostream>

int main() {
    std::cout << "Compiled at last!\n";
    return 0;
}`,
          steps: [
            { line: 0, note: "Preprocessor: pastes in the contents of <iostream>." },
            { line: 2, note: "Compiler: checks the code, turns it into machine code." },
            { line: 3, note: "Linker: connects std::cout to the library, writes the executable." },
            { line: 2, note: "Now you RUN it. Execution begins at main()." },
            { line: 3, out: "Compiled at last!\n", note: "The machine code prints the text." },
            { line: 4, note: "main() returns 0: success." }
          ]
        },
        challenges: [
          {
            id: "w1.l5.c1",
            type: "order",
            tags: ["w1.compile"],
            prompt: "Put the journey from source code to running program in order.",
            lines: [
              "Write source code in main.cpp",
              "Preprocessor handles the #include lines",
              "Compiler translates the code into machine code (object file)",
              "Linker combines it with library code into an executable",
              "Run the executable"
            ],
            hints: ["#include lines are dealt with before anything else.", "Linking comes after compiling; running comes last."],
            short: "Source, preprocessor, compiler, linker, then run.",
            explain: "Source → preprocessor (#include) → compiler (machine code) → linker (joins library code, makes the executable) → run. Tools like g++ do the first three for you in one command."
          },
          {
            id: "w1.l5.c2",
            type: "mcq",
            tags: ["w1.compile"],
            prompt: "You fixed a typo in the text of main.cpp, then ran ./hero again, but the OLD text still appears. Why?",
            options: [
              { t: "The computer caches text for a day", why: "No such cache. The executable itself holds the old code." },
              { t: "You didn't recompile, so ./hero is still the old build", why: "Correct! Rebuild after every change." },
              { t: "std::cout remembers old output", why: "cout doesn't remember anything between runs." },
              { t: "Typos can't be fixed after the first compile", why: "Of course they can: edit, rebuild, run." }
            ],
            answer: 1,
            hints: ["Where does ./hero come from?", "Did anything turn the new source into a new executable?"],
            short: "No rebuild, so you ran the old executable.",
            explain: "Running a program doesn't read your .cpp file at all. It runs the machine code from the last successful build. Edit → compile → run, every time."
          },
          {
            id: "w1.l5.c3",
            type: "mcq",
            tags: ["w1.compile"],
            prompt: "Intentionally broken code: line 5 is missing its semicolon. What happens when you try to build and run it?",
            code: R`#include <iostream>

int main() {
    std::cout << "Step 1\n";
    std::cout << "Step 2\n"
    std::cout << "Step 3\n";
    return 0;
}`,
            unsafe: true,
            options: [
              { t: "It prints Step 1, then stops at the broken line", why: "C++ doesn't run half a program. The build fails first." },
              { t: "It prints all three steps: the compiler adds the ; itself", why: "Compilers never guess missing semicolons. They report an error." },
              { t: "The build fails with an error, so there's no program to run", why: "Correct! No executable is produced." },
              { t: "It prints Step 1 and Step 2, then crashes", why: "It never runs. This is a compile-time error, not a run-time one." }
            ],
            answer: 2,
            hints: ["Is a missing ; noticed while building or while running?", "If the build fails, is there an executable at all?"],
            short: "A compile error means no program is built, so nothing runs.",
            explain: "Syntax errors are caught at compile time. The build fails and no new executable is produced (if an old one exists, it's stale!). Nothing gets partially run."
          },
          {
            id: "w1.l5.c4",
            type: "fill",
            tags: ["w1.compile"],
            prompt: "Fill in the flag that names the output file \"hero\".",
            code: R`g++ -std=c++20 -Wall -Wextra main.cpp ___ hero`,
            accept: ["-o"],
            placeholder: "flag",
            hints: ["A dash and one letter.", "The letter stands for \"output\"."],
            short: "-o names the output file.",
            explain: "-o hero tells g++ to write the executable as \"hero\" (hero.exe on Windows). Without it, g++ picks a default name like a.out."
          },
          {
            id: "w1.l5.c5",
            type: "mcq",
            tags: ["w1.compile", "w1.warnings"],
            prompt: "Which problem can the compiler catch for you BEFORE the program ever runs?",
            options: [
              { t: "The report prints \"Helo\" instead of \"Hello\"", why: "A typo inside a string is valid C++. The compiler can't know your intent." },
              { t: "A missing ; after a statement", why: "Correct! Broken syntax is caught at compile time." },
              { t: "The user wanted the report in French", why: "That's a requirements question, not something a compiler checks." },
              { t: "The program's logic gives a wrong total", why: "Wrong logic in valid code compiles fine. Testing catches it." }
            ],
            answer: 1,
            hints: ["The compiler checks language rules, not your intentions.", "Which option breaks a grammar rule of C++?"],
            short: "Compilers catch broken rules, like a missing ;, not wrong intentions.",
            explain: "Compilers enforce the language's rules: syntax, names, types. Valid code that does the wrong thing (like a typo in a message) compiles happily, which is why testing matters too."
          }
        ],
        recap: [
          "Build: preprocess, compile, link, get an executable.",
          "Compile error means no program at all.",
          "Always rebuild after editing.",
          "Compilers check rules, not intentions."
        ],
        vault: [
          {
            id: "w1.compile",
            title: "Build & run",
            code: R`g++ -std=c++20 -Wall -Wextra main.cpp -o hero
./hero`,
            note: "Preprocessor (#include) → compiler (machine code) → linker (executable). Edit? Rebuild!",
            defense: false
          }
        ],
        reviewTags: ["w1.cout", "w1.comments"]
      },

      /* ------------------------------------------------------------------ L6 SHIELD */
      {
        id: "w1.l6",
        title: "Shield: warnings are your friend",
        skill: "defense",
        shield: true,
        concept: {
          short: "Turn warnings on, read the first error first, and fix every warning. They're free bug reports.",
          analogy: "An error is a locked door; a warning is a smoke alarm you should never unplug.",
          body: [
            "Build with warnings on: `g++ -std=c++20 -Wall -Wextra -pedantic main.cpp -o hero` (MSVC: `/W4`). `-Werror` turns warnings into errors.",
            "Messages read `file:line:column: error: message`, counting lines from 1. Fix the **first** error first: one missing `;` can cause a cascade.",
            "The reported spot is where the compiler **noticed** the problem, sometimes just after it. For a missing `;`, check the previous line.",
            "Some warnings flag **undefined behavior** (UB), like dividing by zero. UB doesn't guarantee a crash: it may seem fine today and fail tomorrow."
          ],
          pitfall: "Ignoring warnings because \"it still runs\". The warnings you ignore are the ones that bite later."
        },
        demo: {
          code: R`#include <iostream>

int main() {
    std::cout << "Shields: ";
    std::cout << 'ON\n';
    return 0;
}`,
          steps: [
            { line: 4, note: "Warning at line 5: multi-character character constant [-Wmultichar]." },
            { line: 2, note: "Only a warning, so it builds and runs." },
            { line: 3, out: "Shields: ", note: "This line is fine." },
            { line: 4, crash: "Prints 5197322 (on GCC) instead of ON!", note: "Single quotes hold ONE character. This became a number." },
            { line: 4, shield: "Warning heeded: \"ON\\n\" prints ON", note: "Double quotes for text, single quotes for one character." },
            { line: 5, note: "Rule: warnings on, and treat each one as a bug." }
          ]
        },
        challenges: [
          {
            id: "w1.l6.c1",
            type: "mcq",
            tags: ["w1.warnings", "w1.compile"],
            prompt: "The build fails with: hero.cpp:12:5: error: 'cot' is not a member of 'std'. Where should you look first?",
            options: [
              { t: "Line 5, column 12", why: "The format is file:line:column: line 12 first, then column 5." },
              { t: "Line 12 of hero.cpp, around column 5, for a misspelled std:: name", why: "Correct! And cot doesn't exist in std: you meant cout." },
              { t: "The last line of the file", why: "The message gives the exact line. No need to guess." },
              { t: "Nowhere: reinstall the compiler", why: "The compiler is fine! It's pointing straight at a typo." }
            ],
            answer: 1,
            hints: ["The numbers come in the order line, then column.", "The message quotes the name it couldn't find."],
            short: "file:line:column: line 12, column 5, a typo for cout.",
            explain: "Error format: file:line:column: error: message. Here: hero.cpp, line 12, column 5, and the name cot isn't in std. It's a typo for cout. Compilers often even suggest \"did you mean 'cout'?\"."
          },
          {
            id: "w1.l6.c2",
            type: "review",
            tags: ["w1.warnings", "w1.cout"],
            prompt: "Code review! This compiles, but with warnings. Tap every dangerous line, then submit.",
            code: R`#include <iostream>

int main() {
    std::cout << "Status: ";
    std::cout << 'OK\n';
    std::cout << "Power: " << 100 / 0 << '\n';
    std::cout << "Done\n";
    return 0;
}`,
            unsafe: true,
            dangerous: [4, 5],
            lineNotes: {
              3: "Fine: text in double quotes.",
              4: "Warning: 'OK\\n' in single quotes prints a number, not OK.",
              5: "Warning: division by zero is undefined behavior. Crash, garbage, or seems fine.",
              6: "Fine."
            },
            hints: ["Look for single quotes around more than one character.", "Also look for math no computer can do."],
            short: "Single-quoted text and division by zero: both warnings, both real bugs.",
            explain: "Both warnings are real bugs. 'OK\\n' should be \"OK\\n\", and 100 / 0 is undefined behavior: the compiler warns, the program may even run, but its behavior is unpredictable. Don't ship code with warnings.",
            sideBySide: {
              unsafe: R`std::cout << 'OK\n';                       // multi-char constant
std::cout << "Power: " << 100 / 0 << '\n';  // UB: divide by zero`,
              hardened: R`std::cout << "OK\n";
std::cout << "Power: " << 100 << '\n';`
            }
          },
          {
            id: "w1.l6.c3",
            type: "harden",
            tags: ["w1.warnings", "w1.cout"],
            prompt: "The compiler warned about this line. Pick what fills the blank so it builds cleanly and prints the right text.",
            code: R`#include <iostream>

int main() {
    std::cout << ___;
    return 0;
}`,
            options: [
              { t: R`'Shields up!\n'`, why: "Single quotes around many characters: a warning, and a number prints." },
              { t: R`Shields up!\n`, why: "No quotes: the compiler reads Shields as a name. Error." },
              { t: R`"Shields up!\n"`, why: "Correct! Double quotes make a string: clean build, right output." },
              { t: R`"Shields up!\n`, why: "Missing the closing quote: error: missing terminating \" character." }
            ],
            answer: 2,
            hints: ["Text is a string, and strings use one kind of quote.", "Make sure the quotes are balanced, too."],
            short: "Text goes in double quotes; single quotes are for one character.",
            explain: "Strings go in double quotes, single characters in single quotes. The single-quote version compiles with only a warning, which is exactly why you must read warnings: it silently prints garbage.",
            sideBySide: {
              unsafe: R`std::cout << 'Shields up!\n';   // warning, prints a number`,
              hardened: R`std::cout << "Shields up!\n";   // clean`
            }
          },
          {
            id: "w1.l6.c4",
            type: "safe",
            tags: ["w1.warnings", "w1.compile"],
            prompt: "Speed round! Each line sits inside main() with <iostream>, built with -Wall -Wextra. Safe = clean build.",
            seconds: 30,
            items: [
              { code: R`std::cout << "Hi\n";`, safe: true, why: "Double-quoted string, semicolon present. Clean." },
              { code: R`std::cout << 'Hi\n';`, safe: false, why: "Multi-character constant: warning, prints a number." },
              { code: R`std::cout << "Hi\n"`, safe: false, why: "Missing semicolon: compile error." },
              { code: R`std::cout << 7 / 0;`, safe: false, why: "Division by zero: warning, and undefined behavior." },
              { code: R`// std::cout << 'oops';`, safe: true, why: "A comment. The compiler ignores it." },
              { code: R`std::cout << "50% done\q";`, safe: false, why: "\\q isn't a real escape: \"unknown escape sequence\" warning." },
              { code: R`std::cout << "a" << "b" << '\n';`, safe: true, why: "Clean chaining; '\\n' is one character." },
              { code: R`std:cout << "Hi\n";`, safe: false, why: "One colon: std: becomes a label, and cout is undeclared." }
            ],
            hints: ["Check the quotes, the semicolon and the colons.", "Watch for dividing by zero and unfamiliar backslash sequences."],
            short: "Clean means no errors AND no warnings.",
            explain: "A clean build means no errors AND no warnings. Missing ;, single-colon std:, multi-character single quotes, unknown escapes and division by zero all set off the alarm."
          },
          {
            id: "w1.l6.c5",
            type: "bug",
            tags: ["w1.warnings", "w1.compile"],
            prompt: "Intentionally broken: \"error: expected ';' before 'std'\", pointing at the \"line A\" line. Tap the mistake, then pick the fix.",
            code: R`#include <iostream>

int main() {
    std::cout << "Error log:\n";
    std::cout << "line A\n"
    std::cout << "line B\n";
    std::cout << "line C\n";
    return 0;
}`,
            unsafe: true,
            bugLine: 4,
            options: [
              { t: "Delete std:: from the \"line B\" statement", why: "Then cout is unknown, and the ; is still missing." },
              { t: "Add ; at the end of the \"line A\" statement", why: "Correct! The statement before the next std was unfinished." },
              { t: "Change \"line A\\n\" to 'line A\\n'", why: "That adds a warning and still no semicolon." },
              { t: "Add #include <string> at the top", why: "No include is missing. The message is about a ;." }
            ],
            answer: 1,
            bug: "missing-semicolon",
            hints: ["The std in the message starts the \"line B\" statement.", "So which statement never got its full stop?"],
            short: "\"Expected ; before std\": the statement before std needs its ;.",
            explain: "Read the message literally: the compiler expected a ; but found std (the start of the next statement). The fix goes at the end of the statement before it. Fix the first error and rebuild; follow-up errors often vanish.",
            sideBySide: {
              unsafe: R`std::cout << "line A\n"
std::cout << "line B\n";`,
              hardened: R`std::cout << "line A\n";
std::cout << "line B\n";`
            }
          },
          {
            id: "w1.l6.c6",
            type: "breakit",
            tags: ["w1.compile", "w1.warnings"],
            prompt: "Think like the Gremlin: which single edit would BREAK this working program?",
            code: R`#include <iostream>

int main() {
    std::cout << "Stable\n";
    return 0;
}`,
            options: [
              { t: "Delete the whole return 0; line", why: "Still compiles: main() returns 0 automatically." },
              { t: "Add // all good at the end of the cout line", why: "Trailing comments are ignored. Still compiles." },
              { t: "Add a blank line between the two statements", why: "Blank lines don't matter to the compiler." },
              { t: "Delete the ; after \"Stable\\n\"", why: "Correct! The statement runs into return 0 and the build fails." }
            ],
            answer: 3,
            hints: ["Whitespace and comments are ignored by the compiler.", "main() has a special rule about return 0;."],
            short: "Only deleting the ; breaks it. Whitespace and comments don't matter.",
            explain: "Only removing the semicolon breaks the build. Knowing what the compiler does and doesn't care about helps you spot real problems fast.",
            sideBySide: {
              unsafe: R`std::cout << "Stable\n"    // ; deleted: error
    return 0;`,
              hardened: R`std::cout << "Stable\n";
    return 0;`
            }
          }
        ],
        recap: [
          "Build with -Wall -Wextra; -Werror blocks warnings.",
          "Errors read file:line:column. Fix the first first.",
          "Missing ;? Check the previous line.",
          "UB may not crash. Heed the warning."
        ],
        vault: [
          {
            id: "w1.warnings",
            title: "Warnings on, always",
            code: R`g++ -std=c++20 -Wall -Wextra -pedantic main.cpp -o hero
# strict mode: every warning becomes an error
g++ -std=c++20 -Wall -Wextra -Werror main.cpp -o hero`,
            note: "A warning is a free bug report. Never silence it with -w; fix the code.",
            defense: true
          },
          {
            id: "w1.errors",
            title: "Reading error messages",
            code: R`main.cpp:5:28: error: expected ';' before 'std'
// file : line : column : kind : message`,
            note: "Fix the FIRST error first. For \"expected ;\", check the line before. UB may not crash: \"it seemed to work\" proves nothing.",
            defense: true
          }
        ],
        reviewTags: ["w1.compile", "w1.cout"]
      }
    ],

    /* -------------------------------------------------------------------- PROJECT */
    project: {
      id: "w1.p",
      title: "Mission Log",
      intro: "Every hero needs a status report! Let's build a Mission Log, brace by brace.",
      steps: [
        {
          id: "w1.p.s1",
          type: "order",
          tags: ["w1.main", "w1.include"],
          prompt: "Start with the skeleton: put the lines in order.",
          lines: [
            "#include <iostream>",
            "int main() {",
            "    return 0;",
            "}"
          ],
          distractors: ["#include <iostream>;", "int Main() {"],
          hints: ["Includes go first, then main().", "Watch out: directives have no semicolon, and main is lowercase."],
          short: "Include, then main() with return 0; inside its braces.",
          explain: "Include first, then main() with return 0; inside its braces. The decoys were a directive with a stray ; and a capitalized Main."
        },
        {
          id: "w1.p.s2",
          type: "fill",
          tags: ["w1.cout"],
          prompt: "Print the header, and end the line so the next part starts on a new line.",
          code: R`#include <iostream>

// Mission Log: daily status report for the Codebase
int main() {
    std::cout << "=== MISSION LOG ===___";
    return 0;
}`,
          accept: [R`\n`],
          placeholder: "escape",
          hints: ["You need the escape sequence for a new line.", "A backslash followed by the letter n."],
          short: "\\n ends the header line.",
          explain: "\\n inside the string ends the line. Without it, the next output would be glued to the header."
        },
        {
          id: "w1.p.s3",
          type: "write",
          tags: ["w1.cout"],
          prompt: "Write the statement that prints Hero:, then a tab, then Curlo, then ends the line. (Use \\t and \\n.)",
          accept: [
            R`std::cout << "Hero:\tCurlo\n";`,
            R`std::cout << "Hero:\t" << "Curlo\n";`,
            R`std::cout << "Hero:\tCurlo" << '\n';`,
            R`std::cout << "Hero:" << '\t' << "Curlo" << '\n';`
          ],
          placeholder: "std::cout << ...",
          hints: ["One std::cout; the tab and newline can live inside the string.", "\"Hero:\\tCurlo\\n\", and don't forget the ;"],
          short: "std::cout << \"Hero:\\tCurlo\\n\"; prints it.",
          explain: "std::cout << \"Hero:\\tCurlo\\n\"; prints Hero:, a tab, Curlo and a newline. \\t lines things up nicely in reports."
        },
        {
          id: "w1.p.s4",
          type: "fill",
          tags: ["w1.cout"],
          prompt: "Chain the day number onto the output.",
          code: R`#include <iostream>

// Mission Log: daily status report for the Codebase
int main() {
    std::cout << "=== MISSION LOG ===\n";
    std::cout << "Hero:\tCurlo\n";
    std::cout << "Day:\t" ___ 1 << '\n';
    return 0;
}`,
          accept: ["<<"],
          placeholder: "operator",
          hints: ["Every item on the output belt needs one of these in front.", "Two less-than signs."],
          short: "Each item gets its own <<.",
          explain: "Each item is inserted with its own <<: the text, then the number 1, then '\\n'."
        },
        {
          id: "w1.p.s5",
          type: "mcq",
          tags: ["w1.cout"],
          prompt: "The status line must print: Status: \"All braces balanced\" (with the double quotes). Which statement does it?",
          options: [
            { t: R`std::cout << "Status: "All braces balanced"\n";`, why: "The second \" ends the string early: compile error." },
            { t: R`std::cout << 'Status: "All braces balanced"\n';`, why: "Single quotes are for one character: a warning, and a number prints." },
            { t: R`std::cout << "Status: \"All braces balanced\"\n";`, why: "Correct! \\\" puts a real double quote inside the string." },
            { t: R`std::cout << "Status: ''All braces balanced''\n";`, why: "Compiles, but prints pairs of single quotes, not double quotes." }
          ],
          answer: 2,
          hints: ["A plain \" inside a string would end it.", "Escape it with a backslash."],
          short: "\\\" prints a double quote inside a string.",
          explain: "\\\" is the escape sequence for a double quote inside a string literal. The string stays open and the quote is printed."
        },
        {
          id: "w1.p.s6",
          type: "predict",
          tags: ["w1.cout", "w1.comments"],
          prompt: "Here's the finished Mission Log. What exactly does it print?",
          code: R`#include <iostream>

// Mission Log: daily status report for the Codebase
int main() {
    std::cout << "=== MISSION LOG ===\n";
    std::cout << "Hero:\tCurlo\n";
    std::cout << "Day:\t" << 1 << '\n';
    std::cout << "Status: \"All braces balanced\"\n";
    std::cout << "===================\n";
    return 0;
}`,
          options: [
            { t: "=== MISSION LOG ===\nHero:\\tCurlo\nDay:\\t1\nStatus: \"All braces balanced\"\n===================\n", why: "\\t prints a tab, not a backslash and a t." },
            { t: "=== MISSION LOG ===\nHero:\tCurlo\nDay:\t1\nStatus: \\\"All braces balanced\\\"\n===================\n", why: "\\\" prints just the quote; the backslash isn't shown." },
            { t: "=== MISSION LOG ===\nHero:\tCurlo\nDay:\t1\nStatus: \"All braces balanced\"\n===================\n", why: "Correct! Tabs, real quotes, and every line ends with a newline." },
            { t: "=== MISSION LOG ===Hero:\tCurlo\nDay:\t1\nStatus: \"All braces balanced\"\n===================\n", why: "The header ends with \\n, so Hero: starts a new line." }
          ],
          answer: 2,
          hints: ["Escapes become single characters: \\t is a tab, \\\" a quote.", "The comment line prints nothing."],
          short: "Escapes become real tabs and quotes; the comment prints nothing.",
          explain: "The comment is ignored; each cout prints one line. \\t becomes a tab, \\\" becomes \", and every line ends with a newline (from \\n or '\\n')."
        }
      ],
      program: R`#include <iostream>

// Mission Log: daily status report for the Codebase
int main() {
    std::cout << "=== MISSION LOG ===\n";
    std::cout << "Hero:\tCurlo\n";
    std::cout << "Day:\t" << 1 << '\n';
    std::cout << "Status: \"All braces balanced\"\n";
    std::cout << "===================\n";
    return 0;
}`,
      stress: {
        intro: "Uh-oh! The Syntax Gremlin sabotaged our Mission Log. Read each clue and fix it!",
        attacks: [
          {
            input: R`std::cout << "Hero:\tCurlo\n"`,
            label: "Semicolon stolen!",
            challenge: {
              id: "w1.p.a1",
              type: "bug",
              tags: ["w1.compile", "w1.warnings"],
              prompt: "Intentionally broken: the build fails with \"expected ';' before 'std'\". Tap the sabotaged line, then pick the fix.",
              code: R`#include <iostream>

// Mission Log: daily status report for the Codebase
int main() {
    std::cout << "=== MISSION LOG ===\n";
    std::cout << "Hero:\tCurlo\n"
    std::cout << "Day:\t" << 1 << '\n';
    return 0;
}`,
              unsafe: true,
              bugLine: 5,
              options: [
                { t: "Add ; after \"Hero:\\tCurlo\\n\"", why: "Correct! The statement gets its full stop back." },
                { t: "Remove \\t from the Hero line", why: "The tab is fine. The missing ; is the problem." },
                { t: "Add ; at the end of the Day line", why: "The Day line already ends with ;." },
                { t: "Put the Hero line in a comment", why: "That hides the symptom and deletes part of your report." }
              ],
              answer: 0,
              bug: "missing-semicolon",
              hints: ["\"before 'std'\": the compiler hit the start of the next statement.", "Check the end of the Hero line."],
              short: "The Hero line lost its ;. Check the line before the error.",
              explain: "The Hero statement lost its ;. The compiler only notices at the next std, which is why the message says \"before 'std'\". Always check the end of the previous line.",
              sideBySide: {
                unsafe: R`std::cout << "Hero:\tCurlo\n"
std::cout << "Day:\t" << 1 << '\n';`,
                hardened: R`std::cout << "Hero:\tCurlo\n";
std::cout << "Day:\t" << 1 << '\n';`
              }
            }
          },
          {
            input: "#include removed",
            label: "Toolbox stolen!",
            challenge: {
              id: "w1.p.a2",
              type: "harden",
              tags: ["w1.include", "w1.compile"],
              prompt: "The Gremlin deleted the first line! The build fails with \"'cout' is not a member of 'std'\". Pick the line that restores it properly.",
              code: R`___

// Mission Log: daily status report for the Codebase
int main() {
    std::cout << "=== MISSION LOG ===\n";
    return 0;
}`,
              options: [
                { t: "using namespace std;", why: "That doesn't declare cout. You still need the header." },
                { t: "#include <iostream>;", why: "Directives take no semicolon; compilers warn about \"extra tokens\"." },
                { t: "#include <string>", why: "Wrong toolbox: <string> isn't guaranteed to bring in std::cout." },
                { t: "#include <iostream>", why: "Correct! The input/output header, no semicolon." }
              ],
              answer: 3,
              hints: ["std::cout comes from the input/output stream header.", "Preprocessor directives never end with ;."],
              short: "#include <iostream> declares std::cout. No semicolon.",
              explain: "#include <iostream> declares std::cout. Include exactly what you use, spelled exactly right, with no semicolon.",
              sideBySide: {
                unsafe: R`// (no #include)
int main() {
    std::cout << "=== MISSION LOG ===\n";  // error
}`,
                hardened: R`#include <iostream>

int main() {
    std::cout << "=== MISSION LOG ===\n";
}`
              }
            }
          },
          {
            input: "std::cuot",
            label: "Typo gremlin!",
            challenge: {
              id: "w1.p.a3",
              type: "bug",
              tags: ["w1.cout", "w1.compile"],
              prompt: "Intentionally broken: \"error: 'cuot' is not a member of 'std'; did you mean 'cout'?\". Tap the sabotaged line, then pick the fix.",
              code: R`#include <iostream>

// Mission Log: daily status report for the Codebase
int main() {
    std::cout << "=== MISSION LOG ===\n";
    std::cuot << "Day:\t" << 1 << '\n';
    return 0;
}`,
              unsafe: true,
              bugLine: 5,
              options: [
                { t: "Add using namespace std; at the top", why: "cuot doesn't exist in std either. Still fails." },
                { t: "Change std::cuot to std::cout", why: "Correct! The compiler even suggested it." },
                { t: "Change std::cuot to std:cuot", why: "One colon makes it worse: std: becomes a label." },
                { t: "#include <cuot>", why: "There's no such header. The name is just misspelled." }
              ],
              answer: 1,
              bug: "typo-gremlin",
              hints: ["The message names what it couldn't find.", "It even suggests the right spelling."],
              short: "Typo: cuot should be cout. The compiler suggested it!",
              explain: "Compilers often suggest a fix for misspelled names. Read the whole message: the answer is frequently right there.",
              sideBySide: {
                unsafe: R`std::cuot << "Day:\t" << 1 << '\n';`,
                hardened: R`std::cout << "Day:\t" << 1 << '\n';`
              }
            }
          }
        ]
      }
    },

    /* -------------------------------------------------------------------- BOSS */
    boss: {
      id: "w1.boss",
      name: "The Syntax Gremlin",
      art: "gremlin",
      hp: 6,
      intro: "Hee hee HEE! I eat semicolons! Your programs will NEVER compile again!",
      taunt: [
        "Missing something? Like... a semicolon? Hee hee!",
        "I misspelled cout while you blinked!",
        "Warnings? Just ignore them. Everyone does! (Don't.)",
        "Your braces look lonely. Want me to steal one?"
      ],
      rounds: [
        {
          id: "w1.boss.r1",
          type: "mcq",
          tags: ["w1.main"],
          prompt: "The Gremlin cackles: \"What ends almost every C++ statement? Bet you forgot!\"",
          options: [
            { t: "A period .", why: "Periods are for member access, not ending statements." },
            { t: "A semicolon ;", why: "Correct! The Gremlin can't steal what you remember." },
            { t: "A new line", why: "C++ ignores line breaks between statements." },
            { t: "A closing brace }", why: "} closes a block like main's body, not a statement." }
          ],
          answer: 1,
          hints: ["It's the Gremlin's favorite snack.", "Looks like a comma wearing a hat."],
          short: "Statements end with ;. Line breaks mean nothing to the compiler.",
          explain: "Statements end with ;. Line breaks mean nothing to the compiler, which is why a missing ; often shows up as an error on the NEXT line."
        },
        {
          id: "w1.boss.r2",
          type: "predict",
          tags: ["w1.cout", "w1.comments"],
          prompt: "The Gremlin growls in pieces. What exactly does this print?",
          code: R`#include <iostream>

int main() {
    std::cout << "Gr";
    std::cout << "r" << "r!\n";
    // std::cout << "Grrr!\n";
    return 0;
}`,
          options: [
            { t: "Grrr!\nGrrr!\n", why: "The last cout is commented out, so it never runs." },
            { t: "Gr\nrr!\n", why: "Nothing prints a newline after \"Gr\"." },
            { t: "Gr r r!\n", why: "cout adds no spaces between items." },
            { t: "Grrr!\n", why: "Correct! \"Gr\" + \"r\" + \"r!\\n\" makes one growl." }
          ],
          answer: 3,
          hints: ["Glue all the pieces together in order.", "Comments don't run."],
          short: "The pieces join into one Grrr!; the comment never runs.",
          explain: "\"Gr\", then \"r\", then \"r!\\n\": Grrr! and a newline. The commented-out line is invisible to the compiler."
        },
        {
          id: "w1.boss.r3",
          type: "bug",
          tags: ["w1.cout", "w1.compile"],
          prompt: "Intentionally broken: the Gremlin swapped one character. The build fails with \"'cout' was not declared in this scope\". Tap the line, then pick the fix.",
          code: R`#include <iostream>

int main() {
    std:cout << "Gremlin was here\n";
    return 0;
}`,
          unsafe: true,
          bugLine: 3,
          options: [
            { t: R`std.cout << "Gremlin was here\n";`, why: "The dot is for object members. Namespaces use ::." },
            { t: R`cout << "Gremlin was here\n";`, why: "Plain cout isn't declared. It lives inside std." },
            { t: R`std::cout << "Gremlin was here\n";`, why: "Correct! Two colons reach into the std namespace." },
            { t: R`std;cout << "Gremlin was here\n";`, why: "std alone isn't a statement. Still an error." }
          ],
          answer: 2,
          bug: "typo-gremlin",
          hints: ["Count the colons.", "The scope resolution operator has two of them."],
          short: "One colon makes std: a label. You need std::cout.",
          explain: "With one colon, std: is read as a label (a jump target), so what's left is plain cout, which isn't declared. The fix is std::cout. Sneaky, and exactly why reading the message matters.",
          sideBySide: {
            unsafe: R`std:cout << "Gremlin was here\n";   // one colon`,
            hardened: R`std::cout << "Gremlin was here\n";`
          }
        },
        {
          id: "w1.boss.r4",
          type: "speed",
          tags: ["w1.cout", "w1.include", "w1.comments", "w1.compile", "w1.warnings"],
          prompt: "Rapid fire! Answer as many as you can before time runs out!",
          seconds: 45,
          items: [
            { q: "Which header provides std::cout?", options: ["<string>", "<iostream>", "<cout>", "<stdout>"], answer: 1 },
            { q: "A single-line comment starts with…", options: ["#", "--", "//", "/*"], answer: 2 },
            { q: "What does \\n print?", options: ["A new line", "The letter n", "Nothing", "A tab"], answer: 0 },
            { q: "Which build stage handles #include?", options: ["The linker", "The CPU", "The debugger", "The preprocessor"], answer: 3 },
            { q: "What does this print?", code: R`std::cout << "a" << "b";`, options: ["a b", "ab", "a\\nb", "ba"], answer: 1 },
            { q: "A compiler warning should be…", options: ["Read and fixed", "Ignored if it runs", "Silenced with -w", "Deleted from the log"], answer: 0 },
            { q: "Where does execution start?", options: ["The first #include", "main()", "The last line", "A random function"], answer: 1 },
            { q: "Which flag turns warnings into errors?", options: ["-w", "-o", "-Werror", "-O2"], answer: 2 }
          ],
          hints: ["Go with your first instinct; you know this!", "Quick, confident answers win speed rounds."],
          short: "World 1 in a nutshell: headers, comments, builds and warnings.",
          explain: "Quick recap: <iostream> for cout, // for comments, \\n for new lines, the preprocessor handles #include, cout adds no spaces, warnings get fixed, main() starts it all, and -Werror makes warnings fatal."
        },
        {
          id: "w1.boss.r5",
          type: "fill",
          tags: ["w1.comments"],
          prompt: "The Gremlin opened a block comment and ran off. Close it so the rest of the program isn't swallowed!",
          code: R`#include <iostream>

int main() {
    /* Gremlin trap: disarmed ___
    std::cout << "Trap safe\n";
    return 0;
}`,
          accept: ["*/"],
          placeholder: "comment end",
          hints: ["Block comments close with the mirror image of /*.", "Star first, then slash."],
          short: "*/ closes a block comment.",
          explain: "*/ closes a block comment. Leave it out and the comment swallows everything after it, and the build fails with \"unterminated comment\"."
        },
        {
          id: "w1.boss.r6",
          type: "review",
          tags: ["w1.warnings", "w1.compile"],
          prompt: "Code review: the Gremlin sabotaged this report (intentionally broken). Tap every line that causes an error or warning.",
          code: R`#include <iostream>

int main() {
    std::cout << "Gremlin report\n";
    std::cout << "Bugs: " << 3 << '\n'
    std::cout << 'Run!\n';
    std::cout << "Over.\n";
    return 0;
}`,
          unsafe: true,
          dangerous: [4, 5],
          lineNotes: {
            3: "Fine.",
            4: "Missing ; at the end: compile error, \"expected ';' before 'std'\".",
            5: "Text in single quotes: \"character constant too long\" warning, prints a number.",
            6: "Fine."
          },
          hints: ["Check the end of every statement.", "Check which kind of quotes wrap the text."],
          short: "Line 5 lacks its ;, line 6 uses single quotes.",
          explain: "Line 5 lacks its ; (an error), and line 6 wraps text in single quotes (a warning that means garbage output). A good reviewer catches both, not just the one that stops the build.",
          sideBySide: {
            unsafe: R`std::cout << "Bugs: " << 3 << '\n'
std::cout << 'Run!\n';`,
            hardened: R`std::cout << "Bugs: " << 3 << '\n';
std::cout << "Run!\n";`
          }
        },
        {
          id: "w1.boss.r7",
          type: "order",
          tags: ["w1.main", "w1.cout"],
          prompt: "Rebuild the program the Gremlin scattered. It should print \"Gremlin defeated?\" and then \"Not yet!\".",
          lines: [
            "#include <iostream>",
            "int main() {",
            R`    std::cout << "Gremlin defeated?\n";`,
            R`    std::cout << "Not yet!\n";`,
            "    return 0;",
            "}"
          ],
          distractors: [R`    std::cout << "Not yet!\n"`, "int Main() {"],
          hints: ["Statements run top to bottom, so cout order matters.", "Two decoys: one lacks a ;, one has a capital letter."],
          short: "Include, main, both prints in order, return 0;, }.",
          explain: "Include, main, the two prints in the order you want them to appear, return 0;, closing brace. The decoys: a statement missing its ; and a capitalized Main."
        },
        {
          id: "w1.boss.r8",
          type: "edge",
          tags: ["w1.warnings", "w1.compile"],
          prompt: "This program is supposed to print Go!. Which checks would EXPOSE the problem? Select all that apply.",
          code: R`#include <iostream>

int main() {
    std::cout << 'Go!\n';
    return 0;
}`,
          unsafe: true,
          options: [
            { t: "Build with g++ -Wall -Wextra and read the warnings", why: "Exposes it: \"multi-character character constant\" warning." },
            { t: "Build with g++ -w", why: "-w silences ALL warnings. The alarm is unplugged." },
            { t: "Build with g++ -Wall -Werror", why: "Exposes it: the warning becomes an error and the build stops." },
            { t: "Read the code quickly: it says Go!, so it's fine", why: "The single quotes are easy to miss at a glance." },
            { t: "Run it and compare the output with Go!", why: "Exposes it: it prints a number, not Go!." }
          ],
          answers: [0, 2, 4],
          hints: ["Which options keep the compiler's alarm switched on?", "Actually testing the output counts too."],
          short: "Warnings and real testing expose it; silencing and glancing don't.",
          explain: "Warnings (-Wall, or -Werror to make them fatal) and real testing both expose the bug. Silencing warnings or trusting a quick glance don't. Fix: std::cout << \"Go!\\n\";.",
          sideBySide: {
            unsafe: R`std::cout << 'Go!\n';   // multi-char constant: prints a number`,
            hardened: R`std::cout << "Go!\n";   // string literal: prints Go!`
          }
        }
      ],
      defense: [
        {
          attack: R`std::cout << "Codebase safe\n"`,
          label: "Semicolon snatched!",
          challenge: {
            id: "w1.boss.d1",
            type: "harden",
            tags: ["w1.main", "w1.compile"],
            prompt: "The Gremlin snatches a semicolon mid-battle! Pick what fills the blank so the program builds.",
            code: R`#include <iostream>

int main() {
    std::cout << "Codebase safe\n"___
    return 0;
}`,
            options: [
              { t: ":", why: "A colon doesn't end a statement. Still fails." },
              { t: ",", why: "A comma tries to join this with return 0: error." },
              { t: "(nothing: the line break is enough)", why: "C++ ignores line breaks. It needs a real ;." },
              { t: ";", why: "Correct! Semicolon restored, statement complete." }
            ],
            answer: 3,
            hints: ["The Gremlin's favorite snack.", "Statements end with it."],
            short: "Only ; ends a statement.",
            explain: "Only ; ends a statement. Line breaks don't count, and look-alike punctuation doesn't either.",
            sideBySide: {
              unsafe: R`std::cout << "Codebase safe\n"
    return 0;`,
              hardened: R`std::cout << "Codebase safe\n";
    return 0;`
            }
          }
        },
        {
          attack: "#include <iostreem>",
          label: "Header scrambled!",
          challenge: {
            id: "w1.boss.d2",
            type: "breakit",
            tags: ["w1.include", "w1.compile"],
            prompt: "The Gremlin tries four sabotages on this program. Which one actually breaks the build? Block it!",
            code: R`#include <iostream>

int main() {
    std::cout << "Shield holds!\n";
    return 0;
}`,
            options: [
              { t: "Adding the comment // gremlins rule on line 2", why: "Comments are ignored. The build is fine." },
              { t: "Adding three blank lines inside main()", why: "Whitespace doesn't matter to the compiler." },
              { t: "Changing line 1 to #include <iostreem>", why: "Correct! \"fatal error: iostreem: No such file or directory\"." },
              { t: "Changing \"Shield holds!\\n\" to \"Shield holds!!\\n\"", why: "Different text, still perfectly valid code." }
            ],
            answer: 2,
            hints: ["Which change affects something the compiler actually needs?", "A misspelled header can't be found."],
            short: "A misspelled header is fatal; comments and whitespace are harmless.",
            explain: "A misspelled header name is fatal: the preprocessor can't find the file and the build stops right there. The other sabotages are harmless to the compiler.",
            sideBySide: {
              unsafe: R`#include <iostreem>   // fatal error: file not found`,
              hardened: R`#include <iostream>`
            }
          }
        },
        {
          attack: R`'Gremlin rules!\n'`,
          label: "Quotes swapped!",
          challenge: {
            id: "w1.boss.d3",
            type: "harden",
            tags: ["w1.warnings", "w1.cout"],
            prompt: "Final attack: the Gremlin swaps your quotes! Pick what fills the blank for a clean build and the right text.",
            code: R`#include <iostream>

int main() {
    std::cout << ___;
    return 0;
}`,
            options: [
              { t: R`"Gremlin drools!\n"`, why: "Correct! A proper string, clean build, and a well-deserved burn." },
              { t: R`'Gremlin drools!\n'`, why: "Single quotes around many characters: a warning, and a number prints." },
              { t: R`"Gremlin drools!\n'`, why: "Mismatched quotes: the string never closes. Error." },
              { t: R`Gremlin drools!\n`, why: "No quotes: the compiler reads these as names. Error." }
            ],
            answer: 0,
            hints: ["Text needs matching double quotes.", "Single quotes are for exactly one character."],
            short: "Matching double quotes. Single quotes compile with a warning, then print garbage.",
            explain: "Strings use matching double quotes. The single-quoted version is the sneakiest: it compiles with only a warning, then prints garbage. Warnings on, always!",
            sideBySide: {
              unsafe: R`std::cout << 'Gremlin drools!\n';   // warning + garbage number`,
              hardened: R`std::cout << "Gremlin drools!\n";`
            }
          }
        }
      ],
      victory: "Nooo! My semicolons! Fine, you can read errors. The Garbage Blob won't be so easy!",
      reward: { xp: 150, cosmetic: "gremlin-horns", bug: "missing-semicolon" }
    }
  });
})();
