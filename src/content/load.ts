/**
 * Content loader: YAML files → validated `Content`.
 *
 * Pure (no fs): callers pass the files in, so the same code runs in the Vite
 * plugin, the npm scripts and the unit tests. Used at build/dev time only;
 * the app bundle receives the resulting JSON.
 *
 * File layout (paths are repo-relative, forward slashes):
 *   content/worlds/<NN>-<slug>/world.yaml      WorldMeta
 *   content/worlds/<NN>-<slug>/lesson-<NN>.yaml Lesson (one per file, in order)
 *   content/worlds/<NN>-<slug>/project.yaml    Project
 *   content/worlds/<NN>-<slug>/boss.yaml       Boss
 *   content/shared/{bestiary,achievements,cosmetics,quests}.yaml  top-level lists
 */
import { parseDocument } from 'yaml';
import type { z } from 'zod';
import {
  AchievementsSchema,
  BestiarySchema,
  BossSchema,
  CosmeticsSchema,
  LessonSchema,
  ProjectSchema,
  QuestsSchema,
  WorldMetaSchema,
  type Achievement,
  type Boss,
  type Bug,
  type Content,
  type Cosmetic,
  type Lesson,
  type Project,
  type Quest,
  type World,
  type WorldMeta,
} from './schema.ts';
import { crossValidate } from './validate.ts';

export interface SourceFile {
  /** Repo-relative path with forward slashes, e.g. content/worlds/01-hello-world/lesson-01.yaml */
  path: string;
  text: string;
}

export interface ContentIssue {
  file: string;
  /** YAML path inside the file, e.g. challenges[3].answer ('' = whole file). */
  path: string;
  message: string;
}

export type FileKind = 'world' | 'lesson' | 'project' | 'boss' | 'bestiary' | 'achievements' | 'cosmetics' | 'quests';

/** One successfully parsed + schema-validated file. */
export type ParsedFile =
  | { kind: 'world'; path: string; worldDir: string; data: WorldMeta }
  | { kind: 'lesson'; path: string; worldDir: string; order: number; data: Lesson }
  | { kind: 'project'; path: string; worldDir: string; data: Project }
  | { kind: 'boss'; path: string; worldDir: string; data: Boss }
  | { kind: 'bestiary'; path: string; data: Bug[] }
  | { kind: 'achievements'; path: string; data: Achievement[] }
  | { kind: 'cosmetics'; path: string; data: Cosmetic[] }
  | { kind: 'quests'; path: string; data: Quest[] };

export interface LoadResult {
  /** null when there were errors. */
  content: Content | null;
  issues: ContentIssue[];
  parsed: ParsedFile[];
}

const SCHEMAS: Record<FileKind, z.ZodType> = {
  world: WorldMetaSchema,
  lesson: LessonSchema,
  project: ProjectSchema,
  boss: BossSchema,
  bestiary: BestiarySchema,
  achievements: AchievementsSchema,
  cosmetics: CosmeticsSchema,
  quests: QuestsSchema,
};

const WORLD_FILE = /^content\/worlds\/(\d{2})-[a-z0-9-]+\/(world|project|boss|lesson-(\d{2}))\.yaml$/;
const SHARED_FILE = /^content\/shared\/(bestiary|achievements|cosmetics|quests)\.yaml$/;

/** Format a zod/our path as YAML-ish: challenges[3].answer */
export function formatPath(path: readonly PropertyKey[]): string {
  let out = '';
  for (const p of path) {
    if (typeof p === 'number') out += `[${p}]`;
    else out += (out ? '.' : '') + String(p);
  }
  return out;
}

/** "content/.../lesson-02.yaml › challenges[3].answer: out of range" */
export function formatIssue(i: ContentIssue): string {
  return `${i.file}${i.path ? ' › ' + i.path : ''}: ${i.message}`;
}

function classify(path: string): { kind: FileKind; worldDir?: string; order?: number } | null {
  const w = WORLD_FILE.exec(path);
  if (w) {
    const worldDir = path.split('/')[2]!;
    const which = w[2]!;
    if (which.startsWith('lesson-')) return { kind: 'lesson', worldDir, order: Number(w[3]) };
    return { kind: which as 'world' | 'project' | 'boss', worldDir };
  }
  const s = SHARED_FILE.exec(path);
  if (s) return { kind: s[1] as FileKind };
  return null;
}

/** Parse + validate every file, assemble worlds, then run the cross-file checks. */
export function loadContent(files: readonly SourceFile[]): LoadResult {
  const issues: ContentIssue[] = [];
  const parsed: ParsedFile[] = [];
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const f of sorted) {
    if (!f.path.endsWith('.yaml')) continue;
    const cls = classify(f.path);
    if (!cls) {
      issues.push({
        file: f.path,
        path: '',
        message:
          'unexpected file name/location (see content/README.md: worlds/NN-slug/{world,project,boss,lesson-NN}.yaml or shared/*.yaml)',
      });
      continue;
    }
    const doc = parseDocument(f.text, { uniqueKeys: true, prettyErrors: true });
    if (doc.errors.length) {
      for (const e of doc.errors) issues.push({ file: f.path, path: '', message: `YAML syntax: ${e.message}` });
      continue;
    }
    const raw: unknown = doc.toJS();
    const res = SCHEMAS[cls.kind].safeParse(raw);
    if (!res.success) {
      for (const iss of res.error.issues) {
        issues.push({ file: f.path, path: formatPath(iss.path), message: iss.message });
      }
      continue;
    }
    parsed.push({ ...cls, path: f.path, data: res.data } as ParsedFile);
  }

  // Assemble worlds (only meaningful when every file parsed).
  const byDir = new Map<string, ParsedFile[]>();
  for (const p of parsed) {
    if ('worldDir' in p) {
      const list = byDir.get(p.worldDir) ?? [];
      list.push(p);
      byDir.set(p.worldDir, list);
    }
  }
  const worlds: World[] = [];
  for (const [dir, list] of [...byDir].sort(([a], [b]) => a.localeCompare(b))) {
    const base = `content/worlds/${dir}/`;
    const meta = list.find((p) => p.kind === 'world');
    const project = list.find((p) => p.kind === 'project');
    const boss = list.find((p) => p.kind === 'boss');
    const lessons = list
      .filter((p): p is Extract<ParsedFile, { kind: 'lesson' }> => p.kind === 'lesson')
      .sort((a, b) => a.order - b.order);
    const has = (name: string) => files.some((f) => f.path === base + name);
    const absent = ['world.yaml', 'project.yaml', 'boss.yaml'].filter((n) => !has(n));
    if (!files.some((f) => f.path.startsWith(base + 'lesson-'))) absent.push('lesson-01.yaml');
    if (absent.length) issues.push({ file: base, path: '', message: `world folder is missing ${absent.join(', ')}` });
    // Files that exist but failed to parse were already reported above.
    if (meta?.kind !== 'world' || project?.kind !== 'project' || boss?.kind !== 'boss' || !lessons.length) continue;
    worlds.push({ ...meta.data, lessons: lessons.map((l) => l.data), project: project.data, boss: boss.data });
  }

  const shared = <K extends 'bestiary' | 'achievements' | 'cosmetics' | 'quests'>(kind: K) =>
    (parsed.find((p) => p.kind === kind)?.data ?? []) as Extract<ParsedFile, { kind: K }>['data'];
  for (const kind of ['bestiary', 'achievements', 'cosmetics', 'quests'] as const) {
    const file = `content/shared/${kind}.yaml`;
    if (!files.some((f) => f.path === file)) issues.push({ file, path: '', message: 'missing shared file' });
  }

  const content: Content = {
    worlds,
    bestiary: shared('bestiary'),
    achievements: shared('achievements'),
    cosmetics: shared('cosmetics'),
    quests: shared('quests'),
  };

  issues.push(...crossValidate(parsed, content, files.map((f) => f.path)));
  return { content: issues.length ? null : content, issues, parsed };
}
