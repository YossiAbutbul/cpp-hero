/**
 * Extract every C++ snippet from the parsed content, with what the checker
 * expects of it, and turn fragments into compilable programs.
 *
 * Snippets: demo code, challenge code (fill/harden with the correct answer
 * substituted), order lines, write answers, sideBySide hardened + unsafe,
 * safe/speed round items, vault cards, the project program.
 */
import type { ParsedFile } from '../../src/content/load.ts';
import type { Challenge, Expect } from '../../src/content/schema.ts';
import { walkChallenges } from '../../src/content/walk.ts';

/** "compiles" = clean or with warnings (default for unsafe snippets). */
export type Expectation = Exclude<Expect, 'skip'> | 'compiles';

export interface Snippet {
  /** Stable unique name, e.g. w1.l1.c5.code, w1.l1.c5.sbs.hardened, vault.w1.hello */
  key: string;
  file: string;
  /** YAML path of the field holding the code. */
  yamlPath: string;
  expect: Expectation;
  source: string;
  /** Present when the program must also be run and its stdout compared. */
  run?: { stdin: string[]; expected: string };
  /** True when `source` was generated around a fragment. */
  wrapped: boolean;
}

const INCLUDE_RE = /^\s*#\s*include\b/;
/** Headers every fragment gets, so short items don't need visible #include lines. */
export const STD_INCLUDES = [
  '<algorithm>',
  '<array>',
  '<cassert>',
  '<climits>',
  '<cmath>',
  '<cstddef>',
  '<cstdint>',
  '<iomanip>',
  '<iostream>',
  '<limits>',
  '<map>',
  '<memory>',
  '<numeric>',
  '<optional>',
  '<set>',
  '<stdexcept>',
  '<string>',
  '<utility>',
  '<vector>',
];

/** Heuristic: is this a whole program (has its own main)? */
const isProgram = (code: string) => /\bint\s+main\s*\(/.test(code);

const NOT_A_TYPE = /^(if|for|while|switch|return|else|do|case|catch|try|throw|delete|new|co_return)$/;
/**
 * First line of a top-level function definition (at column 0):
 *   [[nodiscard]] static int heal(int hp, int amount) const noexcept -> int {
 * i.e. a return type + a name, a parameter list, then `{` (or nothing, with `{`
 * on the next line). Not a call, a control statement or a lambda.
 */
function isFunctionHead(line: string, next: string | undefined): boolean {
  if (/^\s/.test(line)) return false;
  const m = /^(?:\[\[[^\]]*\]\]\s*)*([A-Za-z_][\w:<>,*&\s]*?)(?:\s+|\s*[*&]+\s*)([A-Za-z_][\w:]*|operator\S+)\s*\((.*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:->\s*[\w:<>*&\s]+)?(\{.*)?$/.exec(
    line.replace(/\/\/.*$/, '').trimEnd(),
  );
  if (!m) return false;
  const typeWords = m[1]!.trim().split(/\s+/);
  if (NOT_A_TYPE.test(typeWords[0]!) || typeWords.some((w) => w.includes('='))) return false;
  if (m[4] !== undefined) return true;
  return next !== undefined && /^\{/.test(next.trim());
}

/** Top-level type definitions (struct/class/enum ... {) belong at file scope with the functions. */
const isTypeHead = (line: string) =>
  /^(?:template\s*<.*>\s*)?(struct|class|enum|union)\b/.test(line) && (/\{/.test(line) || !/;\s*$/.test(line));

/**
 * Split a fragment into top-level definitions (functions, types, with any
 * `template <...>` line before them) and the remaining lines, in order.
 * Braces are counted per line, ignoring comments, strings and char literals.
 */
export function splitTopLevel(code: string): { defs: string[]; rest: string[] } {
  const lines = code.split('\n');
  const defs: string[] = [];
  const rest: string[] = [];
  const depth = (l: string) => {
    const s = l
      .replace(/\/\/.*$/, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/'(?:\\.|[^'\\])*'/g, "''");
    return (s.match(/\{/g)?.length ?? 0) - (s.match(/\}/g)?.length ?? 0);
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const tmpl = /^template\s*<.*>\s*$/.test(line) ? 1 : 0;
    const head = lines[i + tmpl];
    if (head !== undefined && (isFunctionHead(head, lines[i + tmpl + 1]) || isTypeHead(head))) {
      let d = 0;
      let j = i;
      let opened = false;
      for (; j < lines.length; j++) {
        d += depth(lines[j]!);
        if (/\{/.test(lines[j]!)) opened = true;
        if (opened && d <= 0) break;
      }
      // `struct X { ... };` ends on the closing line; a trailing `;` line is kept with it.
      defs.push(lines.slice(i, j + 1).join('\n'));
      i = j + 1;
      continue;
    }
    rest.push(line);
    i++;
  }
  return { defs, rest };
}

/**
 * A top-level line that can only be a statement (needs to run inside main),
 * not a declaration: output, control flow, a call or an assignment.
 */
const isStatement = (l: string) =>
  /^(std::(cout|cin|cerr|getline)\b|return\b|if\b|for\b|while\b|do\b|switch\b|assert\s*\(|[A-Za-z_][\w.:\->[\]]*\s*(\(|\+\+|--|[+\-*/%]?=[^=]|<<|>>))/.test(
    l.trim(),
  ) && !/^[A-Za-z_][\w:<>,]*\s+[A-Za-z_]/.test(l.trim());

/**
 * Turn a fragment into a program: its #include lines go to the top (after a
 * standard set), everything else goes inside main() after the prelude.
 * A lone expression ("7 / 2 * 2") is printed. Whole programs are kept as
 * they are, with the prelude (e.g. an implied #include) put at the top.
 *
 * Fragments with top-level function (or struct/class/enum) definitions:
 * the definitions go at file scope. If the other lines are only
 * declarations, they (and the prelude) go at file scope too, followed by an
 * empty `int main() {}`; if they include statements (a call, output, ...),
 * the prelude + those lines go inside main() after the definitions.
 */
export function wrapSnippet(code: string, prelude = ''): { source: string; wrapped: boolean } {
  if (isProgram(code)) {
    const src = (prelude ? prelude + '\n' : '') + code;
    return { source: src.endsWith('\n') ? src : src + '\n', wrapped: false };
  }
  const lines = code.split('\n');
  const includes = lines.filter((l) => INCLUDE_RE.test(l));
  const inc = [...STD_INCLUDES.map((h) => `#include ${h}`), ...includes];
  let body = lines.filter((l) => !INCLUDE_RE.test(l)).join('\n');

  const { defs, rest } = splitTopLevel(body);
  if (defs.length) {
    const statements = rest.some(isStatement);
    const source = statements
      ? [...inc, '', ...defs, '', 'int main() {', prelude, ...rest, 'return 0;', '}', '']
      : [...inc, '', prelude, body, '', 'int main() {}', ''];
    return { source: source.join('\n'), wrapped: true };
  }

  const stripped = body
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  const isExpression =
    stripped && !stripped.startsWith('#') && !stripped.includes('\n') && !/[;{}]$/.test(stripped);
  if (isExpression) body = `std::cout << (${stripped}) << '\\n';`;
  return {
    source: [...inc, '', 'int main() {', prelude, body, 'return 0;', '}', ''].join('\n'),
    wrapped: true,
  };
}

const asList = (s: string | string[] | undefined): string[] =>
  s === undefined ? [''] : Array.isArray(s) ? s : [s];

function resolve(explicit: Expect | undefined, unsafe: boolean): Expectation | 'skip' {
  if (explicit) return explicit;
  return unsafe ? 'compiles' : 'clean';
}

export function extractSnippets(parsed: readonly ParsedFile[]): { snippets: Snippet[]; skipped: string[] } {
  const snippets: Snippet[] = [];
  const skipped: string[] = [];

  const add = (
    key: string,
    file: string,
    yamlPath: string,
    code: string | undefined,
    expect: Expectation | 'skip',
    prelude?: string,
    run?: { stdin: string[]; expected: string },
  ) => {
    if (code === undefined || code.trim() === '') return;
    if (expect === 'skip') {
      skipped.push(`${file} › ${yamlPath}`);
      return;
    }
    const { source, wrapped } = wrapSnippet(code, prelude);
    snippets.push({ key, file, yamlPath, expect, source, wrapped, ...(run ? { run } : {}) });
  };

  const challenge = (ch: Challenge, file: string, path: string) => {
    const unsafe = !!ch.unsafe;
    let code = ch.code;
    if (code !== undefined && ch.type === 'fill') code = code.replace('___', ch.accept[0] ?? '');
    if (code !== undefined && ch.type === 'harden')
      code = code.replace('___', ch.options[ch.answer]?.t ?? '');
    const run =
      ch.type === 'predict'
        ? { stdin: asList(ch.stdin), expected: ch.options[ch.answer]?.t ?? '' }
        : undefined;
    add(`${ch.id}.code`, file, `${path}.code`, code, resolve(ch.expect, unsafe), ch.prelude, run);

    if (ch.type === 'order') {
      add(
        `${ch.id}.lines`,
        file,
        `${path}.lines`,
        ch.lines.join('\n'),
        resolve(ch.expect, unsafe),
        ch.prelude,
      );
    }
    if (ch.type === 'write' && ch.code === undefined) {
      ch.accept.forEach((a, i) =>
        add(`${ch.id}.accept${i}`, file, `${path}.accept[${i}]`, a, resolve(ch.expect, unsafe), ch.prelude),
      );
    }
    if (ch.sideBySide) {
      const s = ch.sideBySide;
      const pre = s.prelude ?? ch.prelude;
      add(`${ch.id}.sbs.hardened`, file, `${path}.sideBySide.hardened`, s.hardened, 'clean', pre);
      add(`${ch.id}.sbs.unsafe`, file, `${path}.sideBySide.unsafe`, s.unsafe, resolve(s.expect, true), pre);
    }
    if (ch.type === 'safe') {
      ch.items.forEach((it, i) =>
        add(
          `${ch.id}.item${i}`,
          file,
          `${path}.items[${i}].code`,
          it.code,
          resolve(it.expect, !it.safe),
          it.prelude,
        ),
      );
    }
    if (ch.type === 'speed') {
      ch.items.forEach((it, i) =>
        add(
          `${ch.id}.item${i}`,
          file,
          `${path}.items[${i}].code`,
          it.code,
          resolve(it.expect, unsafe),
          it.prelude,
        ),
      );
    }
  };

  for (const p of parsed) {
    if (p.kind === 'lesson') {
      const l = p.data;
      if (l.demo) {
        const d = l.demo;
        // A demo with crash steps shows unsafe behavior on purpose: it only has to compile.
        const unsafe = d.steps.some((s) => s.crash !== undefined);
        const expected = d.steps.map((s) => s.out ?? '').join('');
        const run = !unsafe && expected ? { stdin: asList(d.stdin), expected } : undefined;
        add(`${l.id}.demo`, p.path, 'demo.code', d.code, resolve(d.expect, unsafe), d.prelude, run);
      }
      l.vault.forEach((v, i) =>
        add(`vault.${v.id}`, p.path, `vault[${i}].code`, v.code, resolve(v.expect, false), v.prelude),
      );
    }
    if (p.kind === 'project') {
      add(`${p.data.id}.program`, p.path, 'program', p.data.program, 'clean', undefined, undefined);
    }
  }
  for (const loc of walkChallenges(parsed)) challenge(loc.ch, loc.file, loc.path);
  return { snippets, skipped };
}
