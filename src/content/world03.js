/* Cpp Hero: World 3, "Operators & Input".
 * Arithmetic, precedence, compound assignment, ++/--, comparisons, logic (short-circuit),
 * std::cin / std::getline. Shield Lesson: validating std::cin, division by zero, signed overflow.
 * Pure data. C++ snippets are written with the C`...` tag (String.raw), so a C++ '\n' is typed
 * exactly as it appears in C++ and no JS escaping is needed inside code blocks.
 */
window.CH = window.CH || {};
CH.content = CH.content || {};
["worlds", "bestiary", "achievements", "cosmetics", "quests"].forEach(function (k) {
  if (!Array.isArray(CH.content[k])) CH.content[k] = [];
});

(function () {
  // Raw C++ block: keeps backslashes literally, trims one leading newline and trailing whitespace.
  function C(strings) {
    var args = Array.prototype.slice.call(arguments);
    return String.raw.apply(String, args).replace(/^\r?\n/, "").replace(/\s+$/, "");
  }

  var IGNORE_LINE = C`std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n')`;

  CH.content.worlds.push({
    id: "w3", num: 3, title: "Operators & Input", icon: "calc",
    blurb: "Make your program do math, compare things, make logical calls, and listen to the player, without letting bad input in.",
    story: {
      intro: "Brace yourself! Bugs are sneaking in through the input gate. Let's guard it!",
      bossIntro: "Uh-oh! The Input Golem, made of bad input. Only validated input can crack it!",
      victory: "The Golem crumbled into neat integers! The gate is safe. I'm bursting my braces!",
    },

    lessons: [
      /* =============================== Lesson 1 =============================== */
      {
        id: "w3.l1", title: "Math machines", skill: "logic", shield: false,
        concept: {
          short: "Integer division drops the fraction; % gives the remainder; * and / happen before + and -.",
          analogy: "Integer division is splitting 17 cookies among 5 friends: 3 each, and `%` counts the 2 leftovers.",
          body: [
            "C++ has the usual arithmetic operators: `+`, `-`, `*`, `/`, and `%` (remainder, also called modulo).",
            "When **both** sides of `/` are integers, the result is an integer: the fraction is chopped off (truncated toward zero). `17 / 5` is `3`, and `-7 / 2` is `-3`, not `-4`.",
            "`%` gives the remainder and only works on integers: `17 % 5` is `2`. Its sign follows the left side, so `-7 % 2` is `-1`. Handy trick: `n % 2 == 0` means n is even.",
            "Want a real fraction? Make one side a `double`: `17.0 / 5` or `static_cast<double>(a) / b` gives `3.4`.",
            "**Precedence**: `*`, `/`, `%` happen before `+` and `-`, just like school math. Operators of the same level go left to right. When in doubt, add parentheses: they're free and make intent obvious.",
          ],
          pitfall: "Common beginner mistake: `double avg = total / count;` with two ints gives 3, not 3.5. The division happens in int land first.",
        },
        demo: {
          code: C`
#include <iostream>

int main() {
    int gold = 17;
    int players = 5;
    std::cout << gold / players << '\n';
    std::cout << gold % players << '\n';
    std::cout << 2 + 3 * 4 << '\n';
    std::cout << 7.0 / 2 << '\n';
    return 0;
}`,
          steps: [
            { line: 2, note: "Execution starts in main()." },
            { line: 3, vars: { gold: "17" }, note: "17 gold coins in the chest." },
            { line: 4, vars: { gold: "17", players: "5" }, note: "5 heroes want a share." },
            { line: 5, out: "3\n", note: "int / int stays int: 3.4 is chopped to 3." },
            { line: 6, out: "2\n", note: "% gives the leftover: 17 - 15 = 2." },
            { line: 7, out: "14\n", note: "* before +: 2 + 12 = 14, not 20." },
            { line: 8, out: "3.5\n", note: "7.0 is a double, so this is real division: 3.5." },
            { line: 9, note: "return 0: success. Math machine powered down!" },
          ],
        },
        challenges: [
          {
            id: "w3.l1.c1", type: "predict", tags: ["w3.arith", "w3.modulo"],
            prompt: "What does this print? (Watch the space.)",
            code: C`
#include <iostream>

int main() {
    std::cout << 7 / 2 << ' ' << 7 % 2 << '\n';
    return 0;
}`,
            options: [
              { t: "3 1\n", why: "Correct: 7 / 2 with ints is 3 (fraction dropped) and the remainder is 1." },
              { t: "3.5 1\n", why: "Both operands are ints, so / does integer division. No .5 survives." },
              { t: "4 1\n", why: "Integer division truncates; it never rounds up." },
              { t: "3 0.5\n", why: "% gives the whole-number remainder (1), not a fraction." },
            ],
            answer: 0,
            hints: ["Both numbers are ints. What happens to the fraction?", "2 goes into 7 three times. What's left over?"],
            short: "7 / 2 is 3 with ints; the remainder 7 % 2 is 1.",
            explain: "7 / 2 is integer division: 3. 7 % 2 is the remainder: 7 - 3 * 2 = 1. Output: \"3 1\" and a newline.",
          },
          {
            id: "w3.l1.c2", type: "mcq", tags: ["w3.precedence", "w3.arith"],
            prompt: "What value does x hold?",
            code: C`int x = 10 - 4 / 2 * 3;`,
            options: [
              { t: "4", why: "Correct: 4 / 2 = 2, 2 * 3 = 6, then 10 - 6 = 4." },
              { t: "9", why: "That evaluates 10 - 4 first. Subtraction waits until / and * are done." },
              { t: "10", why: "That treats it as 4 / (2 * 3). Same-level operators go left to right, so / comes before *." },
              { t: "1", why: "That's (10 - 4) / (2 * 3). Without parentheses, C++ doesn't group it that way." },
            ],
            answer: 0,
            hints: ["Do / and * before -.", "/ and * are the same level: go left to right."],
            short: "/ and * first, left to right: 10 - 6 = 4.",
            explain: "Precedence: / and * before -. Same level: left to right. So 4 / 2 = 2, 2 * 3 = 6, 10 - 6 = 4.",
          },
          {
            id: "w3.l1.c3", type: "predict", tags: ["w3.arith", "w3.modulo"],
            prompt: "Negative numbers! What does this print?",
            code: C`
#include <iostream>

int main() {
    std::cout << -7 / 2 << ' ' << -7 % 2 << '\n';
    return 0;
}`,
            options: [
              { t: "-3 -1\n", why: "Correct: -3.5 truncates toward zero to -3; the remainder takes the left side's sign." },
              { t: "-4 1\n", why: "That's rounding down (floor), which Python does. Since C++11, integer division always truncates toward zero." },
              { t: "-3 1\n", why: "Quotient right, remainder wrong: (a / b) * b + a % b must equal a." },
              { t: "-3.5 -1\n", why: "Both operands are ints, so no fraction is kept." },
            ],
            answer: 0,
            hints: ["Integer division chops toward zero, even for negatives.", "Check with: (a / b) * b + a % b must equal a."],
            short: "Division truncates toward zero; % takes the left side's sign.",
            explain: "-7 / 2 is -3.5 truncated toward zero: -3. Then -7 % 2 = -7 - (-3 * 2) = -1. Output: \"-3 -1\" and a newline.",
          },
          {
            id: "w3.l1.c4", type: "fill", tags: ["w3.modulo"],
            prompt: "Fill in the operator so isEven is true for even numbers.",
            code: C`
int n = 14;
bool isEven = (n ___ 2) == 0;`,
            accept: ["%"],
            placeholder: "operator",
            hints: ["Even numbers leave nothing over when split into pairs.", "You want the remainder operator."],
            short: "n % 2 == 0 means n is even.",
            explain: "n % 2 is the remainder after dividing by 2: 0 for even numbers, 1 (or -1 for negatives) for odd ones.",
          },
          {
            id: "w3.l1.c5", type: "bug", tags: ["w3.arith", "w2.convert"],
            prompt: "This should print 3.5, but prints 3. Tap the buggy line, then pick the fix.",
            code: C`
#include <iostream>

int main() {
    int total = 7;
    int count = 2;
    double avg = total / count;
    std::cout << avg << '\n';
    return 0;
}`,
            bugLine: 5,
            options: [
              { t: "double avg = static_cast<double>(total) / count;", why: "Correct: total becomes a double before dividing, so the division is real division: 3.5." },
              { t: "double avg = static_cast<double>(total / count);", why: "Too late! total / count is already 3 (int division) before the cast." },
              { t: "double avg = total / count + 0.5;", why: "A hack: prints 3.5 here by luck, but gives 4.5 for 8 / 2. Wrong math." },
              { t: "float avg = total / count;", why: "Still int / int = 3. Changing the variable's type doesn't change how the division is done." },
            ],
            answer: 0,
            hints: ["The type of the variable on the left doesn't matter. What types are being divided?", "Convert one operand to double BEFORE the division happens."],
            short: "int / int divides first; cast one operand to double before dividing.",
            explain: "int / int is computed as an int (3), then converted to 3.0. Cast one operand first: static_cast<double>(total) / count gives 3.5.",
            sideBySide: {
              unsafe: C`double avg = total / count;   // 3.0: int division happened first`,
              hardened: C`double avg = static_cast<double>(total) / count;   // 3.5`,
            },
          },
          {
            id: "w3.l1.c6", type: "write", tags: ["w3.modulo", "w2.init"],
            prompt: "Write one line that declares an int named `leftover` and initializes it to the remainder of `coins` divided by 4.",
            accept: [
              "int leftover = coins % 4;",
              "int leftover{coins % 4};",
              "int leftover = (coins % 4);",
              "int leftover{(coins % 4)};",
            ],
            acceptRe: ["^int leftover ?(= ?\\(? ?coins ?% ?4 ?\\)?|\\{ ?\\(? ?coins ?% ?4 ?\\)? ?\\}) ?;$"],
            placeholder: "int leftover ...",
            hints: ["Start with the type and name: int leftover", "The remainder operator is %. Don't forget the ;"],
            short: "int leftover = coins % 4; stores the remainder.",
            explain: "`int leftover = coins % 4;` (or `int leftover{coins % 4};`) stores what's left after splitting coins into groups of 4.",
          },
        ],
        recap: [
          "Integer division drops the fraction: 7 / 2 == 3.",
          "% is the remainder: 17 % 5 == 2.",
          "Multiply, divide, remainder before add and subtract.",
          "Need a fraction? Make one operand a double before dividing.",
        ],
        vault: [
          {
            id: "w3.intdiv", title: "Integer division & remainder",
            code: C`
int q = 17 / 5;        // 3  (fraction dropped)
int r = 17 % 5;        // 2  (leftover)
int nq = -7 / 2;       // -3 (toward zero)
int nr = -7 % 2;       // -1 (sign of left side)
double d = 17.0 / 5;   // 3.4`,
            note: "(a / b) * b + a % b == a, always. Use a double operand for real division.",
            defense: false,
          },
          {
            id: "w3.precedence", title: "Operator precedence (so far)",
            code: C`
// high to low:
// ++x --x !x -x      (unary)
// *  /  %
// +  -
// <  <=  >  >=
// ==  !=
// &&
// ||
// =  +=  -=  *=  /=  %=`,
            note: "Same level: left to right (assignment goes right to left). Parentheses beat everything.",
            defense: false,
          },
        ],
        reviewTags: ["w2.int", "w2.double", "w2.convert"],
      },

      /* =============================== Lesson 2 =============================== */
      {
        id: "w3.l2", title: "Shortcuts: += and ++", skill: "logic", shield: false,
        concept: {
          short: "x += 5 is shorthand for x = x + 5. x++ hands back the old value, ++x the new.",
          analogy: "Compound assignment is a shortcut button: press `hp -= 3` instead of spelling out `hp = hp - 3`.",
          body: [
            "`x += 5` means `x = x + 5`. The same works for `-=`, `*=`, `/=`, and `%=`. The right side is computed first: `x *= 2 + 1` means `x = x * (2 + 1)`.",
            "`++x` and `x++` both add 1 to x (and `--` subtracts 1). The difference is the **value of the expression**:",
            "**Prefix** `++x`: add first, then give back the new value. **Postfix** `x++`: give back the old value, then add.",
            "On its own line (`++lives;` or `lives++;`) there's no difference. Prefer `++x` by habit: it says exactly what you mean.",
            "**Golden rule**: never modify a variable twice in one expression, or modify and read it there. `i++ + i++` is **undefined behavior** (UB): compilers really do disagree.",
          ],
          pitfall: "Common beginner mistake: thinking `int a = x++;` gives a the new value. It gets the OLD one. And don't cram several ++ into one line.",
        },
        demo: {
          code: C`
#include <iostream>

int main() {
    int hp = 10;
    hp -= 3;
    hp *= 2;
    int a = hp++;
    int b = ++hp;
    std::cout << a << ' ' << b << ' ' << hp << '\n';
    return 0;
}`,
          steps: [
            { line: 3, vars: { hp: "10" }, note: "Start with 10 hp." },
            { line: 4, vars: { hp: "7" }, note: "hp -= 3 is hp = hp - 3: now 7." },
            { line: 5, vars: { hp: "14" }, note: "hp *= 2 doubles it: 14." },
            { line: 6, vars: { hp: "15", a: "14" }, note: "Postfix: a gets the OLD value 14, then hp becomes 15." },
            { line: 7, vars: { hp: "16", a: "14", b: "16" }, note: "Prefix: hp becomes 16 FIRST, then b gets 16." },
            { line: 8, out: "14 16 16\n", note: "a, b, and hp, separated by spaces." },
            { line: 9, note: "Each line changed hp at most once. Clean and predictable!" },
          ],
        },
        challenges: [
          {
            id: "w3.l2.c1", type: "predict", tags: ["w3.incdec"],
            prompt: "What does this print? (Look closely at what's between the values.)",
            code: C`
#include <iostream>

int main() {
    int x = 5;
    int y = x++;
    int z = ++x;
    std::cout << x << y << z << '\n';
    return 0;
}`,
            options: [
              { t: "757\n", why: "Correct: y gets the old 5; x ends at 7, z is 7. No separators." },
              { t: "7 5 7\n", why: "The values are right, but no spaces are printed: there's no ' ' in the output chain." },
              { t: "767\n", why: "Postfix x++ hands back the OLD value, so y is 5, not 6." },
              { t: "656\n", why: "Both ++ really change x, so x ends at 7. And z comes from ++x, which uses the new value." },
            ],
            answer: 0,
            hints: ["x++ gives the old value, then increments.", "++x increments, then gives the new value. And check for spaces!"],
            short: "y gets x's old 5; z gets the new 7; no spaces printed.",
            explain: "x = 5. y = x++ gives y = 5, x = 6. z = ++x makes x = 7, z = 7. Printing x, y, z with nothing between: \"757\" and a newline.",
          },
          {
            id: "w3.l2.c2", type: "mcq", tags: ["w3.incdec", "w3.arith"],
            prompt: "What does `x *= 2 + 1;` do when x is 3?",
            options: [
              { t: "x becomes 9", why: "Correct: the right side goes first: x = 3 * (2 + 1)." },
              { t: "x becomes 7", why: "That's x * 2 + 1. But *= groups the whole right side first." },
              { t: "x becomes 6", why: "That ignores the + 1 entirely." },
              { t: "It doesn't compile", why: "Any expression can sit on the right of *=. It's perfectly valid." },
            ],
            answer: 0,
            hints: ["x op= expr means x = x op (expr).", "Put parentheses around everything to the right of *=."],
            short: "x *= 2 + 1 means x = x * (2 + 1) = 9.",
            explain: "x *= 2 + 1 is x = x * (2 + 1). With x = 3, that's 9.",
          },
          {
            id: "w3.l2.c3", type: "fill", tags: ["w3.arith", "w3.incdec"],
            prompt: "Fill in the compound operator so coins ends up tripled.",
            code: C`
int coins = 4;
coins ___ 3;   // coins is now 12`,
            accept: ["*="],
            placeholder: "operator",
            hints: ["Tripling means multiplying by 3.", "Combine * with = into one operator."],
            short: "coins *= 3 means coins = coins * 3.",
            explain: "coins *= 3 means coins = coins * 3: 4 * 3 = 12.",
          },
          {
            id: "w3.l2.c4", type: "review", tags: ["w3.incdec"], unsafe: true,
            prompt: "Code review! Tap every line with undefined behavior, then submit.",
            code: C`
int i = 1;
int a = i++;
int b = i++ + i++;
i += 2;
int c = i + ++i;
std::cout << a << ' ' << i << '\n';`,
            dangerous: [2, 4],
            lineNotes: {
              0: "Fine: i is initialized to 1.",
              1: "Fine: i is modified once. a gets 1, i becomes 2.",
              2: "UB: i is modified twice with no ordering between the two ++. Compilers may give different results, or worse.",
              3: "Fine: one modification of i.",
              4: "UB: the left `i` reads i while `++i` modifies it, and the two sides of + are unsequenced.",
              5: "Fine by itself (though after UB, nothing in the program can be trusted).",
            },
            hints: ["Look for a variable that's changed AND used again in the same expression.", "Two lines have i appearing twice with a ++ in the mix."],
            short: "Changing i twice, or changing and reading it, in one expression is UB.",
            explain: "Lines 3 and 5 modify i and also touch it again in the same expression, unsequenced: undefined behavior. UB doesn't promise a crash: it might print something that looks fine today and different numbers on another compiler. Split it into separate statements.",
            sideBySide: {
              unsafe: C`
int b = i++ + i++;   // UB
int c = i + ++i;     // UB`,
              hardened: C`
int b = i + (i + 1);  // what you meant
i += 2;
++i;                  // change i on its own line
int c = i + i;`,
            },
          },
          {
            id: "w3.l2.c5", type: "speed", tags: ["w3.arith", "w3.modulo", "w3.incdec", "w3.precedence"],
            prompt: "Speed round! Assume all numbers are ints.",
            seconds: 45,
            items: [
              { q: "What is the value?", code: "17 % 5", options: ["2", "3", "3.4"], answer: 0 },
              { q: "What is x now?", code: "int x = 3;\nx *= 2 + 1;", options: ["7", "9", "6"], answer: 1 },
              { q: "What is the value?", code: "10 / 4", options: ["2.5", "3", "2"], answer: 2 },
              { q: "What is m?", code: "int n = 4;\nint m = n--;", options: ["4", "3", "5"], answer: 0 },
              { q: "What is the value?", code: "2 + 3 * 2", options: ["10", "8", "7"], answer: 1 },
              { q: "What is k now?", code: "int k = 6;\nk /= 4;", options: ["1.5", "2", "1"], answer: 2 },
              { q: "What is the value?", code: "-9 % 4", options: ["-1", "3", "1"], answer: 0 },
            ],
            hints: ["Integer division drops the fraction; % keeps the leftover.", "Postfix gives the old value; compound ops compute the right side first."],
            short: "Ints drop fractions, postfix gives the old value, right side goes first.",
            explain: "17 % 5 = 2; x = 3 * (2 + 1) = 9; 10 / 4 = 2; m gets n's old value 4; 2 + 6 = 8; 6 / 4 = 1; -9 % 4 = -1 (sign of the left side).",
          },
          {
            id: "w3.l2.c6", type: "order", tags: ["w3.incdec", "w1.main"],
            prompt: "Order the lines so the program prints 2.",
            lines: [
              "#include <iostream>",
              "int main() {",
              "    int lives = 3;",
              "    --lives;",
              "    std::cout << lives << '\\n';",
              "    return 0;",
              "}",
            ],
            distractors: ["    int lives;"],
            hints: ["You must create lives before you can change it.", "One line declares lives with no value: that's a trap from World 2!"],
            short: "Declare with a value, decrement, then print. Never leave lives uninitialized.",
            explain: "Include, open main, declare and initialize lives to 3, decrement to 2, print, return, close. `int lives;` leaves it uninitialized: reading it would be UB.",
          },
        ],
        recap: [
          "x += 5 means x = x + 5.",
          "x++ gives the old value; ++x gives the new.",
          "Change a variable only once per expression.",
        ],
        vault: [
          {
            id: "w3.compound", title: "Compound assignment",
            code: C`
hp += 5;   // hp = hp + 5
hp -= 3;   // hp = hp - 3
hp *= 2;   // hp = hp * 2
hp /= 4;   // hp = hp / 4
hp %= 3;   // hp = hp % 3`,
            note: "x op= a + b means x = x op (a + b).",
            defense: false,
          },
          {
            id: "w3.incdec", title: "Prefix vs postfix",
            code: C`
int x = 5;
int a = x++;   // a = 5, x = 6 (old value)
int b = ++x;   // x = 7, b = 7 (new value)
// NEVER: x++ + x++  (UB)`,
            note: "One change per variable per expression. Prefer ++x on its own line.",
            defense: false,
          },
        ],
        reviewTags: ["w2.init", "w2.int", "w3.arith"],
      },

      /* =============================== Lesson 3 =============================== */
      {
        id: "w3.l3", title: "Compare and decide", skill: "logic", shield: false,
        concept: {
          short: "Comparisons give true or false; && means both, || means either, ! flips it.",
          analogy: "Logic operators are a bouncer's checklist: has a ticket AND is on the list.",
          body: [
            "Comparison operators produce a `bool`: `==` equal, `!=` not equal, `<`, `<=`, `>`, `>=`. Printed with `std::cout`, true shows as `1` and false as `0` (use `std::boolalpha` to see `true`/`false`).",
            "`=` assigns, `==` compares. Mixing them up still compiles, which is exactly why it's dangerous.",
            "Logic: `a && b` (and) is true only if both are; `a || b` (or) if at least one is; `!a` (not) flips it. `and`, `or`, `not` are valid spellings too.",
            "**Precedence**: `!` binds tightest, then comparisons, then `&&`, then `||`. So `a || b && c` means `a || (b && c)`.",
            "**Short-circuiting**: `&&` stops as soon as the left side is false; `||` stops as soon as the left side is true. The right side isn't evaluated at all. That's a superpower: put the safety check on the left.",
            "When printing a comparison, wrap it in parentheses: `std::cout << (a < b);`. Without them, `<<` grabs the operands first.",
          ],
          pitfall: "Common beginner mistake: `bool isBoss = (level = 10);`. That ASSIGNS 10 to level and gives true. Turn on warnings (World 1!) and compilers will flag it.",
        },
        demo: {
          code: C`
#include <iostream>

int main() {
    int hp = 0;
    int potions = 2;
    bool alive = hp > 0;
    bool canHeal = potions > 0 && !alive;
    std::cout << alive << ' ' << canHeal << '\n';
    std::cout << std::boolalpha << canHeal << '\n';
    return 0;
}`,
          steps: [
            { line: 3, vars: { hp: "0" }, note: "Our hero is down to 0 hp." },
            { line: 4, vars: { hp: "0", potions: "2" }, note: "But has 2 potions." },
            { line: 5, vars: { hp: "0", potions: "2", alive: "false" }, note: "0 > 0 is false." },
            { line: 6, vars: { hp: "0", potions: "2", alive: "false", canHeal: "true" }, note: "!alive is true, potions > 0 is true, so && gives true." },
            { line: 7, out: "0 1\n", note: "Without boolalpha, bools print as 0 and 1." },
            { line: 8, out: "true\n", note: "std::boolalpha switches bool printing to words (and it stays on)." },
            { line: 9, note: "Done. Drink that potion!" },
          ],
        },
        challenges: [
          {
            id: "w3.l3.c1", type: "predict", tags: ["w3.compare", "w2.bool"],
            prompt: "What does this print?",
            code: C`
#include <iostream>

int main() {
    int a = 3;
    int b = 7;
    std::cout << (a < b) << (a == b) << (a != b) << '\n';
    return 0;
}`,
            options: [
              { t: "101\n", why: "Correct: true, false, true print as 1, 0, 1, glued together." },
              { t: "truefalsetrue\n", why: "Without std::boolalpha, bools print as 1 and 0." },
              { t: "1 0 1\n", why: "No spaces are printed: there's no ' ' in the chain." },
              { t: "010\n", why: "3 < 7 is true, so the first digit is 1." },
            ],
            answer: 0,
            hints: ["Each comparison gives a bool.", "How does std::cout print a bool by default? Any spaces?"],
            short: "Bools print as 1 and 0, with nothing between them here.",
            explain: "(3 < 7) is true → 1, (3 == 7) is false → 0, (3 != 7) is true → 1. Output: \"101\" and a newline.",
          },
          {
            id: "w3.l3.c2", type: "mcq", tags: ["w3.logic", "w3.precedence"],
            prompt: "What is r?",
            code: C`bool r = true || true && false;`,
            options: [
              { t: "true", why: "Correct: && binds tighter, so it's true || (true && false) = true || false = true." },
              { t: "false", why: "That's reading left to right: (true || true) && false. But && is grouped first." },
              { t: "It doesn't compile", why: "Mixing && and || is legal (compilers may suggest parentheses, which is a good idea)." },
              { t: "It's undefined behavior", why: "Nothing is modified here; it's a well-defined expression." },
            ],
            answer: 0,
            hints: ["Which binds tighter: && or ||?", "Group the && part first, like * before +."],
            short: "&& binds tighter than ||, so it's true || (true && false).",
            explain: "&& has higher precedence than ||, like * over +. true || (true && false) is true. g++ -Wall even warns \"suggest parentheses around '&&' within '||'\": take the hint and write true || (true && false).",
          },
          {
            id: "w3.l3.c3", type: "predict", tags: ["w3.logic", "w3.incdec"],
            prompt: "Short-circuit time! What does this print?",
            code: C`
#include <iostream>

int main() {
    int count = 0;
    bool r = (count > 5) && (++count > 0);
    std::cout << r << ' ' << count << '\n';
    return 0;
}`,
            options: [
              { t: "0 0\n", why: "Correct: count > 5 is false, so && stops right there. ++count never runs." },
              { t: "0 1\n", why: "&& short-circuits: once the left side is false, the right side isn't evaluated, so count stays 0." },
              { t: "1 1\n", why: "The left side is false, so the whole && is false." },
              { t: "false 0\n", why: "Without std::boolalpha, false prints as 0." },
            ],
            answer: 0,
            hints: ["If the left side of && is false, can the result ever be true?", "C++ skips the right side when the answer is already known."],
            short: "The left side is false, so && skips ++count entirely.",
            explain: "0 > 5 is false, so && short-circuits: ++count is skipped. r is false (prints 0), count is still 0. Output: \"0 0\" and a newline.",
          },
          {
            id: "w3.l3.c4", type: "bug", tags: ["w3.compare", "w1.warnings"],
            prompt: "Expected \"0 3\", but it prints \"1 10\". Tap the buggy line, then pick the fix.",
            code: C`
#include <iostream>

int main() {
    int level = 3;
    bool isBoss = (level = 10);
    std::cout << isBoss << ' ' << level << '\n';
    return 0;
}`,
            bugLine: 4,
            options: [
              { t: "bool isBoss = (level == 10);", why: "Correct: == compares without changing level. 3 == 10 is false." },
              { t: "bool isBoss = (level === 10);", why: "=== is JavaScript. C++ has no such operator: compile error." },
              { t: "bool isBoss = level = 10;", why: "Same bug without parentheses: it still assigns 10." },
              { t: "bool isBoss = (10 = level);", why: "You can't assign to the literal 10: compile error. (The \"Yoda\" trick is written 10 == level.)" },
            ],
            answer: 0,
            hints: ["Which line changes level when it shouldn't?", "One = assigns. How many = do you need to compare?"],
            short: "= assigns, == compares. Warnings catch this mix-up.",
            explain: "level = 10 assigns 10 and the expression's value (10) converts to true. Use == to compare. Compiling with -Wall warns about this: warnings are your friend!",
            sideBySide: {
              unsafe: C`bool isBoss = (level = 10);   // assigns! always true`,
              hardened: C`bool isBoss = (level == 10);  // compares`,
            },
          },
          {
            id: "w3.l3.c5", type: "fill", tags: ["w3.logic", "w3.compare"],
            prompt: "Fill in the operator so inRange is true only when age is between 0 and 120 (inclusive).",
            code: C`
int age = 30;
bool inRange = (age >= 0) ___ (age <= 120);`,
            accept: ["&&", "and"],
            placeholder: "operator",
            hints: ["Both conditions must hold at the same time.", "The AND operator is two ampersands."],
            short: "Both conditions must hold, so use &&.",
            explain: "(age >= 0) && (age <= 120) is true only if both are true. With ||, every age would pass, since every number is either >= 0 or <= 120.",
          },
          {
            id: "w3.l3.c6", type: "edge", tags: ["w3.logic", "w3.compare"], unsafe: true,
            prompt: "validRoll should be true only for a die roll from 1 to 6. Which test inputs expose the bug? Select all that apply.",
            code: C`
int roll = 0;
std::cin >> roll;
bool validRoll = (roll >= 1) || (roll <= 6);`,
            options: [
              { t: "0", why: "Exposes it: 0 <= 6 is true, so || says valid. It shouldn't be." },
              { t: "7", why: "Exposes it: 7 >= 1 is true, so || says valid. It shouldn't be." },
              { t: "3", why: "3 really is valid, and the code says valid. This test can't tell right from wrong." },
              { t: "-2", why: "Exposes it: -2 <= 6 is true, so it's wrongly accepted." },
              { t: "6", why: "6 is valid and gets accepted. Correct result, so no bug exposed." },
            ],
            answers: [0, 1, 3],
            hints: ["Good tests use values that SHOULD be rejected.", "With ||, one true side is enough. Can any number fail both?"],
            short: "|| makes it always true; only out-of-range inputs reveal that.",
            explain: "Every integer is either >= 1 or <= 6, so || makes validRoll always true. Only out-of-range inputs (0, 7, -2) reveal it. Fix: use &&.",
            sideBySide: {
              unsafe: C`bool validRoll = (roll >= 1) || (roll <= 6);   // always true`,
              hardened: C`bool validRoll = (roll >= 1) && (roll <= 6);   // 1..6 only`,
            },
          },
        ],
        recap: [
          "== compares, = assigns. Compile with warnings to catch mix-ups.",
          "Bools print as 1/0 unless you use std::boolalpha.",
          "! first, then comparisons, then &&, then ||.",
          "&& and || short-circuit: the right side may never run.",
        ],
        vault: [
          {
            id: "w3.compare", title: "Comparison operators",
            code: C`
a == b   a != b
a <  b   a <= b
a >  b   a >= b
std::cout << (a < b);   // parentheses needed!`,
            note: "Results are bool: printed as 1/0, or true/false with std::boolalpha.",
            defense: false,
          },
          {
            id: "w3.logic", title: "Logic & short-circuit",
            code: C`
bool ok = (x >= 1) && (x <= 6);  // both
bool any = hurt || poisoned;      // at least one
bool no = !ready;                 // flip
// && stops at the first false, || at the first true`,
            note: "a || b && c means a || (b && c). Put cheap safety checks on the left.",
            defense: false,
          },
        ],
        reviewTags: ["w2.bool", "w1.cout", "w3.precedence"],
      },

      /* =============================== Lesson 4 =============================== */
      {
        id: "w3.l4", title: "Listening with std::cin", skill: "toolkit", shield: false,
        concept: {
          short: "std::cin >> x reads one value or word; std::getline reads a whole line.",
          analogy: "`std::cin` is a conveyor belt: `>>` grabs one item, `std::getline` scoops the whole line.",
          body: [
            "`std::cin >> x;` reads the next value into x. It **skips leading whitespace** (spaces, tabs, newlines), then reads until the value ends. Needs `#include <iostream>`.",
            "You can chain reads: `std::cin >> a >> b;` reads two values, separated by any whitespace.",
            "Reading a `std::string` with `>>` gets only **one word**: it stops at the first space. Input `Curlo the Brave` gives just `Curlo`.",
            "To read a whole line with spaces, use `std::getline(std::cin, line);` (needs `#include <string>`). It reads up to the newline and throws the newline away.",
            "**The leftover newline trap**: after `std::cin >> age;` the Enter key's `'\\n'` is still on the belt. A following `std::getline` sees it immediately and reads an empty line. Fix it by discarding the rest of the line first: `std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');` (needs `#include <limits>`).",
          ],
          pitfall: "Common beginner mistake: typing `std::cin << x` (arrows the wrong way). Think of it as data flowing FROM cin INTO x: `cin >> x`, and FROM x INTO cout: `cout << x`.",
        },
        demo: {
          code: C`
#include <iostream>
#include <limits>
#include <string>

int main() {
    int age{};
    std::string name;
    std::cout << "Age? ";
    std::cin >> age;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    std::cout << "Full name? ";
    std::getline(std::cin, name);
    std::cout << name << " is " << age << '\n';
    return 0;
}`,
          steps: [
            { line: 5, vars: { age: "0" }, note: "age{} starts at 0: always initialize!" },
            { line: 6, vars: { age: "0", name: "\"\"" }, note: "A std::string starts empty on its own." },
            { line: 7, out: "Age? ", note: "No newline, so the answer is typed on this line." },
            { line: 8, vars: { age: "12", name: "\"\"" }, note: "Input: `12` + Enter. >> reads 12, leaves the '\\n' behind." },
            { line: 9, note: "ignore() throws away everything up to and including that leftover '\\n'." },
            { line: 10, out: "Full name? " },
            { line: 11, vars: { age: "12", name: "\"Ada Lovelace\"" }, note: "Input: `Ada Lovelace` + Enter. getline keeps the space." },
            { line: 12, out: "Ada Lovelace is 12\n", note: "Without ignore(), name would be empty: \" is 12\"." },
            { line: 13, note: "Done. Both inputs heard loud and clear!" },
          ],
        },
        challenges: [
          {
            id: "w3.l4.c1", type: "predict", tags: ["w3.cin", "w2.string"],
            prompt: "The player types `Curlo the Brave` and presses Enter. What does this print?",
            code: C`
#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;
    std::cout << "[" << word << "]\n";
    return 0;
}`,
            options: [
              { t: "[Curlo]\n", why: "Correct: >> into a string reads one word and stops at the first space." },
              { t: "[Curlo the Brave]\n", why: "That's what std::getline would read. >> stops at whitespace." },
              { t: "[Curlo ]\n", why: ">> doesn't include the space it stops at." },
              { t: "[]\n", why: ">> skips leading whitespace and reads the first word, so word isn't empty." },
            ],
            answer: 0,
            hints: [">> reads a string until what?", "Spaces end a >> read."],
            short: ">> into a string reads one word only.",
            explain: "std::cin >> word reads \"Curlo\" and stops at the space. \" the Brave\" stays on the belt. Output: \"[Curlo]\" and a newline.",
          },
          {
            id: "w3.l4.c2", type: "predict", tags: ["w3.getline", "w3.cin"],
            prompt: "The player types `5`, Enter, `Dragon Slayer`, Enter. What does this print?",
            code: C`
#include <iostream>
#include <string>

int main() {
    int level{};
    std::string title;
    std::cin >> level;
    std::getline(std::cin, title);
    std::cout << level << ":" << title << "!\n";
    return 0;
}`,
            options: [
              { t: "5:!\n", why: "Correct: getline reads the rest of the first line, which is just the leftover '\\n'. title is empty." },
              { t: "5:Dragon Slayer!\n", why: "That's what you'd get with a cin.ignore(...) between the two reads. Here, getline eats the leftover newline." },
              { t: "5: Dragon Slayer!\n", why: "getline never gets to the second line, and there's no extra space printed." },
              { t: "0:!\n", why: "Reading 5 into level succeeds; the problem is only the string." },
            ],
            answer: 0,
            hints: ["After >> reads 5, what character is still waiting?", "getline stops at the first '\\n' it sees."],
            short: "getline read the leftover newline, so title is empty.",
            explain: ">> reads 5 and leaves '\\n'. getline immediately hits that '\\n' and returns an empty string. Output: \"5:!\" and a newline. \"Dragon Slayer\" is still unread.",
          },
          {
            id: "w3.l4.c3", type: "fill", tags: ["w3.cin"],
            prompt: "Fill in the operator that reads a value from the keyboard into hp.",
            code: C`
int hp{};
std::cout << "Enter HP: ";
std::cin ___ hp;`,
            accept: [">>"],
            placeholder: "operator",
            hints: ["Data flows FROM cin INTO hp.", "It's the opposite arrows of cout's <<."],
            short: "Data flows from cin into hp: std::cin >> hp.",
            explain: "std::cin >> hp: the arrows point toward where the data goes.",
          },
          {
            id: "w3.l4.c4", type: "mcq", tags: ["w3.getline"],
            prompt: "Which line reads a whole line of text (spaces included) into `std::string line`?",
            options: [
              { t: "std::getline(std::cin, line);", why: "Correct: the stream comes first, then the string. Reads up to the newline." },
              { t: "std::cin >> line;", why: "Only reads one word: it stops at the first space." },
              { t: "std::getline(line, std::cin);", why: "Arguments are swapped: the stream goes first. Compile error." },
              { t: "std::cin.getline(line);", why: "The member cin.getline works with char arrays and a size, not std::string. Compile error." },
            ],
            answer: 0,
            hints: ["It's a free function, not a member of cin.", "Order: where from, then where to."],
            short: "std::getline(std::cin, line) reads the whole line.",
            explain: "std::getline(std::cin, line) reads everything up to '\\n' into line and discards the '\\n'.",
          },
          {
            id: "w3.l4.c5", type: "predict", tags: ["w3.cin", "w3.arith", "w3.modulo"],
            prompt: "The input is `  8` on one line and `  3` on the next (with leading spaces). What does this print?",
            code: C`
#include <iostream>

int main() {
    int a{};
    int b{};
    std::cin >> a >> b;
    std::cout << a - b << ' ' << a % b << '\n';
    return 0;
}`,
            options: [
              { t: "5 2\n", why: "Correct: >> skips whitespace, so a = 8, b = 3: 5 and 2." },
              { t: "0 0\n", why: "Leading whitespace doesn't make >> fail: it's skipped automatically." },
              { t: "5 2.67\n", why: "% on ints gives a whole-number remainder." },
              { t: "53\n", why: "This prints a - b and a % b, separated by a space, not a and b." },
            ],
            answer: 0,
            hints: [">> skips leading whitespace, including newlines.", "8 % 3: how much is left after taking out 3s?"],
            short: ">> skips whitespace: a = 8, b = 3, printing 5 and 2.",
            explain: ">> skips all whitespace before each number: a = 8, b = 3. 8 - 3 = 5, 8 % 3 = 2. Output: \"5 2\" and a newline.",
          },
          {
            id: "w3.l4.c6", type: "write", tags: ["w3.getline"],
            prompt: "Write one line that reads a whole line of input into the std::string named `quest`.",
            accept: [
              "std::getline(std::cin, quest);",
              "std::getline(std::cin >> std::ws, quest);",
            ],
            acceptRe: ["^std::getline ?\\( ?std::cin ?(>> ?std::ws ?)?, ?quest ?\\) ?;$"],
            placeholder: "std::getline(...);",
            hints: ["It's std::getline with two arguments.", "Stream first, then the string. End with ;"],
            short: "std::getline(std::cin, quest); reads the whole line.",
            explain: "std::getline(std::cin, quest); reads everything up to the newline. (std::cin >> std::ws first skips leading whitespace, another fix for the leftover-newline trap.)",
          },
        ],
        recap: [
          "std::cin >> x skips spaces, then reads one value.",
          "std::getline(std::cin, s) reads a whole line, spaces included.",
          "After >>, ignore the leftover '\\n' before getline.",
        ],
        vault: [
          {
            id: "w3.cin", title: "Reading with >>",
            code: C`
int a{};
int b{};
std::string word;
std::cin >> a >> b;   // two numbers
std::cin >> word;     // ONE word`,
            note: ">> skips leading whitespace and stops at the next whitespace.",
            defense: false,
          },
          {
            id: "w3.getline", title: "Reading a whole line",
            code: C`
#include <limits>
#include <string>

std::cin >> age;
std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
std::getline(std::cin, fullName);`,
            note: "Mixing >> and getline? Ignore the leftover newline first.",
            defense: false,
          },
        ],
        reviewTags: ["w2.string", "w1.include", "w2.init"],
      },

      /* ============================ Lesson 5 (Shield) ============================ */
      {
        id: "w3.l5", title: "Shield: Guard the input gate", skill: "defense", shield: true,
        concept: {
          short: "Never trust input: check every read, check divisors before dividing, check limits before adding.",
          analogy: "`std::cin` is a gate guard: hand it \"abc\" and it slams the gate until you clear the alarm.",
          body: [
            "**Never trust input.** If `std::cin >> x` gets `abc`, x becomes `0` (since C++11) and cin enters a **fail state**: every later read fails until you fix it.",
            "Check every read: `if (!(std::cin >> x)) { ... }`. The stream is false after a failed read. A number too big for an int fails too.",
            "To recover: `std::cin.clear();` resets the fail state, then `std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');` throws away the bad line. Order matters: clear first, or ignore does nothing. Needs `#include <limits>`.",
            "**Division by zero**: for integers, `x / 0` and `x % 0` are **undefined behavior**. Always check the divisor first: `if (count <= 0) { ... }` when only positive values make sense. (Sneaky extra: the smallest int divided by `-1` overflows too.)",
            "**Signed overflow**: going past the largest `int` (usually 2147483647) is also UB. Check **before** adding: `if (b > 0 && a > std::numeric_limits<int>::max() - b)`. Checking afterward is too late: the UB already happened.",
            "UB doesn't guarantee a crash: it can pass every test, then break on another compiler. Guard, don't hope.",
          ],
          pitfall: "Common beginner mistake: `ignore()` without `clear()` first (a failed stream ignores nothing), or testing `x == 0` for bad input, which rejects a valid 0.",
        },
        demo: {
          code: C`
#include <iostream>

int main() {
    int gold{};
    int party{};
    std::cout << "Gold and party size? ";
    if (!(std::cin >> gold >> party)) {
        std::cout << "That's not a number!\n";
        return 1;
    }
    if (party <= 0) {
        std::cout << "Party size must be positive.\n";
        return 1;
    }
    std::cout << "Each gets " << gold / party << '\n';
    return 0;
}`,
          steps: [
            { line: 3, vars: { gold: "0" }, note: "Initialized with {}: 0, never garbage." },
            { line: 4, vars: { gold: "0", party: "0" } },
            { line: 5, out: "Gold and party size? ", note: "Run 1. Simulated input: `abc`" },
            { line: 6, vars: { gold: "0", party: "0" }, shield: "Fail state caught!", note: "`abc` fails: gold becomes 0, cin enters the fail state." },
            { line: 7, out: "That's not a number!\n" },
            { line: 8, note: "return 1: leave early with an error code. No garbage math." },
            { line: 5, out: "Gold and party size? ", note: "Run 2. Simulated input: `100 0`" },
            { line: 6, vars: { gold: "100", party: "0" }, note: "Both reads succeed. They're numbers... but is 0 a sane party size?" },
            { line: 14, crash: "100 / 0: undefined behavior!", note: "Without the party check, 100 / 0 runs here: UB!" },
            { line: 10, shield: "Divisor checked!", note: "Back to reality: the guard runs first. party <= 0 is true." },
            { line: 11, out: "Party size must be positive.\n" },
            { line: 12, note: "Exit safely. The division never runs with a bad divisor." },
          ],
        },
        challenges: [
          {
            id: "w3.l5.c1", type: "breakit", tags: ["w3.divzero", "w3.cin"], unsafe: true,
            prompt: "UNSAFE code. The player types two numbers. Pick the input that breaks it.",
            code: C`
#include <iostream>

int main() {
    int a{};
    int b{};
    std::cin >> a >> b;
    std::cout << a / b << '\n';
    return 0;
}`,
            options: [
              { t: "10 2", why: "10 / 2 = 5. Works fine." },
              { t: "0 5", why: "0 / 5 = 0. A zero on top is harmless; only the divisor matters." },
              { t: "7 0", why: "Correct: 7 / 0 is integer division by zero: undefined behavior." },
              { t: "-9 3", why: "-9 / 3 = -3. Negative numbers divide just fine." },
            ],
            answer: 2,
            hints: ["Which number can never be a divisor?", "Look at b, the right side of /."],
            short: "Dividing by 0 is UB. Check the divisor first.",
            explain: "Integer division by zero is UB. It often crashes, but it isn't guaranteed to: the program might print junk or seem fine. Check the input and the divisor first.",
            sideBySide: {
              unsafe: C`
int a{};
int b{};
std::cin >> a >> b;
std::cout << a / b << '\n';`,
              hardened: C`
#include <limits>

int a{};
int b{};
if (!(std::cin >> a >> b)) {
    std::cout << "Numbers only!\n";
    return 1;
}
if (b == 0 || (a == std::numeric_limits<int>::min() && b == -1)) {
    std::cout << "Can't divide that!\n";
    return 1;
}
std::cout << a / b << '\n';`,
            },
          },
          {
            id: "w3.l5.c2", type: "harden", tags: ["w3.validate", "w3.cin"], bug: "cin-fail",
            prompt: "Pick the condition that catches bad input like `abc`.",
            code: C`
#include <iostream>

int main() {
    int x{};
    std::cout << "Enter a number: ";
    if (___) {
        std::cout << "Invalid input\n";
        return 1;
    }
    std::cout << "You typed " << x << '\n';
    return 0;
}`,
            options: [
              { t: "!(std::cin >> x)", why: "Correct: reads x AND checks whether the read worked, in one step." },
              { t: "x == 0", why: "Nothing is ever read! And a valid 0 would be rejected too." },
              { t: "std::cin >> x", why: "Inverted: this says \"invalid\" every time the read SUCCEEDS." },
              { t: "!x", why: "Also never reads input; it just checks the starting 0." },
            ],
            answer: 0,
            hints: ["The read itself can tell you if it worked.", "std::cin >> x gives back the stream, which is false after a failed read."],
            short: "!(std::cin >> x) reads and detects failure in one step.",
            explain: "`std::cin >> x` returns std::cin, which converts to false if the read failed. `!(...)` flips it, so the if runs exactly when input is bad.",
            sideBySide: {
              unsafe: C`
std::cin >> x;
std::cout << "You typed " << x << '\n';   // "abc" prints 0`,
              hardened: C`
if (!(std::cin >> x)) {
    std::cout << "Invalid input\n";
    return 1;
}
std::cout << "You typed " << x << '\n';`,
            },
          },
          {
            id: "w3.l5.c3", type: "harden", tags: ["w3.validate", "w3.cin"], bug: "cin-fail",
            prompt: "The first read failed. cin is cleared, but the junk is still waiting. What goes in the blank so the retry can work?",
            code: C`
#include <iostream>
#include <limits>

int main() {
    int x{};
    std::cout << "Number: ";
    if (!(std::cin >> x)) {
        std::cin.clear();
        ___;
        std::cout << "Try again: ";
        if (!(std::cin >> x)) {
            return 1;
        }
    }
    std::cout << "Got " << x << '\n';
    return 0;
}`,
            options: [
              { t: IGNORE_LINE, why: "Correct: throws away everything up to and including the newline, so \"abc\" is gone." },
              { t: "std::cin.ignore()", why: "Discards just ONE character: \"abc\" becomes \"bc\", and the retry fails again." },
              { t: "std::cin.clear()", why: "Already cleared. Clearing again doesn't remove the junk characters." },
              { t: "std::cin.flush()", why: "Input streams have no flush(): compile error. (And fflush(stdin) is UB, never use it.)" },
            ],
            answer: 0,
            hints: ["The bad characters are still sitting on the belt.", "You need to skip everything up to the end of the line."],
            short: "After clear(), ignore the rest of the bad line.",
            explain: "Recovery is two steps: clear() resets the fail state, then ignore(max, '\\n') discards the rest of the bad line. Now the next read sees fresh input.",
            sideBySide: {
              unsafe: C`
if (!(std::cin >> x)) {
    std::cin.clear();          // junk still there!
    std::cin >> x;             // reads "abc" again: fails
}`,
              hardened: C`
if (!(std::cin >> x)) {
    std::cin.clear();
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    if (!(std::cin >> x)) {
        return 1;
    }
}`,
            },
          },
          {
            id: "w3.l5.c4", type: "mcq", tags: ["w3.overflow"],
            prompt: "On a typical system where int is 32 bits, what happens here?",
            code: C`
int hp = 2147483647;   // the largest int
hp += 1;`,
            options: [
              { t: "Undefined behavior: anything can happen, including seeming to work", why: "Correct: signed integer overflow is UB. The compiler is allowed to assume it never happens." },
              { t: "hp becomes -2147483648, guaranteed", why: "Wrapping around is common in practice, but NOT guaranteed for signed ints. Optimizers can and do produce other results." },
              { t: "hp stays at 2147483647", why: "C++ doesn't clamp ints to their maximum." },
              { t: "Compile error", why: "The compiler can't generally know values at compile time; it compiles (maybe with a warning)." },
            ],
            answer: 0,
            hints: ["Is there a rule for what happens past the maximum?", "Signed overflow is one of the classic sources of UB."],
            short: "Signed overflow is UB, even if it seems to wrap.",
            explain: "Going past std::numeric_limits<int>::max() is undefined behavior. It may appear to wrap to a negative number today and do something else tomorrow. Check before the math, not after.",
          },
          {
            id: "w3.l5.c5", type: "harden", tags: ["w3.overflow", "w3.validate"],
            prompt: "bonus is already checked to be a number and not negative. Pick the check that stops score from overflowing.",
            code: C`
#include <iostream>
#include <limits>

int main() {
    int score{2'000'000'000};
    int bonus{};
    if (!(std::cin >> bonus) || bonus < 0) {
        std::cout << "Bonus must be a number, 0 or more.\n";
        return 1;
    }
    if (___) {
        std::cout << "Too big! Score would overflow.\n";
        return 1;
    }
    score += bonus;
    std::cout << score << '\n';
    return 0;
}`,
            options: [
              { t: "bonus > std::numeric_limits<int>::max() - score", why: "Correct: max - score can't overflow (score is positive), and it tells you exactly how much room is left." },
              { t: "score + bonus > std::numeric_limits<int>::max()", why: "The addition itself overflows (UB) before the comparison, and no int is ever bigger than max anyway." },
              { t: "score + bonus < 0", why: "Relies on overflow wrapping around. It's UB, so the optimizer may delete this check entirely." },
              { t: "bonus > std::numeric_limits<int>::max()", why: "An int can never be bigger than the largest int, so this is always false." },
            ],
            answer: 0,
            hints: ["Don't do the risky addition to find out if it's risky.", "Rearrange a + b > max as b > max - a: no overflow."],
            short: "Check bonus > max - score before adding; that side can't overflow.",
            explain: "Move the math to the safe side: bonus > max - score. Since score is positive, max - score can't overflow. Input 147483648 is rejected; 147483647 exactly reaches max, which is fine.",
            sideBySide: {
              unsafe: C`
score += bonus;              // may overflow: UB
if (score < 0) { /* ... */ } // too late, and may be optimized away`,
              hardened: C`
if (bonus > std::numeric_limits<int>::max() - score) {
    std::cout << "Too big! Score would overflow.\n";
    return 1;
}
score += bonus;`,
            },
          },
          {
            id: "w3.l5.c6", type: "safe", tags: ["w3.validate", "w3.divzero", "w3.overflow"],
            prompt: "Safe or unsafe? The Input Golem's minions are coming. Go fast!",
            seconds: 30,
            items: [
              { code: "if (count > 0) {\n    avg = total / count;\n}", safe: true, why: "The divisor is checked before dividing." },
              { code: "int r = x % 0;", safe: false, why: "Remainder by zero is UB, just like division by zero." },
              { code: "std::cin >> n;\nstd::cout << 100 / n;", safe: false, why: "Unchecked: typing 0 (or \"abc\", which sets n to 0) divides by zero." },
              { code: "if (!(std::cin >> n)) {\n    return 1;\n}", safe: true, why: "The read is checked; bad input exits cleanly." },
              { code: "int big = std::numeric_limits<int>::max();\n++big;", safe: false, why: "Going past the largest int is signed overflow: UB." },
              { code: "std::cin.clear();\n" + IGNORE_LINE + ";", safe: true, why: "The standard recovery: reset the fail state, then drop the bad line." },
              { code: "long long sum = static_cast<long long>(a) + b;", safe: true, why: "long long is at least 64 bits, so two ints can always be added in it without overflow." },
              { code: "std::cin >> age;\nint days = age * 365;", safe: false, why: "Unchecked read, and a huge age makes the multiplication overflow." },
            ],
            hints: ["Look for any divisor that isn't checked.", "Look for reads that aren't checked and math that could go past the largest int."],
            short: "Safe code checks reads, divisors, and limits before the math.",
            explain: "Safe code checks the read, checks the divisor, and makes sure math can't pass the int limits. Everything else is an open gate.",
            sideBySide: {
              unsafe: C`
std::cin >> n;
std::cout << 100 / n;`,
              hardened: C`
if (!(std::cin >> n) || n == 0) {
    std::cout << "Need a non-zero number\n";
    return 1;
}
std::cout << 100 / n;`,
            },
          },
        ],
        recap: [
          "Check every read: if (!(std::cin >> x)) { ... }.",
          "Recover with std::cin.clear(), then std::cin.ignore(max, '\\n').",
          "Integer / 0 and % 0 are UB: check first.",
          "Signed overflow is UB: check against std::numeric_limits BEFORE the math.",
        ],
        vault: [
          {
            id: "w3.cinguard", title: "Validate every read",
            code: C`
#include <limits>

int x{};
if (!(std::cin >> x)) {
    std::cin.clear();
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    // report the problem, retry or exit
}`,
            note: "A failed read sets x to 0 and blocks all later reads until clear().",
            defense: true,
          },
          {
            id: "w3.divguard", title: "Check the divisor",
            code: C`
if (count <= 0) {
    std::cout << "Need a positive count\n";
    return 1;
}
int share = total / count;
int rest  = total % count;`,
            note: "x / 0 and x % 0 are UB for integers. It may not crash: it may lie.",
            defense: true,
          },
          {
            id: "w3.overflowguard", title: "Check before adding",
            code: C`
#include <limits>

if (b > 0 && a > std::numeric_limits<int>::max() - b) {
    // a + b would overflow
}
if (b < 0 && a < std::numeric_limits<int>::min() - b) {
    // a + b would underflow
}`,
            note: "Signed overflow is UB. Test on the safe side before doing the math.",
            defense: true,
          },
        ],
        reviewTags: ["w2.init", "w2.narrowing", "w3.cin", "w1.warnings"],
      },
    ],

    /* ================================ Project ================================ */
    project: {
      id: "w3.p", title: "Loot Splitter",
      intro: "Split the treasure fairly: read gold and party size, print shares and leftovers.",
      steps: [
        {
          id: "w3.p.s1", type: "write", tags: ["w2.init", "w3.cin"],
          prompt: "First, a place to store the loot. Write one line that declares an int named `gold` and initializes it to 0.",
          accept: ["int gold{};", "int gold{0};", "int gold = 0;"],
          acceptRe: ["^int gold ?(\\{ ?0? ?\\}|= ?0|= ?\\{ ?0? ?\\}) ?;$"],
          placeholder: "int gold ...",
          hints: ["Type, then name, then the starting value.", "int gold{}; works, and so does int gold = 0;"],
          short: "int gold{}; starts gold at a known 0.",
          explain: "`int gold{};` value-initializes gold to 0. Never leave it uninitialized: reading garbage is UB (World 2!). Do the same for `int party{};`.",
        },
        {
          id: "w3.p.s2", type: "order", tags: ["w3.cin", "w1.cout"],
          prompt: "Order the input section: ask for the gold, read it, then ask for the party size and read it.",
          lines: [
            "std::cout << \"Total gold: \";",
            "std::cin >> gold;",
            "std::cout << \"Party size: \";",
            "std::cin >> party;",
          ],
          distractors: ["std::cin << gold;"],
          hints: ["Always prompt before you read.", "cin uses >>, not <<."],
          short: "Prompt, read, prompt, read. cin uses >>.",
          explain: "Prompt, read, prompt, read. `std::cin << gold` has the arrows backward and won't compile.",
        },
        {
          id: "w3.p.s3", type: "fill", tags: ["w3.arith"],
          prompt: "Each hero gets an equal whole number of coins. Fill in the operator.",
          code: C`int share = gold ___ party;`,
          accept: ["/"],
          placeholder: "operator",
          hints: ["Splitting equally means dividing.", "int / int drops the fraction: exactly what we want for whole coins."],
          short: "gold / party gives each hero's whole coins.",
          explain: "gold / party is integer division: each hero gets the whole coins, and the fraction is dropped.",
        },
        {
          id: "w3.p.s4", type: "fill", tags: ["w3.modulo"],
          prompt: "Now the coins that can't be split evenly. Fill in the operator.",
          code: C`int leftover = gold ___ party;`,
          accept: ["%"],
          placeholder: "operator",
          hints: ["You want what's left over after dividing.", "The remainder operator."],
          short: "gold % party gives the coins left over.",
          explain: "gold % party is the remainder: the coins that stay in the chest.",
        },
        {
          id: "w3.p.s5", type: "predict", tags: ["w3.arith", "w3.modulo", "w1.cout"],
          prompt: "Test run: the player enters 17 gold and a party of 5. What do the last two output lines say?",
          code: C`
std::cout << "Each hero gets " << share << " gold.\n";
std::cout << "Left in the chest: " << leftover << " gold.\n";`,
          options: [
            { t: "Each hero gets 3 gold.\nLeft in the chest: 2 gold.\n", why: "Correct: 17 / 5 = 3 and 17 % 5 = 2." },
            { t: "Each hero gets 3.4 gold.\nLeft in the chest: 2 gold.\n", why: "share is an int computed with int division: no .4." },
            { t: "Each hero gets 3 gold.\nLeft in the chest: 3 gold.\n", why: "The remainder is 17 - 5 * 3 = 2, not 3." },
            { t: "Each hero gets 3 gold.Left in the chest: 2 gold.\n", why: "Each line ends with \\n, so they print on separate lines." },
          ],
          answer: 0,
          hints: ["5 goes into 17 how many whole times?", "What's left after 3 coins each for 5 heroes?"],
          short: "17 / 5 = 3 each, 17 % 5 = 2 left.",
          explain: "share = 17 / 5 = 3, leftover = 17 % 5 = 2. Each string ends with \\n, giving two lines.",
        },
      ],
      program: C`
#include <iostream>

int main() {
    int gold{};
    int party{};

    std::cout << "Total gold: ";
    if (!(std::cin >> gold) || gold < 0) {
        std::cout << "Gold must be a whole number, 0 or more.\n";
        return 1;
    }

    std::cout << "Party size: ";
    if (!(std::cin >> party) || party <= 0) {
        std::cout << "Party size must be a whole number above 0.\n";
        return 1;
    }

    int share = gold / party;
    int leftover = gold % party;

    std::cout << "Each hero gets " << share << " gold.\n";
    std::cout << "Left in the chest: " << leftover << " gold.\n";
    return 0;
}`,
      stress: {
        intro: "Brace for impact! I'll throw nasty input at your Loot Splitter. Patch every crack!",
        attacks: [
          {
            input: "0", label: "A party of zero!",
            challenge: {
              id: "w3.p.a1", type: "harden", tags: ["w3.divzero", "w3.validate"],
              prompt: "Party size 0 means gold / 0: undefined behavior! Pick the guard.",
              code: C`
std::cout << "Party size: ";
if (!(std::cin >> party) || ___) {
    std::cout << "Party size must be a whole number above 0.\n";
    return 1;
}
int share = gold / party;`,
              options: [
                { t: "party <= 0", why: "Correct: blocks zero (UB) and negative sizes (nonsense shares), in one check." },
                { t: "party == 0", why: "Stops this attack, but -3 heroes would still produce negative shares. <= 0 covers both." },
                { t: "party < 0", why: "Misses exactly the attack: 0 is not less than 0, so gold / 0 still happens." },
                { t: "gold == 0", why: "Wrong variable. 0 gold split among 5 is fine (everyone gets 0); the divisor is the danger." },
              ],
              answer: 0,
              hints: ["What values of party make no sense?", "Zero is dangerous, negatives are nonsense. One comparison can catch both."],
              short: "party <= 0 blocks zero and negative party sizes.",
              explain: "Only a positive party size makes sense. `party <= 0` rejects 0 (division by zero is UB) and negatives, before the division runs.",
              sideBySide: {
                unsafe: C`
std::cin >> party;
int share = gold / party;   // party 0: UB`,
                hardened: C`
if (!(std::cin >> party) || party <= 0) {
    std::cout << "Party size must be a whole number above 0.\n";
    return 1;
}
int share = gold / party;`,
              },
            },
          },
          {
            input: "abc", label: "Text instead of a number!",
            challenge: {
              id: "w3.p.a2", type: "bug", tags: ["w3.validate", "w3.cin"], bug: "cin-fail", unsafe: true,
              prompt: "Typing `abc` for the gold sets gold to 0 AND jams cin, so party can't be read either. It stays 0, and gold / party divides by zero! Tap the line that needs protection, then pick the fix.",
              code: C`
int gold{};
int party{};
std::cout << "Total gold: ";
std::cin >> gold;
std::cout << "Party size: ";
std::cin >> party;`,
              bugLine: 3,
              options: [
                { t: "if (!(std::cin >> gold)) { std::cout << \"Not a number!\\n\"; return 1; }", why: "Correct: checks the read and exits before the jammed stream can cause more damage." },
                { t: "std::cin >> gold; std::cin.clear();", why: "Unjams cin, but \"abc\" is still waiting, so reading party fails again. Also never tells the player." },
                { t: "std::cin >> std::ws >> gold;", why: "std::ws only skips whitespace. \"abc\" still fails." },
                { t: "std::string gold;", why: "Reading into a string accepts \"abc\", but then gold can't be used in math at all." },
              ],
              answer: 0,
              hints: ["The first failed read is where everything goes wrong.", "Check the read itself with !(std::cin >> ...)."],
              short: "Check each read right away; a failed read jams all later reads.",
              explain: "A failed read sets gold to 0 and puts cin in the fail state, so every later read also fails. Check each read right away and stop on failure.",
              sideBySide: {
                unsafe: C`
std::cin >> gold;    // "abc": gold = 0, cin jammed
std::cin >> party;   // fails too: party stays 0`,
                hardened: C`
if (!(std::cin >> gold)) {
    std::cout << "Not a number!\n";
    return 1;
}`,
              },
            },
          },
          {
            input: "-50", label: "Negative gold!",
            challenge: {
              id: "w3.p.a3", type: "harden", tags: ["w3.validate", "w3.compare"],
              prompt: "-50 gold split among 3 gives each hero -16 and leaves -2 in the chest. Nonsense! Pick the check.",
              code: C`
std::cout << "Total gold: ";
if (!(std::cin >> gold) || ___) {
    std::cout << "Gold must be a whole number, 0 or more.\n";
    return 1;
}`,
              options: [
                { t: "gold < 0", why: "Correct: rejects negatives but still allows an empty chest (0 gold is sad, but valid)." },
                { t: "gold <= 0", why: "Rejects a legitimately empty chest. 0 / party is fine: everyone gets 0." },
                { t: "gold > 0", why: "Inverted: rejects every real haul and lets negatives in." },
                { t: "gold == -50", why: "Only blocks this exact attack. -51 walks right through." },
              ],
              answer: 0,
              hints: ["Which values are impossible for a pile of coins?", "Is 0 gold impossible, or just disappointing?"],
              short: "gold < 0 rejects negatives but allows an empty chest.",
              explain: "Negative gold isn't UB, but it's garbage in, garbage out: -50 / 3 = -16 and -50 % 3 = -2. Validate the range: `gold < 0` is invalid.",
              sideBySide: {
                unsafe: C`
if (!(std::cin >> gold)) {
    return 1;
}   // -50 slips through`,
                hardened: C`
if (!(std::cin >> gold) || gold < 0) {
    std::cout << "Gold must be a whole number, 0 or more.\n";
    return 1;
}`,
              },
            },
          },
        ],
      },
    },

    /* ================================== Boss ================================== */
    boss: {
      id: "w3.boss", name: "The Input Golem", art: "golem",
      hp: 7,
      intro: "RUMBLE. I AM THE INPUT GOLEM. I EAT NEGATIVES, HUGE NUMBERS, AND \"abc\".",
      taunt: [
        "YOU FORGOT TO CHECK cin. I CAN FEEL IT.",
        "DIVIDE BY ME. I AM ZERO.",
        "2147483647 PLUS ONE. WHAT COULD GO WRONG?",
        "I HAVE A NEWLINE LEFT OVER JUST FOR YOUR getline.",
      ],
      rounds: [
        {
          id: "w3.boss.r1", type: "predict", tags: ["w3.arith", "w3.modulo"],
          prompt: "The Golem hurls a division. What does this print?",
          code: C`
#include <iostream>

int main() {
    std::cout << 20 % 6 << ' ' << 20 / 6 << '\n';
    return 0;
}`,
          options: [
            { t: "2 3\n", why: "Correct: 20 % 6 is 2, 20 / 6 is 3, printed in that order." },
            { t: "3 2\n", why: "The order is swapped: % comes first in the chain." },
            { t: "2 3.33\n", why: "int / int is integer division: 3." },
            { t: "2 4\n", why: "Integer division truncates; 3.33 never rounds up to 4." },
          ],
          answer: 0,
          hints: ["Read the chain left to right: which comes first?", "6 * 3 = 18. What's left from 20?"],
          short: "20 % 6 = 2 prints first, then 20 / 6 = 3.",
          explain: "20 % 6 = 2, 20 / 6 = 3. Printed in that order with a space: \"2 3\" and a newline.",
        },
        {
          id: "w3.boss.r2", type: "mcq", tags: ["w3.precedence", "w3.arith"],
          prompt: "What value does this expression have? (All ints.)",
          code: C`2 + 10 / 4 * 2`,
          options: [
            { t: "6", why: "Correct: 10 / 4 = 2 (int), 2 * 2 = 4, then 2 + 4 = 6." },
            { t: "7", why: "That uses real division (2.5 * 2 = 5). With ints, 10 / 4 is 2." },
            { t: "3", why: "That's 2 + 10 / (4 * 2). Left to right, / happens before *." },
            { t: "8", why: "That rounds 10 / 4 up to 3. Integer division truncates." },
          ],
          answer: 0,
          hints: ["/ and * before +, left to right.", "10 / 4 with ints is 2, not 2.5."],
          short: "10 / 4 = 2, times 2 is 4, plus 2 is 6.",
          explain: "Precedence: 10 / 4 = 2, then 2 * 2 = 4, then 2 + 4 = 6.",
        },
        {
          id: "w3.boss.r3", type: "predict", tags: ["w3.incdec", "w3.arith"],
          prompt: "What does this print?",
          code: C`
#include <iostream>

int main() {
    int a = 2;
    int b = a++ * 3;
    std::cout << a << ' ' << b << '\n';
    return 0;
}`,
          options: [
            { t: "3 6\n", why: "Correct: a++ hands over the old value 2 (so b = 6), then a becomes 3." },
            { t: "3 9\n", why: "Postfix uses the OLD value in the expression: 2 * 3, not 3 * 3." },
            { t: "2 6\n", why: "a++ really does increment a, so it prints 3." },
            { t: "3 7\n", why: "The ++ adds to a, not to the product." },
          ],
          answer: 0,
          hints: ["Postfix: old value now, increment afterward.", "a is modified once here, so this is well-defined."],
          short: "a++ gives the old 2, so b = 6; then a = 3.",
          explain: "b = (old a) * 3 = 2 * 3 = 6, and a becomes 3. Output: \"3 6\" and a newline.",
        },
        {
          id: "w3.boss.r4", type: "predict", tags: ["w3.logic", "w3.incdec"],
          prompt: "The Golem tests your short-circuit skills. What does this print?",
          code: C`
#include <iostream>

int main() {
    int keys = 0;
    bool open = (keys > 0) || (++keys > 0);
    std::cout << open << keys << '\n';
    return 0;
}`,
          options: [
            { t: "11\n", why: "Correct: left is false, so || runs ++keys: keys is 1, and 1 > 0." },
            { t: "10\n", why: "|| only skips the right side when the LEFT side is true. Here it's false, so ++keys runs." },
            { t: "01\n", why: "The right side is true, so open is true (1)." },
            { t: "true1\n", why: "Without std::boolalpha, true prints as 1." },
          ],
          answer: 0,
          hints: ["When does || skip its right side?", "0 > 0 is false, so the right side has to run."],
          short: "Left side false, so || runs ++keys: prints 1 and 1.",
          explain: "0 > 0 is false, so || evaluates the right: keys becomes 1, 1 > 0 is true. open prints 1, keys prints 1: \"11\" and a newline.",
        },
        {
          id: "w3.boss.r5", type: "predict", tags: ["w3.cin", "w3.validate"], bug: "cin-fail",
          prompt: "The Golem types `abc`. What does this print? (Modern C++.)",
          code: C`
#include <iostream>

int main() {
    int n = 7;
    std::cin >> n;
    std::cout << n << ' ' << std::cin.fail() << '\n';
    return 0;
}`,
          options: [
            { t: "0 1\n", why: "Correct: since C++11, a failed number read stores 0, and cin.fail() is true (prints 1)." },
            { t: "7 1\n", why: "That was the old C++98 behavior. Since C++11, a failed read overwrites n with 0." },
            { t: "7 0\n", why: "The read definitely failed, so fail() is true." },
            { t: "abc 1\n", why: "n is an int; it can't hold text." },
          ],
          answer: 0,
          hints: ["What does a failed int read store, since C++11?", "fail() returns a bool; how do bools print?"],
          short: "A failed int read stores 0 and sets the fail state.",
          explain: "\"abc\" can't be parsed as an int, so n is set to 0 and the failbit is set. Output: \"0 1\" and a newline. Never use a value from a failed read.",
        },
        {
          id: "w3.boss.r6", type: "speed", tags: ["w3.arith", "w3.logic", "w3.compare", "w3.incdec", "w3.cin"],
          prompt: "SPEED ROUND! The Golem is charging. Answer fast!",
          seconds: 45,
          items: [
            { q: "What is the value? (ints)", code: "7 / 2 * 2", options: ["7", "6", "3"], answer: 1 },
            { q: "What does this print?", code: "std::cout << (true || false && false);", options: ["1", "0", "true"], answer: 0 },
            { q: "What is h now?", code: "int h = 9;\nh %= 4;", options: ["2", "2.25", "1"], answer: 2 },
            { q: "Input is `42abc`. What is n after the read?", code: "int n{};\nstd::cin >> n;", options: ["42", "0", "abc"], answer: 0 },
            { q: "What does this print?", code: "std::cout << !(3 > 2);", options: ["1", "0", "-1"], answer: 1 },
            { q: "What is w?", code: "int v = 5;\nint w = --v;", options: ["5", "4", "6"], answer: 1 },
            { q: "What does this print?", code: "std::cout << (5 != 5 || 2 < 3);", options: ["1", "0", "false"], answer: 0 },
          ],
          hints: ["Ints drop fractions; bools print as 1/0.", ">> reads as much of a number as it can, then stops."],
          short: "Ints drop fractions, bools print 1/0, >> stops at the first non-digit.",
          explain: "7 / 2 * 2 = 3 * 2 = 6; && first gives true; 9 % 4 = 1; >> reads 42 and leaves \"abc\" for later (no failure yet); !(true) is 0; prefix gives 4; false || true is 1.",
        },
        {
          id: "w3.boss.r7", type: "bug", tags: ["w3.incdec"], unsafe: true,
          prompt: "UNSAFE: the Golem snuck undefined behavior into the turn counter. Tap the buggy line, then pick the fix. (Goal: add this turn and the next, then advance two turns.)",
          code: C`
int turn = 1;
int next = turn++ + turn++;
std::cout << next << ' ' << turn << '\n';`,
          bugLine: 1,
          options: [
            { t: "int next = turn + (turn + 1); turn += 2;", why: "Correct: reads turn without changing it, then modifies it once in its own statement. next = 3, turn = 3." },
            { t: "int next = ++turn + ++turn;", why: "Still two unsequenced modifications of turn: still UB." },
            { t: "int next = (turn++) + (turn++);", why: "Parentheses group, they don't sequence. Still UB." },
            { t: "int next = turn++ + turn;", why: "Modifies turn and reads it again, unsequenced: still UB." },
          ],
          answer: 0,
          hints: ["How many times is turn modified in one expression?", "Split the reading and the changing into separate statements."],
          short: "Two ++ on turn in one expression is UB. Split it up.",
          explain: "Two ++ on the same variable in one expression is undefined behavior: different compilers print different results, and none are wrong. Read first, modify on a separate statement.",
          sideBySide: {
            unsafe: C`int next = turn++ + turn++;   // UB`,
            hardened: C`
int next = turn + (turn + 1);
turn += 2;`,
          },
        },
        {
          id: "w3.boss.r8", type: "harden", tags: ["w3.validate", "w3.logic"], bug: "cin-fail",
          prompt: "Pick the condition that rejects bad text AND impossible ages (valid: 0 to 150).",
          code: C`
#include <iostream>

int main() {
    int age{};
    std::cout << "Age: ";
    if (___) {
        std::cout << "Invalid age\n";
        return 1;
    }
    std::cout << "Age accepted: " << age << '\n';
    return 0;
}`,
          options: [
            { t: "!(std::cin >> age) || age < 0 || age > 150", why: "Correct: reads first; if the read fails, || short-circuits straight to \"invalid\". Otherwise the range is checked." },
            { t: "!(std::cin >> age) && age < 0", why: "&& needs BOTH: \"abc\" gives 0, 0 < 0 is false, so it's accepted." },
            { t: "std::cin >> age || age < 0", why: "Inverted: a successful read makes the whole thing true, so every good age is rejected." },
            { t: "age < 0 || age > 150 || !(std::cin >> age)", why: "Checks age BEFORE reading it (it's still 0). Then -5 is read successfully and never range-checked." },
          ],
          answer: 0,
          hints: ["You must read before you can check the value.", "|| short-circuits: put the read on the far left."],
          short: "Read first, then check the range; || short-circuits on failure.",
          explain: "Order matters with short-circuiting: the read goes first, then the range checks run only on a successfully read value.",
          sideBySide: {
            unsafe: C`
std::cin >> age;
std::cout << "Age accepted: " << age << '\n';`,
            hardened: C`
if (!(std::cin >> age) || age < 0 || age > 150) {
    std::cout << "Invalid age\n";
    return 1;
}
std::cout << "Age accepted: " << age << '\n';`,
          },
        },
        {
          id: "w3.boss.r9", type: "edge", tags: ["w3.overflow"], unsafe: true,
          prompt: "This adds a bonus to a score (both ints, 32-bit). Which test inputs expose overflow? Select all that apply.",
          code: C`int total = score + bonus;`,
          options: [
            { t: "score 2147483647, bonus 1", why: "Exposes it: one past the largest int is signed overflow (UB)." },
            { t: "score -2147483648, bonus -1", why: "Exposes it: one below the smallest int overflows the other way (UB)." },
            { t: "score 100, bonus 50", why: "150 fits easily. No problem." },
            { t: "score 2000000000, bonus 2000000000", why: "Exposes it: 4 billion is far beyond the largest int (about 2.1 billion)." },
            { t: "score 0, bonus -5", why: "-5 fits fine. Negative isn't the problem; crossing the limits is." },
          ],
          answers: [0, 1, 3],
          hints: ["The largest 32-bit int is 2147483647 and the smallest is -2147483648.", "Test both ends: too big AND too small."],
          short: "Test both int limits: too big and too small.",
          explain: "Good edge tests push against BOTH limits. Check before adding, on the safe side of the math.",
          sideBySide: {
            unsafe: C`int total = score + bonus;`,
            hardened: C`
#include <limits>

if ((bonus > 0 && score > std::numeric_limits<int>::max() - bonus) ||
    (bonus < 0 && score < std::numeric_limits<int>::min() - bonus)) {
    std::cout << "Score out of range!\n";
    return 1;
}
int total = score + bonus;`,
          },
        },
      ],
      defense: [
        {
          attack: "-5", label: "Negative number!",
          challenge: {
            id: "w3.boss.d1", type: "harden", tags: ["w3.validate", "w3.compare"],
            prompt: "The Golem orders -5 potions to get paid 125 gold! Pick the check.",
            code: C`
int potions{};
if (!(std::cin >> potions) || ___) {
    std::cout << "Invalid amount\n";
    return 1;
}
int cost = potions * 25;`,
            options: [
              { t: "potions < 0", why: "Correct: rejects every negative amount; 0 potions is a valid (if boring) order." },
              { t: "potions > 0", why: "Inverted: rejects every real order and lets negatives through." },
              { t: "potions == -5", why: "Only blocks this exact attack. The Golem just tries -6." },
              { t: "potions != 0", why: "Rejects every non-empty order, valid or not." },
            ],
            answer: 0,
            hints: ["What values are impossible for a quantity?", "Block a whole range, not one value."],
            short: "Reject the whole negative range: potions < 0.",
            explain: "Validate the range, not specific values: potions < 0 is always invalid.",
            sideBySide: {
              unsafe: C`
std::cin >> potions;
int cost = potions * 25;   // -5 potions = -125 cost`,
              hardened: C`
if (!(std::cin >> potions) || potions < 0) {
    std::cout << "Invalid amount\n";
    return 1;
}
int cost = potions * 25;`,
            },
          },
        },
        {
          attack: "2147483647", label: "Huge value!",
          challenge: {
            id: "w3.boss.d2", type: "breakit", tags: ["w3.overflow", "w3.validate"], unsafe: true,
            prompt: "UNSAFE: this checks bad text and negatives. Which input still breaks it? (32-bit int.)",
            code: C`
int potions{};
if (!(std::cin >> potions) || potions < 0) {
    std::cout << "Invalid amount\n";
    return 1;
}
int cost = potions * 25;`,
            options: [
              { t: "2147483647", why: "Correct: it's a valid int, so the read succeeds, but potions * 25 overflows: UB." },
              { t: "abc", why: "Caught: the read fails and the program exits." },
              { t: "-5", why: "Caught by potions < 0." },
              { t: "0", why: "0 * 25 = 0. Perfectly fine." },
            ],
            answer: 0,
            hints: ["Which input passes both checks?", "What happens when a big number is multiplied?"],
            short: "2147483647 passes validation, but * 25 overflows.",
            explain: "The largest int fits, so it passes validation, but multiplying by 25 goes way past the limit: signed overflow is UB. Cap the input so the math can't overflow.",
            sideBySide: {
              unsafe: C`int cost = potions * 25;   // huge potions: UB`,
              hardened: C`
#include <limits>

if (!(std::cin >> potions) || potions < 0 ||
    potions > std::numeric_limits<int>::max() / 25) {
    std::cout << "Invalid amount\n";
    return 1;
}
int cost = potions * 25;`,
            },
          },
        },
        {
          attack: "abc", label: "Text instead of a number!",
          challenge: {
            id: "w3.boss.d3", type: "harden", tags: ["w3.validate", "w3.cin"], bug: "cin-fail",
            prompt: "The Golem types `abc`. Pick the condition that detects it so we can recover.",
            code: C`
#include <iostream>
#include <limits>

int main() {
    int damage{};
    std::cin >> damage;
    if (___) {
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        std::cout << "Numbers only, Golem!\n";
        return 1;
    }
    std::cout << "Damage: " << damage << '\n';
    return 0;
}`,
            options: [
              { t: "std::cin.fail()", why: "Correct: fail() is true after a failed read, exactly when \"abc\" was typed." },
              { t: "damage == 0", why: "A real 0 would trigger it too; the value alone can't tell \"0\" from \"abc\". Check the stream." },
              { t: "std::cin.eof()", why: "eof() means input ended. \"abc\" sets the failbit, not eof." },
              { t: "!std::cin.clear()", why: "clear() returns nothing (void), so this doesn't compile. And clearing isn't checking." },
            ],
            answer: 0,
            hints: ["The stream remembers whether the last read worked.", "Ask the stream, not the variable."],
            short: "Ask the stream: std::cin.fail() is true after a bad read.",
            explain: "After a failed extraction, cin.fail() is true. Then clear() + ignore() restore the stream. (Writing `if (!(std::cin >> damage))` does the read and check in one step.)",
            sideBySide: {
              unsafe: C`
std::cin >> damage;
std::cout << "Damage: " << damage << '\n';   // "abc" shows 0`,
              hardened: C`
std::cin >> damage;
if (std::cin.fail()) {
    std::cin.clear();
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    std::cout << "Numbers only, Golem!\n";
    return 1;
}`,
            },
          },
        },
        {
          attack: "0", label: "Zero golems to split among!",
          challenge: {
            id: "w3.boss.d4", type: "harden", tags: ["w3.divzero", "w3.validate"],
            prompt: "Split crystal shards among golems. The Golem enters 0 golems. Pick the guard.",
            code: C`
int shards{};
int golems{};
if (!(std::cin >> shards >> golems)) {
    return 1;
}
if (___) {
    std::cout << "Need at least one golem!\n";
    return 1;
}
std::cout << shards / golems << ' ' << shards % golems << '\n';`,
            options: [
              { t: "golems <= 0", why: "Correct: blocks division by zero, and negatives too (which also closes the sneaky smallest-int / -1 overflow)." },
              { t: "shards == 0", why: "Wrong variable: 0 / 3 is fine. The divisor is what matters." },
              { t: "golems > 0", why: "Inverted: rejects every valid split and lets 0 through." },
              { t: "golems == 0 && shards == 0", why: "Only blocks when BOTH are 0. 10 shards / 0 golems still divides by zero." },
            ],
            answer: 0,
            hints: ["Which variable is the divisor?", "Only positive counts make sense here."],
            short: "Check the divisor: golems <= 0 means no split.",
            explain: "Both / and % by zero are UB. Check the divisor before either one runs: golems <= 0 means no split.",
            sideBySide: {
              unsafe: C`std::cout << shards / golems << ' ' << shards % golems << '\n';`,
              hardened: C`
if (golems <= 0) {
    std::cout << "Need at least one golem!\n";
    return 1;
}
std::cout << shards / golems << ' ' << shards % golems << '\n';`,
            },
          },
        },
      ],
      victory: "CRACK... CRUMBLE... \"input... validated...\" The Golem falls apart into neat integers.",
      reward: { xp: 200, cosmetic: "golem-helm", bug: "cin-fail" },
    },
  });
})();
