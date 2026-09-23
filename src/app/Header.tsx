/**
 * Top bar (mini Curlo + brand, Stats / Settings toggles whose icons morph
 * into an X while open) and the HUD (streak, quests, XP/level).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Curlo } from '@/features/curlo/Curlo';
import { MorphIconButton } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { CountUp } from '@/ui/CountUp';
import { bounce, reduced } from '@/ui/fx/motion';
import { StreakFlame } from '@/ui/GameBits';
import { Icon } from '@/ui/Icon';
import { useDialog } from '@/ui/overlay/dialogContext';
import { overlayCount } from '@/ui/overlay/overlay';
import { ProgressBar } from '@/ui/ProgressBar';
import { levelInfo } from '@/engine/progress';
import { useGame } from './gameContext';
import { QuestsInfo, StreakInfo } from './HudSheets';
import { goBack, navigate } from './navigation';
import type { RouteHandle } from './routeMeta';
import styles from './shell.module.css';

type Panel = 'stats' | 'settings';

export function Header({ handle }: { handle: RouteHandle }) {
  const { store } = useGame();
  const dialog = useDialog();
  const s = store.state;
  const panel = handle.panel;
  const q = s.daily.quests;
  const qd = q.filter((x) => x.done).length;

  const toggle = (name: Panel, btn: HTMLButtonElement) => {
    if (panel === name) goBack('/', { dir: 'close' });
    else if (panel) navigate(`/${name}`, { dir: 'fade', replace: true, origin: btn });
    else navigate(`/${name}`, { dir: 'expand', origin: btn });
  };

  // Esc closes an open panel (unless a dialog/sheet is on top)
  const panelRef = useRef(panel);
  useLayoutEffect(() => {
    panelRef.current = panel;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || overlayCount() > 0 || !panelRef.current) return;
      e.preventDefault();
      goBack('/', { dir: 'close' });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandC} aria-hidden="true">
            <Curlo />
          </span>
          <span>Cpp Hero</span>
        </div>
        <MorphIconButton
          icon="stats"
          label="Stats"
          open={panel === 'stats'}
          data-origin-id="hdr-stats"
          onClick={(e) => toggle('stats', e.currentTarget)}
        />
        <MorphIconButton
          icon="settings"
          label="Settings"
          open={panel === 'settings'}
          data-origin-id="hdr-settings"
          onClick={(e) => toggle('settings', e.currentTarget)}
        />
      </div>
      <div className={styles.hud} aria-label="Player status" role="group">
        <div className={styles.hudRow}>
          <Chip
            lead={<StreakFlame days={s.streak.days} />}
            label={`Streak: ${s.streak.days} days, ${s.streak.freezes} freezes`}
            onClick={() => dialog.sheet({ title: 'Daily streak', body: <StreakInfo /> })}
          >
            <span>{s.streak.days}</span>
            {s.streak.freezes > 0 && (
              <span className={styles.frz}>
                <Icon name="freeze" />
                {s.streak.freezes}
              </span>
            )}
          </Chip>
          <Chip
            className={styles.quests}
            icon="quest"
            tone={qd === q.length && q.length ? 'hot' : 'default'}
            label={`Daily quests: ${qd} of ${q.length} done`}
            onClick={() => dialog.sheet({ title: 'Daily quests', body: <QuestsInfo /> })}
          >
            {qd}/{q.length}
          </Chip>
        </div>
        <XpBar xp={s.xp} />
      </div>
    </>
  );
}

/** Level badge + springy XP bar; a level-up fills the bar, then restarts it at the new level. */
function XpBar({ xp }: { xp: number }) {
  const info = levelInfo(xp);
  const [shownLevel, setShownLevel] = useState(info.level);
  const badge = useRef<HTMLSpanElement>(null);
  const levelingUp = info.level > shownLevel;

  useEffect(() => {
    if (info.level === shownLevel) return;
    const t = window.setTimeout(
      () => {
        setShownLevel(info.level);
        void bounce(badge.current);
      },
      info.level > shownLevel && !reduced() ? 450 : 0,
    );
    return () => clearTimeout(t);
  }, [info.level, shownLevel]);

  return (
    <div className={styles.xp}>
      <span ref={badge} className={styles.lvlBadge}>
        Lv {shownLevel}
      </span>
      <ProgressBar
        key={shownLevel}
        value={levelingUp ? 1 : info.into}
        max={levelingUp ? 1 : info.need}
        label="Experience toward next level"
      />
      <span className={styles.xpnum}>
        {levelingUp ? (
          'Level up!'
        ) : (
          <CountUp key={shownLevel} value={info.into} from={0} format={(n) => `${n} / ${info.need}`} />
        )}
      </span>
    </div>
  );
}
