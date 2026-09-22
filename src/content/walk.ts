/**
 * Walk every challenge in the parsed content files together with its
 * location (file + YAML path), for cross-file validation and the C++ checker.
 */
import type { ParsedFile } from './load.ts';
import type { Challenge } from './schema.ts';

export type ChallengeKind = 'lesson' | 'project' | 'stress' | 'boss' | 'defense';

export interface ChallengeLocation {
  ch: Challenge;
  file: string;
  /** YAML path of the challenge inside `file`, e.g. challenges[2] or stress.attacks[0].challenge */
  path: string;
  kind: ChallengeKind;
  /** id of the owning lesson / project / boss (challenge ids must start with it + '.') */
  parentId: string;
  worldDir: string;
}

export function* walkChallenges(parsed: readonly ParsedFile[]): Generator<ChallengeLocation> {
  for (const p of parsed) {
    const base = { file: p.path };
    if (p.kind === 'lesson') {
      for (const [i, ch] of p.data.challenges.entries()) {
        yield { ...base, ch, path: `challenges[${i}]`, kind: 'lesson', parentId: p.data.id, worldDir: p.worldDir };
      }
    } else if (p.kind === 'project') {
      for (const [i, ch] of p.data.steps.entries()) {
        yield { ...base, ch, path: `steps[${i}]`, kind: 'project', parentId: p.data.id, worldDir: p.worldDir };
      }
      for (const [i, a] of p.data.stress.attacks.entries()) {
        yield {
          ...base,
          ch: a.challenge,
          path: `stress.attacks[${i}].challenge`,
          kind: 'stress',
          parentId: p.data.id,
          worldDir: p.worldDir,
        };
      }
    } else if (p.kind === 'boss') {
      for (const [i, ch] of p.data.rounds.entries()) {
        yield { ...base, ch, path: `rounds[${i}]`, kind: 'boss', parentId: p.data.id, worldDir: p.worldDir };
      }
      for (const [i, d] of p.data.defense.entries()) {
        yield {
          ...base,
          ch: d.challenge,
          path: `defense[${i}].challenge`,
          kind: 'defense',
          parentId: p.data.id,
          worldDir: p.worldDir,
        };
      }
    }
  }
}
