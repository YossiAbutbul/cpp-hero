import { describe, expect, it } from 'vitest';
import { readContentFiles } from '../../scripts/lib/content-fs';
import { formatIssue, loadContent, type SourceFile } from './load';

/**
 * The real content, limited to finished worlds (1..n with a boss.yaml), so
 * worlds that are still being written don't break these tests.
 */
const real = (() => {
  const files = readContentFiles();
  const done = new Set(files.map((f) => /^content\/worlds\/(\d{2})-[^/]+\/boss\.yaml$/.exec(f.path)?.[1]).filter(Boolean));
  let last = 0;
  while (done.has(String(last + 1).padStart(2, '0'))) last++;
  return files.filter((f) => {
    const m = /^content\/worlds\/(\d{2})-/.exec(f.path);
    return !m || Number(m[1]) <= last;
  });
})();

/** The real content with one file's text transformed. */
function withEdit(path: string, edit: (text: string) => string): SourceFile[] {
  const hit = real.find((f) => f.path === path);
  if (!hit) throw new Error('no such file ' + path);
  return real.map((f) => (f.path === path ? { ...f, text: edit(f.text) } : f));
}
const L1 = 'content/worlds/01-hello-world/lesson-01.yaml';
const messages = (files: SourceFile[]) => loadContent(files).issues.map(formatIssue);

describe('content loader', { timeout: 60_000 }, () => {
  it('loads and validates the real content', () => {
    const r = loadContent(real);
    expect(r.issues).toEqual([]);
    const worlds = r.content?.worlds ?? [];
    expect(worlds.length).toBeGreaterThanOrEqual(8);
    expect(worlds.map((w) => w.num)).toEqual(worlds.map((_, i) => i + 1)); // contiguous 1..n
    expect(worlds.map((w) => w.id)).toEqual(worlds.map((w) => `w${w.num}`));
    expect(new Set(worlds.map((w) => w.id)).size).toBe(worlds.length);
    expect(r.content?.worlds[0]?.lessons.map((l) => l.id)).toEqual(['w1.l1', 'w1.l2', 'w1.l3', 'w1.l4', 'w1.l5', 'w1.l6']);
    expect(r.content?.worlds[0]?.story.intro.length).toBeGreaterThan(1);
    expect(r.content?.bestiary.length).toBe(30);
  });

  it('keeps C++ code and exact outputs byte for byte', () => {
    const w1 = loadContent(real).content!.worlds[0]!;
    const c2 = w1.lessons[0]!.challenges[1]!;
    expect(c2.type).toBe('predict');
    if (c2.type !== 'predict') return;
    expect(c2.code).toContain('std::cout << "!\\n";'); // backslash-n stays two characters in code
    expect(c2.options[c2.answer]!.t).toBe('Hi!\n'); // real newline in the output
  });

  it('reports out-of-range answers with file and YAML path', () => {
    const msgs = messages(withEdit(L1, (t) => t.replace(/^ {4}answer: 1$/m, '    answer: 9')));
    expect(msgs).toContain(`${L1} › challenges[0].answer: out of range (9; there are 4 options, 0-based)`);
  });

  it('reports unknown keys (typos) and missing fields', () => {
    const msgs = messages(withEdit(L1, (t) => t.replace('    prompt: When you run', '    promt: When you run')));
    expect(msgs).toContain(`${L1} › challenges[0]: Unrecognized key: "promt"`);
    expect(msgs.some((m) => m.startsWith(`${L1} › challenges[0].prompt:`))).toBe(true);
  });

  it('reports fill snippets without exactly one ___', () => {
    const msgs = messages(withEdit(L1, (t) => t.replace('int ___() {', 'int main() {')));
    expect(msgs).toContain(`${L1} › challenges[3].code: fill code needs exactly one ___ (found 0)`);
  });

  it('reports duplicate ids and bad references', () => {
    const msgs = messages(
      withEdit(L1, (t) => t.replace('  - id: w1.l1.c2', '  - id: w1.l1.c1').replace('bug: missing-semicolon', 'bug: nope')),
    );
    expect(msgs.some((m) => /duplicate challenge id "w1\.l1\.c1"/.test(m))).toBe(true);
    expect(msgs.some((m) => /bug "nope" does not exist in bestiary\.yaml/.test(m))).toBe(true);
  });

  it('enforces text-length limits', () => {
    const long = 'word '.repeat(30).trim();
    const msgs = messages(withEdit(L1, (t) => t.replace('short: Execution always begins inside main().', `short: ${long}`)));
    expect(msgs).toContain(`${L1} › challenges[0].short: short is 30 words; keep it at most 15`);
  });

  it('reports YAML syntax errors and unexpected files', () => {
    const msgs = messages([...withEdit(L1, (t) => t + '\n  : : bad'), { path: 'content/worlds/notes.yaml', text: 'x: 1' }]);
    expect(msgs.some((m) => m.startsWith(`${L1}: YAML syntax:`))).toBe(true);
    expect(msgs.some((m) => m.startsWith('content/worlds/notes.yaml: unexpected file'))).toBe(true);
  });

  it('checks review tags and world-named tags across worlds', () => {
    const L2 = 'content/worlds/02-variables-types/lesson-01.yaml';
    let msgs = messages(withEdit(L2, (t) => t.replace(/^reviewTags: \[/m, 'reviewTags: [w3.cin, w1.nope, ')));
    expect(msgs).toContain(`${L2} › reviewTags[0]: "w3.cin" belongs to a later world; review only earlier or current worlds`);
    expect(msgs).toContain(`${L2} › reviewTags[1]: no challenge has the tag "w1.nope"`);
    msgs = messages(withEdit(L2, (t) => t.replace(/^( {4}tags: \[)/m, '$1w1.guessed, ')));
    expect(msgs).toContain(
      `${L2} › challenges[0].tags[0]: no World 1 challenge has the tag "w1.guessed"; use an existing w1.* tag`,
    );
  });

  it('requires hierarchical ids that match the file', () => {
    const msgs = messages(withEdit(L1, (t) => t.replace(/^id: w1\.l1$/m, 'id: w1.l9')));
    expect(msgs).toContain(`${L1} › id: must be "w1.l1" to match the file name`);
  });
});
