/**
 * Chunky pressable 3D buttons (legacy .pbtn / .ibtn).
 *
 *   <Button onClick={go}>Start</Button>                       // primary (tangerine)
 *   <Button variant="teal" icon="play">Run it</Button>
 *   <Button variant="ghost" size="small">Later</Button>
 *   <Button variant="coral" block>Fight!</Button>             // full width, big
 *   <IconButton icon="x" label="Close" />                       // square icon button
 *   <MorphIconButton icon="settings" label="Settings" open={isOpen} />  // icon → X
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'tang' | 'teal' | 'sun' | 'coral' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'small' | 'big';
  /** full width (implies the big size unless size is given) */
  block?: boolean;
  icon?: IconName;
  /** trailing icon */
  iconEnd?: IconName;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size, block, icon, iconEnd, className, children, type = 'button', ...rest },
  ref,
) {
  const sz = size ?? (block ? 'big' : 'md');
  const cls = [
    styles.pbtn,
    variant !== 'primary' && variant !== 'tang' ? styles[variant] : '',
    sz !== 'md' ? styles[sz] : '',
    block ? styles.block : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconEnd && <Icon name={iconEnd} />}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** accessible name (also the tooltip) */
  label: string;
  size?: 'md' | 'small';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={[styles.ibtn, size === 'small' ? styles.ibtnSmall : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
});

export interface MorphIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  label: string;
  /** true → shows an X (and says "Close <label>") */
  open: boolean;
}

/** Header toggle: its icon morphs into an X while its panel is open. */
export const MorphIconButton = forwardRef<HTMLButtonElement, MorphIconButtonProps>(function MorphIconButton(
  { icon, label, open, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={open ? `Close ${label.toLowerCase()}` : label}
      aria-expanded={open}
      title={open ? 'Close' : label}
      className={[styles.ibtn, styles.morph, open ? styles.isOpen : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Icon name={icon} className={styles.icMain} />
      <Icon name="close" className={styles.icX} />
    </button>
  );
});
