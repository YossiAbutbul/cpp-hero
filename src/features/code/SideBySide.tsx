/**
 * Unsafe vs. hardened comparison (shown after every defensive challenge).
 * Stacked on phones; two columns only when the container is ≥ 700px wide.
 * The hardened side marks changed lines with "+".
 *
 *   <SideBySide unsafe={ch.sideBySide.unsafe} hardened={ch.sideBySide.hardened} />
 *   <SideBySide {...ch.sideBySide} compact />
 */
import { Icon } from '@/ui/Icon';
import { CodeBlock } from './CodeBlock';
import styles from './code.module.css';

export interface SideBySideProps {
  unsafe: string;
  hardened: string;
  title?: string;
  /** smaller code text (inside result cards) */
  compact?: boolean;
  className?: string;
}

export function SideBySide({ unsafe, hardened, title = 'Unsafe vs. hardened', compact, className }: SideBySideProps) {
  return (
    <div className={[styles.sbs, compact ? styles.compact : '', className].filter(Boolean).join(' ')}>
      <div className={styles.sbsTitle}>
        <Icon name="shieldO" /> {title}
      </div>
      <div className={styles.sbsGrid}>
        <CodeBlock code={unsafe} unsafe label="Unsafe version" />
        <CodeBlock code={hardened} safe label="Hardened version" diffAgainst={unsafe} caption="+ marks the fix" />
      </div>
    </div>
  );
}

/** "UB doesn't guarantee a crash" reminder. */
export function UbNote() {
  return (
    <div className={styles.ubnote} role="note">
      <Icon name="info" />
      <span>Undefined behavior doesn’t guarantee a crash. It can seem to work, then fail later or on another compiler.</span>
    </div>
  );
}
