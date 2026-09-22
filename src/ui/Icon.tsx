import type { CSSProperties } from 'react';
import { ICONS, type IconName } from './icons';

export type { IconName } from './icons';

export interface IconProps {
  name: IconName;
  className?: string;
  /** CSS size (number = px). Default: 1.15em via the global .ic class. */
  size?: number | string;
  /** Accessible label; without it the icon is decorative (aria-hidden). */
  label?: string;
  style?: CSSProperties;
}

/** Inline 24×24 icon from the legacy set (src/ui/icons.ts). */
export function Icon({ name, className, size, label, style }: IconProps) {
  const s = size == null ? undefined : typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      className={'ic' + (className ? ' ' + className : '')}
      viewBox="0 0 24 24"
      focusable="false"
      style={s ? { width: s, height: s, ...style } : style}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? ICONS.star }}
    />
  );
}
