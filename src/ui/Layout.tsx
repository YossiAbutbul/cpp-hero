/**
 * Screen scaffolding shared by every feature screen.
 *
 *   export function VaultScreen() {
 *     return (
 *       <Screen label="Code Vault">
 *         <ScreenTitle eyebrow="Your cheat sheet">Code Vault</ScreenTitle>
 *         <Card>…</Card>
 *       </Screen>
 *     );
 *   }
 *
 * <Screen> is the scrolling area inside the stage (hidden scrollbar,
 * overscroll contained, 16px side gutter). Immersive screens (lesson,
 * boss…) pass `immersive` to get safe-area top padding.
 */
import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import styles from './Layout.module.css';

export interface ScreenProps extends HTMLAttributes<HTMLElement> {
  /** accessible name of the screen region */
  label: string;
  children?: ReactNode;
  /** no scroll container (the screen manages its own layout) */
  fixed?: boolean;
  immersive?: boolean;
}

export const Screen = forwardRef<HTMLDivElement, ScreenProps>(function Screen(
  { label, children, fixed, immersive, className, ...rest },
  ref,
) {
  return (
    <section aria-label={label} className={styles.screen} {...rest}>
      <div
        ref={ref}
        className={[fixed ? styles.fixed : styles.scroll, immersive ? styles.immersive : '', className]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </section>
  );
});

export function ScreenTitle({
  children,
  eyebrow,
  className,
}: {
  children: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={[styles.titleWrap, className].filter(Boolean).join(' ')}>
      {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
      <h2 className={styles.title}>{children}</h2>
    </header>
  );
}

export function Card({
  children,
  className,
  style,
  tone,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** notice = sun-yellow info box */
  tone?: 'default' | 'notice';
}) {
  return (
    <div className={[styles.card, tone === 'notice' ? styles.notice : '', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}

/** Uppercase little label above a title. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className={styles.eyebrow}>{children}</div>;
}
