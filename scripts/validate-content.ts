/**
 * npm run validate — load every YAML file under content/, validate it against
 * the schema (src/content/schema.ts) and the cross-file rules
 * (src/content/validate.ts), and print a per-file error list. Exit 1 on errors.
 */
import { loadContentFromDisk, readContentFiles } from './lib/content-fs.ts';

const files = readContentFiles();
const { content, issues } = loadContentFromDisk();

if (issues.length) {
  const byFile = new Map<string, typeof issues>();
  for (const i of issues) byFile.set(i.file, [...(byFile.get(i.file) ?? []), i]);
  console.error(`\nContent validation failed: ${issues.length} error(s) in ${byFile.size} file(s)\n`);
  for (const [file, list] of byFile) {
    console.error(file);
    for (const i of list) console.error(`  ${i.path ? i.path + ': ' : ''}${i.message}`);
    console.error('');
  }
  console.error('Each line reads  <file> › <path in the file>: <problem>. See content/README.md.');
  process.exit(1);
}

const c = content!;
const lessons = c.worlds.reduce((n, w) => n + w.lessons.length, 0);
const challenges = c.worlds.reduce(
  (n, w) =>
    n +
    w.lessons.reduce((m, l) => m + l.challenges.length, 0) +
    w.project.steps.length +
    w.project.stress.attacks.length +
    w.boss.rounds.length +
    w.boss.defense.length,
  0,
);
console.log(
  `Content OK: ${files.length} files, ${c.worlds.length} worlds, ${lessons} lessons, ${challenges} challenges, ` +
    `${c.bestiary.length} bugs, ${c.achievements.length} achievements, ${c.cosmetics.length} cosmetics, ${c.quests.length} quests.`,
);
