/**
 * React wrappers around the legacy SVG art (artSvg.ts). Size comes from the
 * `size` prop or from CSS on the wrapper (className); the SVG fills it.
 *
 *   <BossArt kind="gremlin" size={120} hurt />
 *   <BeastArt kind="imp" color="#FF5A70" locked={!defeated} />
 *   <WorldIcon kind="rocket" size={34} />                 // white, for coloured nodes
 *   <WorldIcon kind="castle" color="#A89C8C" />            // muted/locked variant
 */
import { forwardRef, useMemo, type CSSProperties } from 'react';
import { beastSvg, bossSvg, iconSvg } from './artSvg';
import './art.css';

export type BossKind = 'gremlin' | 'blob' | 'golem' | 'phantom' | 'hydra' | 'wraith' | 'sentinel' | 'dragon';
export type BeastKind = 'imp' | 'bug' | 'ghost' | 'slime' | 'worm' | 'spider' | 'moth' | 'gremlin';
export type WorldIconKind =
  | 'rocket'
  | 'box'
  | 'calc'
  | 'fork'
  | 'loop'
  | 'func'
  | 'list'
  | 'arrow'
  | 'memory'
  | 'class'
  | 'tree'
  | 'castle'
  | 'template'
  | 'stl'
  | 'star'
  | 'crown';

interface BaseProps {
  /** px number or any CSS length; omit to size with className */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** accessible name; without it the art is decorative */
  label?: string;
  /** stop the idle animation */
  still?: boolean;
}

function wrapStyle(size: BaseProps['size'], style?: CSSProperties): CSSProperties | undefined {
  if (size == null) return style;
  const s = typeof size === 'number' ? `${size}px` : size;
  return { width: s, height: s, ...style };
}

const Wrap = forwardRef<HTMLSpanElement, BaseProps & { html: string }>(function Wrap(
  { html, size, className, style, label, still },
  ref,
) {
  return (
    <span
      ref={ref}
      className={'art-wrap' + (still ? ' art-still' : '') + (className ? ' ' + className : '')}
      style={wrapStyle(size, style)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export interface BossArtProps extends BaseProps {
  /** content boss.art key (unknown keys fall back to the gremlin) */
  kind: BossKind | string;
  /** knocked-out face (X eyes, dizzy mouth) */
  hurt?: boolean;
  /** body color override */
  color?: string;
}
/** Boss monster (viewBox 200×200). The ref points at the wrapper span (for hurt flashes). */
export const BossArt = forwardRef<HTMLSpanElement, BossArtProps>(function BossArt(
  { kind, hurt, color, ...rest },
  ref,
) {
  const html = useMemo(() => bossSvg(kind, { hurt, color }), [kind, hurt, color]);
  return <Wrap ref={ref} html={html} {...rest} />;
});

export interface BeastArtProps extends BaseProps {
  kind: BeastKind | string;
  color?: string;
  /** grey silhouette (not yet defeated) */
  locked?: boolean;
}
/** Bug Bestiary creature (viewBox 120×120). */
export function BeastArt({ kind, color, locked, ...rest }: BeastArtProps) {
  const html = useMemo(() => beastSvg(kind, { color, locked }), [kind, color, locked]);
  return <Wrap html={html} {...rest} />;
}

export interface WorldIconProps extends BaseProps {
  kind: WorldIconKind | string;
  /** main fill (default white) */
  color?: string;
  accent?: string;
}
/** World icon (viewBox 48×48, white by default so it sits on coloured nodes). */
export function WorldIcon({ kind, color, accent, ...rest }: WorldIconProps) {
  const html = useMemo(() => iconSvg(kind, { color, accent }), [kind, color, accent]);
  return <Wrap html={html} still {...rest} />;
}
