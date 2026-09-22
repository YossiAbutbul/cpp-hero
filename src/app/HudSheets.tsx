/** Bodies of the streak and daily-quest sheets opened from the HUD chips. */
import type { CSSProperties } from 'react';
import { StreakFlame } from '@/ui/GameBits';
import { Icon } from '@/ui/Icon';
import { ProgressBar } from '@/ui/ProgressBar';
import { dayStr } from '@/engine/util';
import { useGame } from './gameContext';
import styles from './HudSheets.module.css';

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : one + 's'}`;

export function StreakInfo() {
  const { store } = useGame();
  const st = store.state.streak;
  const today = st.lastDay === dayStr();
  return (
    <div className="center">
      <StreakFlame days={st.days} big />
      <h2>{plural(st.days, 'day')}</h2>
      <p>
        {today
          ? 'You’ve practiced today. The flame is lit!'
          : 'Finish a lesson or practice today to keep your streak going.'}
      </p>
      <p className="muted">
        Best streak: <b>{st.best}</b> · Streak freezes: <b>{st.freezes}</b> / 3
      </p>
      <p className="muted small">Freezes protect a missed day. Earn one every 5 streak days or by finishing all quests.</p>
    </div>
  );
}

export function QuestsInfo() {
  const { store, game } = useGame();
  const s = store.state;
  const goal = s.profile.dailyGoalMin || 10;
  const mins = Math.floor(s.daily.minutes);
  return (
    <div>
      <div className={styles.goalRow}>
        <div
          className={styles.ring}
          style={{ '--p': Math.min(1, s.daily.minutes / goal) } as CSSProperties}
          aria-hidden="true"
        >
          <span>{Math.min(mins, goal)}</span>
        </div>
        <div>
          <b>Daily goal</b>
          <div className="muted">
            {Math.min(mins, goal)} of {goal} minutes today
          </div>
        </div>
      </div>
      <ul className={styles.list}>
        {s.daily.quests.map((q) => {
          const d = game.questDef(q.id) ?? { text: q.id, goal: 1, xp: 20 };
          return (
            <li key={q.id} className={q.done ? styles.done : undefined}>
              <span className={styles.qi}>
                <Icon name={q.done ? 'ok' : 'quest'} />
              </span>
              <div className={styles.qb}>
                <b>{d.text}</b>
                <ProgressBar value={q.progress} max={d.goal || 1} tone="sun" height={10} label={d.text} />
              </div>
              <span className={styles.qx}>
                {q.done ? 'Done' : `${Math.floor(q.progress)}/${d.goal || 1}`}
                <small>+{d.xp ?? 20} XP</small>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="muted small center">New quests every day. Finish all three to earn a streak freeze.</p>
    </div>
  );
}
