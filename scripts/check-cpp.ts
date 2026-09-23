/**
 * npm run check:cpp — compile (and run) every C++ snippet in content/.
 *
 * Compiler: g++ -std=c++20 -Wall -Wextra
 *   - on Windows via WSL (distro from $CHECK_CPP_WSL_DISTRO, default "Ubuntu"),
 *   - otherwise (or when WSL is unavailable) a local g++ / clang++ on PATH,
 *   - otherwise Docker with the image $CHECK_CPP_DOCKER_IMAGE (default gcc:14),
 *     if that image is already pulled (the script never pulls it),
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
 * variable warnings are ignored for them. Fragments with top-level function
 * definitions are placed at file scope (see wrapSnippet in lib/cpp-snippets.ts).
 *
 * Each run works in its own directory, .cpp-check/<pid>-<timestamp>/, so
 * parallel runs never clobber each other. It is deleted at the end unless
 * there were problems or --keep is given.
 *
 * Options:
 *   --filter <s>   only check some snippets (repeatable, comma-separated, or --filter=<s>):
 *                    w9 / 9      one world (id prefix w9. or folder content/worlds/09-*)
 *                    w9.l2       one lesson (also w9.p, w9.boss, w9.l2.c3)
 *                    other text  snippets whose key or file path contains it (e.g. 06-functions)
 *                  --world <s> is an alias. Validation errors only block the
 *                  run when they are in a filtered world/file or in
 *                  content/shared/; others are printed as warnings.
 *   --jobs <n>     parallel compile workers (default: all CPUs; -j <n> works too)
 *   --keep         keep the work directory for inspection
 *   --list         print the snippets that would be checked, compile nothing
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, relative, sep } from 'node:path';
import { formatIssue } from '../src/content/load.ts';
import { loadContentFromDisk, REPO_ROOT } from './lib/content-fs.ts';
import { extractSnippets, type Snippet } from './lib/cpp-snippets.ts';

const WORK_ROOT = join(REPO_ROOT, '.cpp-check');
const WORK = join(WORK_ROOT, `${process.pid}-${Date.now()}`);
const WORK_REL = relative(REPO_ROOT, WORK).split(sep).join('/');
const BASE_FLAGS = ['-std=c++20', '-Wall', '-Wextra'];
const FRAGMENT_FLAGS = ['-Wno-unused-variable', '-Wno-unused-but-set-variable'];
const RUN_TIMEOUT_S = 5;

const args = process.argv.slice(2);
const keep = args.includes('--keep');
/** Values of a repeatable option, e.g. --filter a --filter b,c → [a, b, c]. */
const optionValues = (...names: string[]) =>
  args
    .flatMap((a, i) => {
      const eq = names.find((n) => a.startsWith(n + '='));
      if (eq) return a.slice(eq.length + 1).split(',');
      return names.includes(a) && args[i + 1] ? args[i + 1]!.split(',') : [];
    })
    .map((f) => f.trim())
    .filter(Boolean);
const filters = [...optionValues('--filter', '--world')];
const jobsArg = Number(optionValues('--jobs', '-j').at(-1));
const JOBS = Number.isInteger(jobsArg) && jobsArg > 0 ? jobsArg : Math.max(1, cpus().length);

/**
 * World-shaped filters: "w9", "9" or "w9.l2" (world 9, or one lesson/boss/... in it).
 * They match by id prefix (so w1 does not match w10) and by the world folder.
 */
const WORLD_FILTER = /^w?(\d+)(\..*)?$/;
const worldDir = (num: string) => `content/worlds/${num.padStart(2, '0')}-`;
function filterMatches(f: string, key: string, file: string): boolean {
  const m = WORLD_FILTER.exec(f);
  if (!m) return key.includes(f) || file.includes(f);
  const id = `w${Number(m[1])}${m[2] ?? ''}`;
  const idMatch = (k: string) => k === id || k.startsWith(id + '.');
  if (m[2] === undefined)
    return file.startsWith(worldDir(m[1]!)) || idMatch(key) || idMatch(key.replace(/^vault\./, ''));
  return idMatch(key) || idMatch(key.replace(/^vault\./, ''));
}
const matches = (key: string, file = '') =>
  !filters.length || filters.some((f) => filterMatches(f, key, file));

type Backend =
  { kind: 'wsl'; distro: string } | { kind: 'docker'; image: string } | { kind: 'native'; cxx: string };

const DOCKER_IMAGE = process.env.CHECK_CPP_DOCKER_IMAGE || 'gcc:14';

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
  // Docker, only with an image that is already present (never pulls on its own).
  const d = spawnSync('docker', ['image', 'inspect', '--format', '{{.Id}}', DOCKER_IMAGE], {
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (d.status === 0) return { kind: 'docker', image: DOCKER_IMAGE };
  return null;
}

const toWslPath = (p: string) => '/mnt/' + p[0]!.toLowerCase() + p.slice(2).replace(/\\/g, '/');
const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** Write NNN.cpp / NNN.inK for every snippet. */
function prepare(snips: Snippet[]): void {
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

/**
 * WSL / Docker: one bash script, compiled/run in parallel with xargs, results
 * written next to the sources. `srcDir` is the work dir as the Linux side sees it.
 */
function runLinux(snips: Snippet[], srcDir: string, exec: (script: string) => [string, string[]]): void {
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
    `SRC=${shq(srcDir)}`,
    'export B=$(mktemp -d)',
    'cp -r "$SRC"/. "$B"/ && cd "$B"',
    `ls ./*.sh | xargs -P ${JOBS} -n 1 bash`,
    'cp ./*.status ./*.err "$SRC"/ && (cp ./*.out* ./*.rs* "$SRC"/ 2>/dev/null || true)',
    'cd / && rm -rf "$B"',
  ].join('\n');
  writeFileSync(join(WORK, 'run-all.bash'), script + '\n');
  const [cmd, argv] = exec(`${srcDir}/run-all.bash`);
  const r = spawnSync(cmd, argv, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20 * 60_000,
  });
  if (r.status !== 0) throw new Error(`${cmd} run failed (${r.status}): ${r.stderr || r.stdout || r.error}`);
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
  await Promise.all(Array.from({ length: JOBS }, worker));
}

/** Remove this run's directory, and .cpp-check/ itself when no other run is using it. */
function cleanUp(): void {
  rmSync(WORK, { recursive: true, force: true });
  try {
    if (existsSync(WORK_ROOT) && readdirSync(WORK_ROOT).length === 0) rmSync(WORK_ROOT, { recursive: true });
  } catch {
    /* another run just created its directory */
  }
}

const read = (f: string) => (existsSync(join(WORK, f)) ? readFileSync(join(WORK, f), 'utf8') : '');
const showWs = (s: string) => JSON.stringify(s);

async function main(): Promise<void> {
  const { issues, parsed } = loadContentFromDisk();
  const extracted = extractSnippets(parsed);
  const snippets = extracted.snippets.filter((s) => matches(s.key, s.file));
  const skipped = extracted.skipped.filter((s) => matches('', s));
  // With --filter, only issues in the checked files, the filtered worlds' folders
  // or shared data block the run; everything else is a warning.
  const checkedFiles = new Set(snippets.map((s) => s.file));
  const worldDirs = filters.flatMap((f) => {
    const m = WORLD_FILTER.exec(f);
    return m ? [worldDir(m[1]!)] : [];
  });
  const blocking = issues.filter(
    (i) =>
      !filters.length ||
      i.file.startsWith('content/shared/') ||
      checkedFiles.has(i.file) ||
      filters.some((f) => !WORLD_FILTER.test(f) && i.file.includes(f)) ||
      worldDirs.some((d) => i.file.startsWith(d)),
  );
  const other = issues.filter((i) => !blocking.includes(i));
  if (blocking.length) {
    console.error(`Content has ${blocking.length} validation error(s); run npm run validate first:`);
    blocking.slice(0, 20).forEach((i) => console.error('  ' + formatIssue(i)));
    process.exit(1);
  }
  if (other.length) {
    console.warn(
      `check:cpp: WARNING ${other.length} validation error(s) outside the filter (not blocking this run):`,
    );
    other.slice(0, 10).forEach((i) => console.warn('  ' + formatIssue(i)));
    if (other.length > 10) console.warn(`  ... and ${other.length - 10} more (npm run validate)`);
  }
  if (filters.length && !snippets.length) {
    console.error(`check:cpp: no snippets match --filter ${filters.join(',')}`);
    process.exit(1);
  }

  if (args.includes('--list')) {
    snippets.forEach((s) => console.log(`${s.key}  (${s.file} › ${s.yamlPath}, expect ${s.expect})`));
    console.log(`${snippets.length} snippets, ${skipped.length} skipped`);
    return;
  }

  const backend = detectBackend();
  if (!backend) {
    console.warn(
      `check:cpp: WARNING no C++ compiler found (WSL g++, g++, clang++ or the Docker image ${DOCKER_IMAGE}). ` +
        `Skipping the C++ check. Fix: install g++ in WSL Ubuntu, or run "docker pull ${DOCKER_IMAGE}".`,
    );
    return;
  }
  const label =
    backend.kind === 'wsl'
      ? `g++ in WSL (${backend.distro})`
      : backend.kind === 'docker'
        ? `g++ in Docker (${backend.image})`
        : backend.cxx;
  console.log(
    `check:cpp: ${snippets.length} snippets, ${skipped.length} skipped (expect: skip), compiler: ${label}, ${JOBS} jobs`,
  );
  const t0 = Date.now();
  prepare(snippets);
  if (backend.kind === 'wsl') {
    const { distro } = backend;
    runLinux(snippets, toWslPath(WORK), (script) => ['wsl.exe', ['-d', distro, '--', 'bash', script]]);
  } else if (backend.kind === 'docker') {
    const { image } = backend;
    runLinux(snippets, '/work', (script) => [
      'docker',
      ['run', '--rm', '--network', 'none', '-v', `${WORK}:/work`, image, 'bash', script],
    ]);
  } else await runNative(snippets, backend.cxx);

  const failures: string[] = [];
  let ran = 0;
  const counts = { clean: 0, warn: 0, error: 0 };
  snippets.forEach((s, i) => {
    const n = String(i).padStart(4, '0');
    const status = Number(read(`${n}.status`).trim() || '1');
    const err = read(`${n}.err`);
    const got = status !== 0 ? 'error' : /warning:/.test(err) ? 'warn' : 'clean';
    counts[got]++;
    const where = `${s.file} › ${s.yamlPath}  [${s.key}, file ${WORK_REL}/${n}.cpp]`;
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

  if (!keep && !failures.length) cleanUp();
  else console.log(`Work files kept in ${WORK_REL}/`);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `compiled ${snippets.length} (clean ${counts.clean}, warn ${counts.warn}, error ${counts.error}), ran ${ran} programs in ${secs}s`,
  );
  if (failures.length) {
    console.error(`\n${failures.length} problem(s):\n`);
    failures.forEach((f) => console.error('  ' + f + '\n'));
    process.exit(1);
  }
  console.log('check:cpp OK');
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
