/** Read every YAML file under content/ from disk (for scripts and the Vite plugin). */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { loadContent, type LoadResult, type SourceFile } from '../../src/content/load.ts';

export const REPO_ROOT = join(import.meta.dirname, '..', '..');
export const CONTENT_DIR = join(REPO_ROOT, 'content');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && e.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

/** All content/**\/*.yaml files; paths repo-relative with forward slashes, CRLF normalized. */
export function readContentFiles(root: string = REPO_ROOT): SourceFile[] {
  return walk(join(root, 'content'))
    .sort()
    .map((abs) => ({
      path: relative(root, abs).split(sep).join('/'),
      text: readFileSync(abs, 'utf8')
        .replace(/^\uFEFF/, '')
        .replace(/\r\n/g, '\n'),
    }));
}

export function loadContentFromDisk(root: string = REPO_ROOT): LoadResult {
  return loadContent(readContentFiles(root));
}
