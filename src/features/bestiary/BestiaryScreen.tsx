/**
 * Bestiary tab (#/bestiary): every bug type, defeated ones revealed.
 * Tap a defeated bug for how it happens / how to prevent it.
 * Port of legacy screens.js `screens.bestiary`.
 */
import { useLayoutEffect, useRef } from 'react';
import { useGame } from '@/app/gameContext';
import type { Bug } from '@/content/schema';
import { BeastArt } from '@/ui/art/Art';
import { Icon } from '@/ui/Icon';
import { Screen, ScreenTitle } from '@/ui/Layout';
import { Md } from '@/ui/Md';
import { ProgressBar } from '@/ui/ProgressBar';
import { plural } from '@/ui/format';
import { popIn, wiggle } from '@/ui/fx/motion';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import styles from './bestiary.module.css';

const worldNum = (w: string) => w.replace(/^w/, '');

export function BestiaryScreen() {
  const { store, content } = useGame();
  const s = store.state;
  const list = content.bestiary.filter((b) => import.meta.env.DEV || !/^dev-/.test(b.id));
  const got = list.filter((b) => s.bestiary.includes(b.id)).length;
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gridRef.current?.querySelectorAll('button').forEach((el, i) => void popIn(el, Math.min(i, 12) * 40));
  }, []);

  return (
    <Screen label="Bug Bestiary">
      <ScreenTitle eyebrow="Bug Bestiary">
        Bugs defeated: {got} / {list.length}
      </ScreenTitle>
      <div className={styles.prog}>
        <ProgressBar value={got} max={Math.max(1, list.length)} tone="coral" label="Bugs defeated" />
      </div>
      <div className={styles.grid} ref={gridRef}>
        {list.map((b) => (
          <BeastTile key={b.id} bug={b} have={s.bestiary.includes(b.id)} />
        ))}
      </div>
      {!got && <p className={styles.hint}>Squash bugs in lessons to fill your Bestiary.</p>}
    </Screen>
  );
}

function BeastTile({ bug, have }: { bug: Bug; have: boolean }) {
  const { store } = useGame();
  const dialog = useDialog();
  const ref = useRef<HTMLButtonElement>(null);
  const where = `World ${worldNum(bug.world)}`;
  const squashed = store.state.counters.byTag[`bug:${bug.id}`]?.r ?? 0;

  const open = () => {
    if (!have) {
      wiggle(ref.current);
      toast(`Defeat this bug in ${where} to reveal it.`, { icon: 'bug' });
      return;
    }
    dialog.sheet({
      title: bug.name,
      body: (
        <div className={styles.detail}>
          <BeastArt kind={bug.art} color={bug.color} className={styles.detailArt} label={bug.name} />
          <p className={styles.meta}>
            First met in {where}
            {squashed > 0 && ` · squashed ${plural(squashed, 'time')}`}
          </p>
          <h4>
            <Icon name="alert" size={18} /> How it happens
          </h4>
          <p>
            <Md text={bug.how} />
          </p>
          <h4>
            <Icon name="shield" size={18} /> How to prevent it
          </h4>
          <p>
            <Md text={bug.prevent} />
          </p>
        </div>
      ),
    });
  };

  return (
    <button
      ref={ref}
      type="button"
      className={[styles.beast, have ? '' : styles.locked].join(' ')}
      aria-label={have ? `${bug.name}, defeated. Show details.` : `Undiscovered bug from ${where}`}
      onClick={open}
    >
      <span className={styles.art}>
        <BeastArt kind={bug.art} color={bug.color} locked={!have} />
        {!have && (
          <span className={styles.q} aria-hidden="true">
            ?
          </span>
        )}
      </span>
      <b>{have ? bug.name : '???'}</b>
      <small>{where}</small>
    </button>
  );
}
