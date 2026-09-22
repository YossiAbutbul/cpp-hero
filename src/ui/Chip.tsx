/**
 * Rounded status chip (legacy .chip). A button when onClick is given.
 *   <Chip icon="quest" onClick={openQuests} label="Daily quests: 1 of 3 done">1/3</Chip>
 *   <Chip tone="hot">All done!</Chip>
 */
import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Chip.module.css';

export interface ChipProps {
  icon?: IconName;
  /** leading visual instead of an icon (e.g. <StreakFlame/>) */
  lead?: ReactNode;
  children?: ReactNode;
  /** 'hot' = sun yellow highlight */
  tone?: 'default' | 'hot' | 'teal' | 'coral';
  onClick?: () => void;
  /** accessible label (recommended for button chips) */
  label?: string;
  className?: string;
  style?: CSSProperties;
  'data-origin-id'?: string;
}

export const Chip = forwardRef<HTMLButtonElement & HTMLSpanElement, ChipProps>(function Chip(
  { icon, lead, children, tone = 'default', onClick, label, className, style, ...rest },
  ref,
) {
  const cls = [styles.chip, tone !== 'default' ? styles[tone] : '', onClick ? styles.btn : '', className]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <>
      {lead}
      {icon && <Icon name={icon} />}
      {children}
    </>
  );
  return onClick ? (
    <button ref={ref} type="button" className={cls} onClick={onClick} aria-label={label} style={style} {...rest}>
      {inner}
    </button>
  ) : (
    <span ref={ref} className={cls} aria-label={label} style={style} {...rest}>
      {inner}
    </span>
  );
});
