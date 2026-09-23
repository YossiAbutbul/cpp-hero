/**
 * Stats panel (#/stats, header toggle): headline tiles, accuracy per skill
 * (strongest / needs practice + topics to review), world progress and
 * achievements. Port of legacy screens.js `screens.stats`.
 */
import { useLayoutEffect, useRef } from 'react';
import { useGame } from '@/app/gameContext';
import type { Skill } from '@/content/schema';
import { SKILLS } from '@/engine/game';
import { CountUp } from '@/ui/CountUp';
import { Expander } from '@/ui/Expander';
import { Icon, type IconName } from '@/ui/Icon';
import { Card, Screen, ScreenTitle } from '@/ui/Layout';
import { fmtDuration, plural } from '@/ui/format';
import { stagger } from '@/ui/fx/motion';
import { SKILL_COLOR, SKILL_NAMES, tagLabel } from './skillMeta';
import { StatBar } from './StatBar';
import styles from './stats.module.css';
import { useDelayedFlag } from './useDelayedFlag';

type Tone = 'sky' | 'teal' | 'coral' | 'tang' | 'sun';
interface TileDef {
  label: string;
  icon: IconName;
  tone: Tone;
  value: number;
  format?: (n: number) => string;
}

const pct = (r: number, w: number) => (r + w ? Math.round((100 * r) / (r + w)) : 0);

export function StatsScreen() {
  const { store, game, content } = useGame();
  const s = store.state;
  const c = s.counters;
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const els = ref.current?.querySelectorAll('[data-lift]');
    if (els?.length) stagger(els, { duration: 200 });
  }, []);

  // accuracy per skill (tag → skill of the first lesson that uses it)
  const idx = new Map<string, Skill>();
  for (const w of game.worlds())
    for (const l of w.lessons)
      for (const ch of l.challenges) for (const t of ch.tags) if (!idx.has(t)) idx.set(t, l.skill);
  const perSkill: Partial<Record<Skill, { r: number; w: number }>> = {};
  const topics: { tag: string; r: number; w: number }[] = [];
  for (const [tag, v] of Object.entries(c.byTag)) {
    if (tag.startsWith('bug:')) continue;
    const sk = idx.get(tag) ?? 'structure';
    const p = (perSkill[sk] ??= { r: 0, w: 0 });
    p.r += v.r;
    p.w += v.w;
    topics.push({ tag, r: v.r, w: v.w });
  }
  const ranked = SKILLS.filter((k) => {
    const p = perSkill[k];
    return p && p.r + p.w >= 3;
  })
    .map((k) => ({ k, a: pct(perSkill[k]!.r, perSkill[k]!.w) }))
    .sort((a, b) => b.a - a.a);
  const weakTopics = topics
    .filter((t) => t.r + t.w >= 2 && pct(t.r, t.w) < 80)
    .sort((a, b) => pct(a.r, a.w) - pct(b.r, b.w) || b.w - a.w)
    .slice(0, 6);

  const tiles: TileDef[] = [
    { label: 'Time spent', icon: 'clock', tone: 'sky', value: c.secondsPlayed, format: fmtDuration },
    { label: 'Lessons done', icon: 'vault', tone: 'teal', value: game.lessonsDone().length },
    {
      label: 'Accuracy',
      icon: 'target',
      tone: 'coral',
      value: pct(c.correct, c.wrong),
      format: (n) => `${n}%`,
    },
    {
      label: 'Bugs defeated',
      icon: 'bug',
      tone: 'tang',
      value: s.bestiary.filter((id) => content.bestiary.some((b) => b.id === id)).length,
    },
    { label: 'Best combo', icon: 'bolt', tone: 'sun', value: c.bestCombo, format: (n) => `x${n}` },
    {
      label: 'Best streak',
      icon: 'flame',
      tone: 'tang',
      value: s.streak.best,
      format: (n) => plural(n, 'day'),
    },
    { label: 'Hardened', icon: 'shield', tone: 'teal', value: c.hardened },
    { label: 'Reviews', icon: 'practice', tone: 'sky', value: c.reviews },
  ];

  const achs = content.achievements;
  const gotAch = achs.filter((a) => s.achievements[a.id]).length;
  // unlocked first (newest first), then locked in content order; long tail behind "Show more"
  const ordered = [
    ...achs
      .filter((a) => s.achievements[a.id])
      .sort((a, b) => s.achievements[b.id]!.localeCompare(s.achievements[a.id]!)),
    ...achs.filter((a) => !s.achievements[a.id]),
  ];
  const cut = Math.max(gotAch, 0) + 4;
  const shown = ordered.slice(0, cut);
  const rest = ordered.slice(cut);
  const achItem = (a: (typeof achs)[number]) => {
    const at = s.achievements[a.id];
    return (
      <div key={a.id} className={[styles.ach, at ? styles.got : ''].join(' ')}>
        <span className={styles.achIc}>
          <Icon name={at ? 'trophy' : 'lock'} />
        </span>
        <div>
          <b>{a.name}</b>
          <small>
            {a.desc}
            {at && <span className={styles.date}> · {new Date(at).toLocaleDateString()}</span>}
          </small>
          <span className="sr">{at ? 'Unlocked' : 'Locked'}</span>
        </div>
      </div>
    );
  };

  return (
    <Screen label="Stats" ref={ref}>
      <ScreenTitle eyebrow="Stats">Your journey</ScreenTitle>
      <div className={styles.tiles}>
        {tiles.map((t, i) => (
          <Tile key={t.label} t={t} delay={180 + i * 40} />
        ))}
      </div>

      <div data-lift>
        <Card>
          <h3>Accuracy by skill</h3>
          {SKILLS.map((k, i) => {
            const p = perSkill[k];
            const n = p ? p.r + p.w : 0;
            return (
              <StatBar
                key={k}
                label={SKILL_NAMES[k]}
                aria={`${SKILL_NAMES[k]} accuracy`}
                value={n ? pct(p!.r, p!.w) : 0}
                color={SKILL_COLOR[k]}
                delay={220 + i * 70}
                format={(v) => `${v}%`}
                empty={n ? undefined : '–'}
              />
            );
          })}
          {ranked.length >= 2 ? (
            <div className={styles.best}>
              <div className={[styles.bestItem, styles.strong].join(' ')}>
                <small>
                  <Icon name="trophy" size={14} /> Strongest
                </small>
                <b>{SKILL_NAMES[ranked[0]!.k]}</b>
              </div>
              <div className={[styles.bestItem, styles.weak].join(' ')}>
                <small>
                  <Icon name="target" size={14} /> Needs practice
                </small>
                <b>{SKILL_NAMES[ranked[ranked.length - 1]!.k]}</b>
              </div>
            </div>
          ) : (
            <p className="muted small">Answer more challenges to see your strongest and weakest skills.</p>
          )}
          {weakTopics.length > 0 && (
            <Expander label="Topics to review">
              <div className={styles.topics}>
                {weakTopics.map((t) => (
                  <span key={t.tag} className={styles.topic}>
                    {tagLabel(t.tag)} <span>{pct(t.r, t.w)}%</span>
                  </span>
                ))}
              </div>
            </Expander>
          )}
        </Card>
      </div>

      <div data-lift>
        <Card>
          <h3>World progress</h3>
          {game.worlds().map((w, i) => {
            const nodes = game.nodes(w);
            const d = nodes.filter((n) => n.done).length;
            return (
              <StatBar
                key={w.id}
                label={`W${w.num}`}
                aria={`World ${w.num} progress`}
                value={d}
                max={nodes.length}
                color="var(--tang)"
                delay={240 + Math.min(i, 10) * 50}
                format={(n) => `${n}/${nodes.length}`}
              />
            );
          })}
        </Card>
      </div>

      <div data-lift>
        <Card>
          <div className={styles.cardH}>
            <h3>Achievements</h3>
            <span className={styles.achHead}>
              {gotAch}/{achs.length}
            </span>
          </div>
          <div className={styles.achGrid}>{shown.map(achItem)}</div>
          {rest.length > 0 && (
            <Expander label={`Show ${rest.length} more`}>
              <div className={styles.achGrid}>{rest.map(achItem)}</div>
            </Expander>
          )}
        </Card>
      </div>
    </Screen>
  );
}

function Tile({ t, delay }: { t: TileDef; delay: number }) {
  const go = useDelayedFlag(delay);
  return (
    <div className={[styles.tile, styles[t.tone]].join(' ')} data-lift>
      <div className={styles.tileL}>
        <Icon name={t.icon} size={14} />
        {t.label}
      </div>
      <div className={styles.tileV}>
        <CountUp value={go ? t.value : 0} from={0} duration={500} format={t.format} />
      </div>
    </div>
  );
}
