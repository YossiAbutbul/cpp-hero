/**
 * Vite plugin: serves all content/**\/*.yaml as the virtual module
 * `virtual:cpp-hero-content` (default export: the validated `Content`).
 *
 * - YAML is parsed and validated with zod here, in Node, at dev and build
 *   time. The browser bundle only receives the parsed JSON (no yaml/zod).
 * - Invalid content throws a readable error: the dev server shows it in the
 *   error overlay, `vite build` fails.
 * - Editing, adding or deleting a YAML file hot-updates the module; the app
 *   re-renders with the new content (see src/content/index.ts).
 */
import type { Plugin, ViteDevServer } from 'vite';
import { formatIssue } from '../../src/content/load.ts';
import { CONTENT_DIR, loadContentFromDisk } from './content-fs.ts';

export const CONTENT_MODULE_ID = 'virtual:cpp-hero-content';
const RESOLVED_ID = '\0' + CONTENT_MODULE_ID;

const isContentFile = (file: string) =>
  file.replace(/\\/g, '/').startsWith(CONTENT_DIR.replace(/\\/g, '/') + '/') && file.endsWith('.yaml');

export class ContentError extends Error {
  constructor(lines: string[]) {
    super(
      `Invalid content (${lines.length} problem${lines.length === 1 ? '' : 's'}):\n\n` +
        lines.map((l) => '  • ' + l).join('\n') +
        '\n\nFix the YAML (see content/README.md) and save; the page reloads by itself.',
    );
    this.name = 'ContentError';
  }
}

export function contentPlugin(): Plugin {
  let server: ViteDevServer | undefined;

  const invalidate = () => {
    if (!server) return;
    const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
      return mod;
    }
    return undefined;
  };

  return {
    name: 'cpp-hero-content',
    resolveId(id) {
      return id === CONTENT_MODULE_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const { content, issues } = loadContentFromDisk();
      if (!content) throw new ContentError(issues.map(formatIssue));
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(content))});`;
    },
    configureServer(s) {
      server = s;
      s.watcher.add(CONTENT_DIR);
      // New / deleted files don't go through handleHotUpdate: reload fully.
      const onAddRemove = (file: string) => {
        if (!isContentFile(file)) return;
        invalidate();
        s.ws.send({ type: 'full-reload' });
      };
      s.watcher.on('add', onAddRemove);
      s.watcher.on('unlink', onAddRemove);
    },
    handleHotUpdate(ctx) {
      if (!isContentFile(ctx.file)) return undefined;
      const mod = invalidate();
      return mod ? [mod] : [];
    },
  };
}
