import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readContentFiles } from '../../../scripts/lib/content-fs';
import { loadContent } from '../../content/load';
import { allCosmetics } from '../../engine/cosmetics';
import { hatSvg } from './curloArt';

const content = loadContent(readContentFiles()).content!;
const cosmetics = allCosmetics(content.cosmetics);
const PARTY = 'M-17 4 L0 -36 L17 4 Z';

describe('cosmetic art', () => {
  it('gives every hat its own art (only the party hat uses the party-hat fallback)', () => {
    const hats = cosmetics.filter((c) => c.slot === 'hat');
    expect(hats.length).toBeGreaterThan(5);
    for (const h of hats) {
      const svg = hatSvg(h.id);
      if (h.id === 'party-hat') expect(svg).toContain(PARTY);
      else expect(svg, h.id).not.toContain(PARTY);
    }
  });

  it('distinct hats render distinct art', () => {
    const hats = cosmetics.filter((c) => c.slot === 'hat');
    const svgs = new Set(hats.map((h) => hatSvg(h.id)));
    expect(svgs.size).toBe(hats.length);
  });

  it('styles every shield skin in curlo.css', () => {
    const css = readFileSync(new URL('./curlo.css', import.meta.url), 'utf8');
    for (const s of cosmetics.filter((c) => c.slot === 'shield'))
      expect(css, s.id).toContain(`[data-shield='${s.id}']`);
  });

  it('gives every color cosmetic a color', () => {
    for (const c of cosmetics.filter((x) => x.slot === 'color')) expect(c.color, c.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
