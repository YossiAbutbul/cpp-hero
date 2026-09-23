/**
 * Cross-file content checks (the per-object checks live in schema.ts).
 *
 *  - world folders match their world.yaml (NN == num, id == wNN), nums 1..n
 *  - lesson files are numbered 1..n and ids are hierarchical (w1.l1, w1.l1.c1,
 *    w1.p, w1.p.s1, w1.p.a1, w1.boss, w1.boss.r1, w1.boss.d1, vault w1.*)
 *  - every id is unique
 *  - 4–6 lessons per world, exactly one Shield lesson
 *  - references exist: challenge.bug, boss.reward.{bug,cosmetic},
 *    achievement.{test,cosmetic}, quest.event, lesson.reviewTags (a tag some
 *    challenge in the same or an earlier world carries)
 *  - world-named tags (w4.guard) are carried by a challenge in that world, and
 *    never name a later world
 */
import type { ContentIssue, ParsedFile } from './load.ts';
import { ACHIEVEMENT_KINDS, type Content } from './schema.ts';
import { walkChallenges } from './walk.ts';
import { isKnownQuestEvent } from '../engine/questEvents.ts';

const CHILD_ID: Record<string, RegExp> = {
  lesson: /^\.c\d+$/,
  project: /^\.s\d+$/,
  stress: /^\.a\d+$/,
  boss: /^\.r\d+$/,
  defense: /^\.d\d+$/,
};
const CHILD_HINT: Record<string, string> = {
  lesson: '<lesson id>.cN',
  project: '<project id>.sN',
  stress: '<project id>.aN',
  boss: '<boss id>.rN',
  defense: '<boss id>.dN',
};

/**
 * @param allPaths every content file path, including files that failed to parse
 *                 (so a broken lesson file doesn't also look like a numbering gap)
 */
export function crossValidate(
  parsed: readonly ParsedFile[],
  content: Content,
  allPaths: readonly string[] = parsed.map((p) => p.path),
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const add = (file: string, path: string, message: string) => issues.push({ file, path, message });

  /* ---- ids that must be unique across all content ---- */
  const seen = new Map<string, string>(); // id -> "file › path"
  const unique = (id: string, file: string, path: string, what: string) => {
    const key = `${what}:${id}`;
    const prev = seen.get(key);
    if (prev) add(file, path, `duplicate ${what} id "${id}" (also at ${prev})`);
    else seen.set(key, `${file}${path ? ' › ' + path : ''}`);
  };

  /* ---- shared lists ---- */
  const bugIds = new Set(content.bestiary.map((b) => b.id));
  const cosmeticIds = new Set(content.cosmetics.map((c) => c.id));
  const worldIdsByFolder = new Map<string, string>();

  for (const p of parsed) {
    if (p.kind === 'bestiary') p.data.forEach((b, i) => unique(b.id, p.path, `[${i}].id`, 'bug'));
    if (p.kind === 'cosmetics') p.data.forEach((c, i) => unique(c.id, p.path, `[${i}].id`, 'cosmetic'));
    if (p.kind === 'quests') {
      p.data.forEach((q, i) => {
        unique(q.id, p.path, `[${i}].id`, 'quest');
        if (!isKnownQuestEvent(q.event)) add(p.path, `[${i}].event`, `unknown quest event "${q.event}"`);
      });
    }
    if (p.kind === 'achievements') {
      p.data.forEach((a, i) => {
        unique(a.id, p.path, `[${i}].id`, 'achievement');
        const [kind, arg = ''] = a.test.split(/:(.*)/s);
        if (!(ACHIEVEMENT_KINDS as readonly string[]).includes(kind ?? '')) {
          add(p.path, `[${i}].test`, `unknown test kind "${kind}" (use one of ${ACHIEVEMENT_KINDS.join(', ')})`);
        } else if (kind === 'bestiary' && !/^\d+$/.test(arg) && !bugIds.has(arg)) {
          add(p.path, `[${i}].test`, `bestiary id "${arg}" does not exist in bestiary.yaml`);
        } else if (kind === 'world' && !/^w\d+$/.test(arg)) {
          add(p.path, `[${i}].test`, `world test needs a world id like w3`);
        } else if (kind !== 'bestiary' && kind !== 'world' && !/^\d+$/.test(arg)) {
          add(p.path, `[${i}].test`, `"${kind}" needs a whole number, e.g. ${kind}:5`);
        }
        if (a.cosmetic && !cosmeticIds.has(a.cosmetic)) {
          add(p.path, `[${i}].cosmetic`, `cosmetic "${a.cosmetic}" does not exist in cosmetics.yaml`);
        }
      });
    }
  }

  /* ---- world structure ---- */
  for (const p of parsed) {
    if (p.kind !== 'world') continue;
    const nn = Number(p.worldDir.slice(0, 2));
    worldIdsByFolder.set(p.worldDir, p.data.id);
    if (p.data.num !== nn) add(p.path, 'num', `is ${p.data.num} but the folder is numbered ${nn}`);
    if (p.data.id !== `w${p.data.num}`) add(p.path, 'id', `must be "w${p.data.num}" (w + num)`);
    unique(p.data.id, p.path, 'id', 'world');
  }
  const nums = content.worlds.map((w) => w.num).sort((a, b) => a - b);
  if (nums.some((n, i) => n !== i + 1)) {
    add('content/worlds/', '', `world numbers must be 1..${nums.length} without gaps (found ${nums.join(', ')})`);
  }

  const lessonsByDir = new Map<string, Extract<ParsedFile, { kind: 'lesson' }>[]>();
  for (const p of parsed) {
    if (p.kind === 'lesson') lessonsByDir.set(p.worldDir, [...(lessonsByDir.get(p.worldDir) ?? []), p]);
  }
  for (const [dir, lessons] of lessonsByDir) {
    const wid = worldIdsByFolder.get(dir);
    const base = `content/worlds/${dir}/`;
    lessons.sort((a, b) => a.order - b.order);
    const orders = allPaths
      .map((p) => (p.startsWith(base) ? /^lesson-(\d{2})\.yaml$/.exec(p.slice(base.length)) : null))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    if (orders.some((o, i) => o !== i + 1)) {
      add(base, '', `lesson files must be numbered lesson-01, lesson-02, ... without gaps (found ${orders.join(', ')})`);
    }
    lessons.forEach((l) => {
      if (wid && l.data.id !== `${wid}.l${l.order}`) add(l.path, 'id', `must be "${wid}.l${l.order}" to match the file name`);
      unique(l.data.id, l.path, 'id', 'lesson');
    });
    if (lessons.length < 4 || lessons.length > 6) add(base, '', `a world needs 4–6 lessons (has ${lessons.length})`);
    const shields = lessons.filter((l) => l.data.shield).length;
    if (shields !== 1) add(base, '', `a world needs exactly one Shield lesson (shield: true), found ${shields}`);
  }
  for (const p of parsed) {
    if (p.kind !== 'project' && p.kind !== 'boss') continue;
    const wid = worldIdsByFolder.get(p.worldDir);
    const want = p.kind === 'project' ? `${wid}.p` : `${wid}.boss`;
    if (wid && p.data.id !== want) add(p.path, 'id', `must be "${want}"`);
    unique(p.data.id, p.path, 'id', p.kind);
    if (p.kind === 'boss') {
      const r = p.data.reward;
      if (r.bug && !bugIds.has(r.bug)) add(p.path, 'reward.bug', `bug "${r.bug}" does not exist in bestiary.yaml`);
      if (r.cosmetic && !cosmeticIds.has(r.cosmetic)) {
        add(p.path, 'reward.cosmetic', `cosmetic "${r.cosmetic}" does not exist in cosmetics.yaml`);
      }
    }
  }

  /* ---- challenges ---- */
  const allTags = new Set<string>();
  /** tag -> lowest world number (folder NN) with a challenge carrying it */
  const tagFirstWorld = new Map<string, number>();
  /** tag -> world numbers (folder NN) with a challenge carrying it */
  const tagWorlds = new Map<string, Set<number>>();
  // Only finished worlds (with a boss file) count, so worlds written in parallel
  // aren't flagged for tags of a world that is still being written.
  const worldNums = new Set(parsed.filter((p) => p.kind === 'boss').map((p) => Number(p.worldDir.slice(0, 2))));
  /** "w4.guard" -> 4 when that world is finished (tags named after a world must be carried in it). */
  const ownWorld = (t: string) => {
    const m = /^w(\d+)\./.exec(t);
    return m && worldNums.has(Number(m[1])) ? Number(m[1]) : null;
  };
  const challengeLocs = [...walkChallenges(parsed)];
  for (const loc of challengeLocs) {
    const nn = Number(loc.worldDir.slice(0, 2));
    loc.ch.tags.forEach((t) => {
      tagFirstWorld.set(t, Math.min(nn, tagFirstWorld.get(t) ?? Infinity));
      tagWorlds.set(t, (tagWorlds.get(t) ?? new Set()).add(nn));
    });
  }
  /** A world-named tag (w4.x) that no challenge in that world carries: probably a guessed name. */
  const orphanTag = (t: string) => {
    const w = ownWorld(t);
    return w !== null && !tagWorlds.get(t)?.has(w);
  };
  for (const loc of challengeLocs) {
    const nn = Number(loc.worldDir.slice(0, 2));
    loc.ch.tags.forEach((t, i) => {
      const w = ownWorld(t);
      if (w !== null && w > nn) {
        add(loc.file, `${loc.path}.tags[${i}]`, `"${t}" belongs to a later world (${w})`);
      } else if (orphanTag(t)) {
        add(loc.file, `${loc.path}.tags[${i}]`, `no World ${w} challenge has the tag "${t}"; use an existing w${w}.* tag`);
      }
    });
  }
  for (const loc of challengeLocs) {
    const { ch, file, path } = loc;
    unique(ch.id, file, `${path}.id`, 'challenge');
    const rest = ch.id.startsWith(loc.parentId + '.') ? ch.id.slice(loc.parentId.length) : null;
    if (rest === null || !CHILD_ID[loc.kind]!.test(rest)) {
      add(file, `${path}.id`, `"${ch.id}" must look like ${CHILD_HINT[loc.kind]} (parent is ${loc.parentId})`);
    }
    if (ch.bug && !bugIds.has(ch.bug)) add(file, `${path}.bug`, `bug "${ch.bug}" does not exist in bestiary.yaml`);
    ch.tags.forEach((t) => allTags.add(t));
  }

  /* ---- vault + reviewTags ---- */
  for (const p of parsed) {
    if (p.kind !== 'lesson') continue;
    const wid = worldIdsByFolder.get(p.worldDir);
    p.data.vault.forEach((v, i) => {
      unique(v.id, p.path, `vault[${i}].id`, 'vault card');
      if (wid && !v.id.startsWith(wid + '.')) add(p.path, `vault[${i}].id`, `vault ids must start with "${wid}."`);
    });
    const nn = Number(p.worldDir.slice(0, 2));
    p.data.reviewTags.forEach((t, i) => {
      const tagWorld = /^w(\d+)\./.exec(t);
      if (!allTags.has(t)) add(p.path, `reviewTags[${i}]`, `no challenge has the tag "${t}"`);
      else if (orphanTag(t)) {
        add(p.path, `reviewTags[${i}]`, `no World ${ownWorld(t)} challenge has the tag "${t}"; use an existing one`);
      }
      else if (tagWorld && Number(tagWorld[1]) > nn) {
        add(p.path, `reviewTags[${i}]`, `"${t}" belongs to a later world; review only earlier or current worlds`);
      } else if ((tagFirstWorld.get(t) ?? Infinity) > nn) {
        add(p.path, `reviewTags[${i}]`, `no challenge in this world or an earlier one has the tag "${t}"`);
      }
    });
  }

  return issues;
}
