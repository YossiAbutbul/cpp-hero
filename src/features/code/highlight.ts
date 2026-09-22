/**
 * C++ (+ shell command) line highlighter, ported from legacy
 * engine/codeview.js. Pure: returns tokens; <CodeBlock/> renders them.
 *
 * Token types: kw keyword, ty builtin type, ns `std`, lib name after std::,
 * st string/char literal, nu number, cm comment, pp preprocessor, pu
 * punctuation, id identifier, ws whitespace, lead = the line's leading
 * indentation (drawn as padding for the hanging indent), sh = a whole shell
 * command line, blank = a "___" fill-in slot (may sit inside a string).
 */

const KW = new Set(
  (
    'return if else for while do switch case default break continue const constexpr consteval constinit true false auto nullptr new delete ' +
    'class struct public private protected virtual override final template typename namespace using try catch throw noexcept static explicit ' +
    'this operator enum sizeof static_assert static_cast dynamic_cast reinterpret_cast const_cast inline friend mutable typedef goto volatile extern ' +
    'co_await co_return co_yield requires concept decltype alignas alignof thread_local export import module'
  ).split(' '),
);
const TY = new Set(
  'int bool char double float void long short unsigned signed size_t wchar_t char8_t char16_t char32_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t ptrdiff_t'.split(
    ' ',
  ),
);

export type TokType = 'kw' | 'ty' | 'ns' | 'lib' | 'st' | 'nu' | 'cm' | 'pp' | 'pu' | 'id' | 'ws' | 'lead' | 'sh' | 'blank';
export interface Tok {
  t: TokType;
  v: string;
}

const SHELL = /^\s*(\$\s|g\+\+\s|clang\+\+\s|c\+\+\s|\.\/|cmake\s|make\b)/;
const MARK = '\u0001';

/** Tokenize one line of C++ (no blank handling). */
export function tokLine(src: string): Tok[] {
  const out: Tok[] = [];
  // MARK (a "___" blank, swapped in by highlightLine) is matched by group 7
  const re = new RegExp(
    String.raw`(\/\/.*$)|(\/\*.*?\*\/)|(#\s*\w+(?:\s*<[^>]*>)?)|("(?:\\.|[^"\\])*"?)|('(?:\\.|[^'\\])*'?)|(\b\d[\d']*\.?\d*(?:[eE][+-]?\d+)?[fFuUlL]*\b|\.\d+\b)|(` +
      MARK +
      String.raw`)|([A-Za-z_]\w*)|(\s+)|(.)`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let t: TokType;
    if (m[1] || m[2]) t = 'cm';
    else if (m[3]) t = 'pp';
    else if (m[4] || m[5]) t = 'st';
    else if (m[6]) t = 'nu';
    else if (m[7]) t = 'blank';
    else if (m[8]) {
      const w = m[8];
      t = KW.has(w) ? 'kw' : TY.has(w) ? 'ty' : w === 'std' ? 'ns' : 'id';
      if (t === 'id') {
        const n = out.length;
        if (n >= 3 && out[n - 1]!.v === ':' && out[n - 2]!.v === ':' && out[n - 3]!.t === 'ns') t = 'lib';
      }
    } else if (m[9]) t = 'ws';
    else t = 'pu';
    out.push({ t, v: m[0] });
    if (m[0] === '') re.lastIndex++;
  }
  return out;
}

export const isShellLine = (src: string) => SHELL.test(src);

/**
 * Highlight one line. `limit` = characters of the source to show (typing
 * effect; a "___" counts as its 3 characters). Blanks may sit anywhere,
 * even inside string literals: they come out as their own { t: 'blank' }.
 */
export function highlightLine(src: string, limit?: number): Tok[] {
  const blanks = src.split('___').length - 1;
  const marked = blanks ? src.replace(/___/g, MARK) : src;
  let lim = limit;
  if (lim != null && blanks) lim = Math.max(0, lim - (src.slice(0, lim).split('___').length - 1) * 2);

  let toks: Tok[];
  if (isShellLine(src)) {
    toks = [{ t: 'sh', v: marked }];
  } else {
    toks = tokLine(marked);
    if (toks[0]?.t === 'ws') toks[0] = { t: 'lead', v: toks[0].v };
  }
  // truncate
  if (lim != null) {
    const cut: Tok[] = [];
    let left = lim;
    for (const tk of toks) {
      if (left <= 0) break;
      const part = tk.v.slice(0, left);
      left -= part.length;
      cut.push({ t: tk.t, v: part });
    }
    toks = cut;
  }
  if (!blanks) return toks;
  // split marker chars out of tokens (blank inside a string, shell line…)
  const out: Tok[] = [];
  for (const tk of toks) {
    if (tk.t === 'blank' || !tk.v.includes(MARK)) {
      out.push(tk.t === 'blank' ? { t: 'blank', v: '___' } : tk);
      continue;
    }
    tk.v.split(MARK).forEach((piece, i) => {
      if (i) out.push({ t: 'blank', v: '___' });
      if (piece) out.push({ t: tk.t, v: piece });
    });
  }
  return out;
}

/** Indentation width of a line in columns (tabs = 4). */
export const indentOf = (line: string): number => (/^[ \t]*/.exec(line)?.[0] ?? '').replace(/\t/g, '    ').length;

/** Split source into lines (CRLF-safe). */
export const splitLines = (src: string | null | undefined): string[] =>
  String(src ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
