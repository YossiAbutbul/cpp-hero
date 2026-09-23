/** Dev-only settings card (import.meta.env.DEV): shortcuts for testing the collection screens. */
import { useGame } from '@/app/gameContext';
import { SKILLS } from '@/engine/game';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Layout';
import { requestCelebrations, showCelebration } from '@/ui/fx/celebrationQueue';
import { toast } from '@/ui/toast';
import styles from './settings.module.css';

export function DevTools() {
  const { store, game, content, update } = useGame();
  const s = store.state;
  const tools: [string, () => void][] = [
    ['+150 XP', () => (game.addXP(150, 'dev'), void requestCelebrations())],
    ['Defense +20', () => (game.gainStat('defense', 20), void requestCelebrations())],
    ['All stats +15', () => SKILLS.forEach((k) => game.gainStat(k, 15))],
    [
      'Unlock all worlds',
      () =>
        update((x) => {
          for (const w of game.worlds()) if (!x.worldsUnlocked.includes(w.id)) x.worldsUnlocked.push(w.id);
        }),
    ],
    [
      'Grant all cosmetics',
      () => {
        for (const c of game.cosmeticDefs())
          if (!s.cosmetics.owned.includes(c.id)) s.cosmetics.owned.push(c.id);
        update(() => {});
      },
    ],
    [
      'Collect vault + bugs',
      () =>
        update((x) => {
          for (const w of game.worlds())
            for (const l of w.lessons)
              for (const v of l.vault) if (!x.vault.includes(v.id)) x.vault.push(v.id);
          for (const b of content.bestiary) if (!x.bestiary.includes(b.id)) x.bestiary.push(b.id);
        }),
    ],
    [
      'Evolution sequence',
      () => {
        const f = game.curloForm();
        void showCelebration({ type: 'evolve', from: f, to: f >= 3 ? 1 : ((f + 1) as 2 | 3) });
      },
    ],
    [
      'Replay onboarding',
      () => {
        update((x) => void (x.profile.onboarded = false));
        toast('Onboarding reset');
      },
    ],
  ];
  return (
    <Card>
      <h3>Developer tools</h3>
      <div className={styles.devGrid}>
        {tools.map(([label, fn]) => (
          <Button key={label} variant="ghost" size="small" onClick={fn}>
            {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
