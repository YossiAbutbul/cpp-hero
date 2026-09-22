/**
 * npm run check:cpp — compile (and run) every C++ snippet in content/.
 *
 * Compiler: g++ -std=c++20 -Wall -Wextra
 *   - on Windows via WSL (distro from $CHECK_CPP_WSL_DISTRO, default "Ubuntu"),
 *   - otherwise (or when WSL is unavailable) a local g++ / clang++ on PATH,
 *   - none found → warning and exit 0 (so the check never blocks machines
 *     without a compiler; CI should have one).
 *
 * Rules (see `expect` in src/content/schema.ts):
 *   clean snippets    must compile with no warnings
 *   unsafe snippets   must compile (warnings allowed)
 *   expect: warn      must compile with a warning
 *   expect: error     must NOT compile (intentionally broken)
 *   predict           the program's stdout (fed `stdin`) must equal the correct option byte for byte
 *   demo              stdout must equal the concatenated `out` of its steps (when it has any)
 * Fragments (no main) are wrapped in a main() with common includes; unused
 * variable warnings are ignored for them.
 *
 * Options: --keep (leave .cpp-check/ for inspection), --filter <substring>
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { formatIssue } from '../src/content/load.ts';
import { loadContentFromDisk, REPO_ROOT } from './lib/content-fs.ts';
import { extractSnippets, type Snippet } from './lib/cpp-snippets.ts';

const WORK = join(REPO_ROOT, '.cpp-check');
const BASE_FLAGS = ['-std=c++20', '-Wall', '-Wextra'];
const FRAGMENT_FLAGS = ['-Wno-unused-variable', '-Wno-unused-but-set-variable'];
const RUN_TIMEOUT_S = 5;

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const filterIdx = args.indexOf('--filter');
const filter = filterIdx >= 0 ? args[filterIdx + 1] : undefined;

type Backend = { kind: 'wsl'; distro: string } | { kind: 'native'; cxx: string };

function detectBackend(): Backend | null {
  if (process.platform === 'win32') {
    const distro = process.env.CHECK_CPP_WSL_DISTRO || 'Ubuntu';
    const r = spawnSync('wsl.exe', ['-d', distro, '--', 'bash', '-lc', 'command -v g++'], {
      encoding: 'utf8',
      timeout: 60_000,
    });
    if (r.status === 0 && r.stdout.trim()) return { kind: 'wsl', distro };
  }
  for (const cxx of ['g++', 'clang++']) {
    const r = spawnSync(cxx, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return { kind: 'native', cxx };
  }
  return null;
}

const toWslPath = (p: string) => '/mnt/' + p[0]!.toLowerCase() + p.slice(2).replace(/\\/g, '/');
const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** Write NNN.cpp / NNN.inK for every snippet. */
function prepare(snips: Snippet[]): void {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  snips.forEach((s, i) => {
    const n = String(i).padStart(4, '0');
    writeFileSync(join(WORK, `${n}.cpp`), s.source);
    s.run?.stdin.forEach((inp, k) => writeFileSync(join(WORK, `${n}.in${k}`), inp));
  });
  writeFileSync(
    join(WORK, 'index.txt'),
    snips.map((s, i) => `${String(i).padStart(4, '0')} ${s.key}  (${s.file} › ${s.yamlPath})`).join('\n') +
      '\n',
  );
}

const flagsFor = (s: Snippet) => [...BASE_FLAGS, ...(s.wrapped ? FRAGMENT_FLAGS : [])];

/** WSL: one bash script, compiled/run in parallel with xargs, results written next to the sources. */
function runWsl(snips: Snippet[], distro: string): void {
  const jobs = snips.map((s, i) => {
    const n = String(i).padStart(4, '0');
    const runs = (s.run?.stdin ?? [])
      .map(
        (_, k) =>
          `timeout ${RUN_TIMEOUT_S} "$B/${n}.bin" < ${n}.in${k} > ${n}.out${k} 2>/dev/null; echo $? > ${n}.rs${k}`,
      )
      .join('\n');
    return [
      `g++ ${flagsFor(s).join(' ')} -o "$B/${n}.bin" ${n}.cpp 2> ${n}.err; echo $? > ${n}.status`,
      runs ? `if [ "$(cat ${n}.status)" = 0 ]; then\n${runs}\nfi` : '',
    ].join('\n');
  });
  jobs.forEach((j, i) => writeFileSync(join(WORK, `${String(i).padStart(4, '0')}.sh`), j + '\n'));
  const script = [
    'set -u',
    // Work on the Linux side (/mnt/c I/O is slow), then copy the results back.
    `SRC=${shq(toWslPath(WORK))}`,
    'export B=$(mktemp -d)',
    'cp -r "$SRC"/. "$B"/ && cd "$B"',
    'ls ./*.sh | xargs -P "$(nproc)" -n 1 bash',
    'cp ./*.status ./*.err "$SRC"/ && (cp ./*.out* ./*.rs* "$SRC"/ 2>/dev/null || true)',
    'cd / && rm -rf "$B"',
  ].join('\n');
  writeFileSync(join(WORK, 'run-all.bash'), script + '\n');
  const r = spawnSync('wsl.exe', ['-d', distro, '--', 'bash', toWslPath(join(WORK, 'run-all.bash'))], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20 * 60_000,
  });
  if (r.status !== 0) throw new Error(`WSL run failed (${r.status}): ${r.stderr || r.stdout}`);
}

/** Native: spawn the compiler per snippet with a small concurrency pool. */
async function runNative(snips: Snippet[], cxx: string): Promise<void> {
  const exec = (cmd: string, argv: string[], input?: string) =>
    new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      const p = spawn(cmd, argv, { cwd: WORK });
      let stdout = '';
      let stderr = '';
      const t = setTimeout(() => p.kill('SIGKILL'), RUN_TIMEOUT_S * 1000 * 12);
      p.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
      p.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
      p.on('error', (e) => resolve({ code: 127, stdout, stderr: String(e) }));
      p.on('close', (code) => {
        clearTimeout(t);
        resolve({ code: code ?? 1, stdout, stderr });
      });
      p.stdin.end(input ?? '');
    });
  let next = 0;
  const worker = async () => {
    while (next < snips.length) {
      const i = next++;
      const s = snips[i]!;
      const n = String(i).padStart(4, '0');
      const exe = join(WORK, `${n}.bin${process.platform === 'win32' ? '.exe' : ''}`);
      const c = await exec(cxx, [...flagsFor(s), '-o', exe, `${n}.cpp`]);
      writeFileSync(join(WORK, `${n}.err`), c.stderr);
      writeFileSync(join(WORK, `${n}.status`), String(c.code));
      if (c.code !== 0 || !s.run) continue;
      for (const [k, inp] of s.run.stdin.entries()) {
        const r = await exec(exe, [], inp);
        writeFileSync(join(WORK, `${n}.out${k}`), r.stdout);
        writeFileSync(join(WORK, `${n}.rs${k}`), String(r.code));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, cpus().length) }, worker));
}

const read = (f: string) => (existsSync(join(WORK, f)) ? readFileSync(join(WORK, f), 'utf8') : '');
const showWs = (s: string) => JSON.stringify(s);

async function main(): Promise<void> {
  const { issues, parsed } = loadContentFromDisk();
  if (issues.length) {
    console.error(`Content has ${issues.length} validation error(s); run npm run validate first:`);
    issues.slice(0, 20).forEach((i) => console.error('  ' + formatIssue(i)));
    process.exit(1);
  }
  const extracted = extractSnippets(parsed);
  const skipped = extracted.skipped;
  const snippets = extracted.snippets.filter(
    (s) => !filter || s.key.includes(filter) || s.file.includes(filter),
  );

  const backend = detectBackend();
  if (!backend) {
    console.warn(
      'check:cpp: WARNING no C++ compiler found (WSL g++, g++ or clang++). Skipping the C++ check.',
    );
    return;
  }
  const label = backend.kind === 'wsl' ? `g++ in WSL (${backend.distro})` : backend.cxx;
  console.log(
    `check:cpp: ${snippets.length} snippets, ${skipped.length} skipped (expect: skip), compiler: ${label}`,
  );
  const t0 = Date.now();
  prepare(snippets);
  if (backend.kind === 'wsl') runWsl(snippets, backend.distro);
  else await runNative(snippets, backend.cxx);

  const failures: string[] = [];
  let ran = 0;
  const counts = { clean: 0, warn: 0, error: 0 };
  snippets.forEach((s, i) => {
    const n = String(i).padStart(4, '0');
    const status = Number(read(`${n}.status`).trim() || '1');
    const err = read(`${n}.err`);
    const got = status !== 0 ? 'error' : /warning:/.test(err) ? 'warn' : 'clean';
    counts[got]++;
    const where = `${s.file} › ${s.yamlPath}  [${s.key}, file .cpp-check/${n}.cpp]`;
    const ok = s.expect === got || (s.expect === 'compiles' && got !== 'error');
    if (!ok) {
      const diag = err
        .split('\n')
        .filter((l) => /error:|warning:/.test(l))
        .slice(0, 4)
        .map((l) => '      ' + l.replace(/^.*?\.cpp:/, 'line '))
        .join('\n');
      failures.push(`${where}\n    expected ${s.expect}, got ${got}${diag ? '\n' + diag : ''}`);
      return;
    }
    if (s.run && got !== 'error') {
      ran++;
      const out = s.run.stdin.map((_, k) => read(`${n}.out${k}`)).join('');
      if (out !== s.run.expected) {
        failures.push(
          `${where}\n    output mismatch\n      expected ${showWs(s.run.expected)}\n      got      ${showWs(out)}`,
        );
      }
    }
  });

  if (!keep && !failures.length) rmSync(WORK, { recursive: true, force: true });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `compiled ${snippets.length} (clean ${counts.clean}, warn ${counts.warn}, error ${counts.error}), ran ${ran} programs in ${secs}s`,
  );
  if (failures.length) {
    console.error(`\n${failures.length} problem(s):\n`);
    failures.forEach((f) => console.error('  ' + f + '\n'));
    console.error('Sources kept in .cpp-check/ for inspection.');
    process.exit(1);
  }
  console.log('check:cpp OK');
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
