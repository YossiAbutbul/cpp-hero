/**
 * Curlo tab (#/curlo): the buddy hero (poke, chat, rename), hero stats,
 * shield gear tier, evolution forms and the wardrobe (hats, colors, shield
 * skins). Port of legacy screens.js `screens.buddy`.
 */
import { useRef, useState } from 'react';
import { useGame } from '@/app/gameContext';
import type { Cosmetic } from '@/content/schema';
import { SKILLS } from '@/engine/game';
import { SKILL_COLOR, SKILL_NAMES } from '@/features/stats/skillMeta';
import { StatBar } from '@/features/stats/StatBar';
import { AutoGrowInput } from '@/ui/AutoGrowInput';
import { Button, IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Card, Eyebrow, Screen } from '@/ui/Layout';
import { bounce, wiggle } from '@/ui/fx/motion';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import { Curlo, type CurloCosmetics } from './Curlo';
import { FORMS, TIERS, type CurloFormN } from './curloArt';
import { SpeechBubble } from './SpeechBubble';
import { useCurloReact } from './useCurloReact';
import { curloLine } from './voice';
import styles from './CurloScreen.module.css';

type Slot = Cosmetic['slot'];
const SLOTS: { slot: Slot; title: string }[] = [
  { slot: 'hat', title: 'Hats' },
  { slot: 'color', title: 'Colors' },
  { slot: 'shield', title: 'Shield skins' },
];

export function CurloScreen() {
  const { store, game, update } = useGame();
  const s = store.state;
  const name = s.profile.name || 'Curlo';
  const buddy = useCurloReact('happy');
  const [line, setLine] = useState(() => curloLine('idle'));
  const [lineKey, setLineKey] = useState(0);
  const say = (t: string) => {
    setLine(t);
    setLineKey((k) => k + 1);
  };
  const dialog = useDialog();

  const tier = game.shieldTier();
  const form = game.curloForm();
  const T = TIERS[tier];
  const F = FORMS[form];
  const next = form < 3 ? FORMS[(form + 1) as CurloFormN] : null;

  const chat = () => {
    const st = s.streak.days;
    say(st >= 2 && Math.random() < 0.3 ? curloLine('streak', { n: st }) : curloLine('idle'));
    buddy.react(Math.random() < 0.5 ? 'celebrate' : 'thinking', 1000);
  };

  const rename = async () => {
    let value = name;
    const v = await dialog.open<'save' | null>({
      title: 'Rename your buddy',
      mood: 'thinking',
      body: (close) => (
        <RenameField initial={name} onChange={(x) => (value = x)} onEnter={() => close('save')} />
      ),
      buttons: [
        { label: 'Save', value: 'save' },
        { label: 'Cancel', value: null, variant: 'ghost' },
      ],
    });
    if (v !== 'save') return;
    const clean = value.replace(/\s+/g, ' ').trim().slice(0, 16) || 'Curlo';
    update((st) => void (st.profile.name = clean));
    say(`${clean}? I love it!`);
    buddy.react('celebrate', 1000);
  };

  return (
    <Screen label={name}>
      <div className={styles.hero}>
        <div className={styles.halo}>
          <span className={styles.spark} style={{ left: 18, top: 40 }} />
          <span className={styles.spark} style={{ right: 22, top: 24, animationDelay: '-.8s' }} />
          <span className={styles.spark} style={{ right: 10, bottom: 52, animationDelay: '-1.6s' }} />
          <Curlo
            {...buddy.props}
            size={190}
            pokeLabel={`Poke ${name}`}
            onPoke={() => say(curloLine('poke'))}
          />
        </div>
        <div className={styles.nameplate}>
          <h2>{name}</h2>
          <span className={styles.lvl}>Lv {s.level}</span>
          <IconButton icon="wand" label="Rename" size="small" onClick={() => void rename()} />
        </div>
        <SpeechBubble tail="bottom" popKey={lineKey} text={line} className={styles.say} />
        <div className={styles.talk}>
          <Button variant="sun" onClick={chat}>
            Chat with {name}
          </Button>
        </div>
      </div>

      <Card>
        <h3>Hero stats</h3>
        {SKILLS.map((k, i) => (
          <StatBar
            key={k}
            label={SKILL_NAMES[k]}
            value={s.stats[k]}
            color={SKILL_COLOR[k]}
            delay={260 + i * 90}
          />
        ))}
      </Card>

      <Card className={styles.gear}>
        <div className={styles.gsvg}>
          <Curlo mood="bracing" />
        </div>
        <div className={styles.gearText}>
          <Eyebrow>
            <span className={styles.tealEyebrow}>Defense gear</span>
          </Eyebrow>
          <h3>{T.name}</h3>
          <p className="muted small">
            Tier {tier} of 3 · Defense {Math.round(s.stats.defense)}. {tier < 3 ? `Next: ${T.next}.` : T.next}
          </p>
          <div className={styles.tierdots} aria-hidden="true">
            {[1, 2, 3].map((t) => (
              <i key={t} className={t <= tier ? styles.on : undefined} />
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <Eyebrow>Evolution</Eyebrow>
        <h3>
          Form {form}: {F.name}
        </h3>
        <p className="muted small">
          {F.gear}. {next ? `Next form after World ${next.after}’s boss.` : 'Final form reached!'}
        </p>
        <div className={styles.evoRow}>
          {([1, 2, 3] as const).map((f) => (
            <div
              key={f}
              className={[styles.evoF, f === form ? styles.on : '', f > form ? styles.locked : ''].join(' ')}
            >
              <div className={styles.evoM}>
                <Curlo form={f} cosmetics={{ hat: null }} silhouette={f > form} />
              </div>
              <small>
                {f > form && <Icon name="lock" size={12} />} {FORMS[f].name}
              </small>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3>Wardrobe</h3>
        {SLOTS.map(({ slot, title }) => (
          <WardrobeSection
            key={slot}
            slot={slot}
            title={title}
            onEquip={() => buddy.react('celebrate', 900)}
          />
        ))}
      </Card>
    </Screen>
  );
}

function RenameField({
  initial,
  onChange,
  onEnter,
}: {
  initial: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <AutoGrowInput
      variant="field"
      label="Name"
      value={v}
      maxLength={16}
      minCh={10}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(x) => {
        const t = x.replace(/\n/g, '').slice(0, 16);
        setV(t);
        onChange(t);
      }}
      onEnter={onEnter}
    />
  );
}

interface Item {
  id: string | null;
  name: string;
  source?: string;
}

function WardrobeSection({ slot, title, onEquip }: { slot: Slot; title: string; onEquip: () => void }) {
  const { store, game } = useGame();
  const s = store.state;
  const eq = s.cosmetics.equipped;
  const owned = s.cosmetics.owned;
  const defs = game.cosmeticDefs().filter((c) => c.slot === slot);
  const list: Item[] = defs.map((c) => ({ id: c.id, name: c.name, source: c.source }));
  if (slot === 'hat') list.unshift({ id: null, name: 'No hat' });
  if (slot === 'shield') list.unshift({ id: null, name: 'Tier shield' });
  if (slot === 'color' && !list.some((c) => c.id === 'classic'))
    list.unshift({ id: 'classic', name: 'Classic Tangerine' });
  const have = list.filter((c) => c.id === null || c.id === 'classic' || owned.includes(c.id)).length;

  return (
    <section className={styles.wrSec} aria-label={title}>
      <div className={styles.wrHead}>
        <Eyebrow>{title}</Eyebrow>
        <span className={styles.wrCount}>
          {have}/{list.length}
        </span>
      </div>
      <div className={styles.wrGrid}>
        {list.map((c) => {
          const got = c.id === null || c.id === 'classic' || owned.includes(c.id);
          const on = slot === 'color' ? (eq.color || 'classic') === c.id : (eq[slot] ?? null) === c.id;
          return (
            <WardrobeItem
              key={c.id ?? 'none'}
              slot={slot}
              item={c}
              got={got}
              on={on}
              onPick={() => {
                game.equip(slot, c.id);
                onEquip();
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

function WardrobeItem({
  slot,
  item,
  got,
  on,
  onPick,
}: {
  slot: Slot;
  item: Item;
  got: boolean;
  on: boolean;
  onPick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const cos: CurloCosmetics =
    slot === 'hat'
      ? { hat: item.id }
      : slot === 'color'
        ? { hat: null, color: item.id }
        : { hat: null, shield: item.id };
  const how = item.source ?? 'Keep playing to unlock';
  return (
    <button
      ref={ref}
      type="button"
      className={[styles.wrItem, on ? styles.on : '', got ? '' : styles.locked].join(' ')}
      aria-pressed={got ? on : undefined}
      aria-label={item.name + (got ? (on ? ', equipped' : ', tap to wear') : `, locked. ${how}`)}
      onClick={() => {
        if (!got) {
          wiggle(ref.current);
          toast(`Locked: ${how}`, { icon: 'lock' });
          return;
        }
        if (on) {
          bounce(ref.current);
          return;
        }
        onPick();
        bounce(ref.current);
      }}
    >
      <span className={styles.wrPrev}>
        <Curlo cosmetics={cos} mood={slot === 'shield' ? 'bracing' : 'happy'} silhouette={!got} />
      </span>
      <small>{item.name}</small>
      {!got && (
        <span className={styles.wrLock}>
          <Icon name="lock" size={16} />
        </span>
      )}
      {on && (
        <span className={styles.wrOn}>
          <Icon name="check" size={14} />
        </span>
      )}
    </button>
  );
}
