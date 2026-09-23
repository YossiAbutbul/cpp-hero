/**
 * Dev-only component gallery: #/dev/ui (compiled out of production builds).
 * Every shared primitive in one scrollable page, for eyeballing at 360px
 * and desktop and for copy-paste usage examples.
 */
import { useState, type ReactNode } from 'react';
import { navigate } from '@/app/navigation';
import type { Demo } from '@/content/schema';
import { CodeBlock } from '@/features/code/CodeBlock';
import { CodeDemo } from '@/features/code/CodeDemo';
import { SideBySide, UbNote } from '@/features/code/SideBySide';
import { Curlo } from '@/features/curlo/Curlo';
import { CURLO_MOODS, type CurloFormN, type CurloTier } from '@/features/curlo/curloArt';
import { CurloSays, SpeechBubble } from '@/features/curlo/SpeechBubble';
import { useCurloReact } from '@/features/curlo/useCurloReact';
import { curloLine } from '@/features/curlo/voice';
import { BeastArt, BossArt, WorldIcon } from '@/ui/art/Art';
import { BEAST_KEYS, BOSS_KEYS, WORLD_ICON_KEYS } from '@/ui/art/artSvg';
import { AutoGrowInput } from '@/ui/AutoGrowInput';
import { Button, IconButton, MorphIconButton } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { CountUp } from '@/ui/CountUp';
import { Expander } from '@/ui/Expander';
import { showCelebration } from '@/ui/fx/celebrationQueue';
import { burstAt, flash, floatText, rain } from '@/ui/fx/effects';
import { bounce, shake, wiggle } from '@/ui/fx/motion';
import { ComboMeter, Hearts, StreakFlame } from '@/ui/GameBits';
import { Icon } from '@/ui/Icon';
import { ICON_NAMES } from '@/ui/icons';
import { Card, Screen, ScreenTitle } from '@/ui/Layout';
import { useDialog } from '@/ui/overlay/dialogContext';
import { Sheet } from '@/ui/overlay/Sheet';
import { ProgressBar } from '@/ui/ProgressBar';
import { Tabs } from '@/ui/Tabs';
import { toast } from '@/ui/toast';
import styles from './UiGallery.module.css';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h3 className={styles.h}>{title}</h3>
      {children}
    </Card>
  );
}

const DEMO: Pick<Demo, 'code' | 'steps'> = {
  code: '#include <iostream>\n\nint main() {\n    int hp;\n    hp = 3;\n    std::cout << "HP: " << hp << \'\\n\';\n    return 0;\n}',
  steps: [
    { line: 2, note: 'Execution starts at **main()**.' },
    { line: 3, vars: { hp: '?' }, note: 'Declared but not set: garbage!' },
    { line: 4, vars: { hp: '3' }, note: 'Now `hp` holds 3.' },
    { line: 5, out: 'HP: 3\n', note: 'cout prints it.' },
    { line: 6, note: 'return 0 means success.' },
  ],
};
const CRASH_DEMO: Pick<Demo, 'code' | 'steps'> = {
  code: 'int arr[3] = {1, 2, 3};\nint i = 3;\nstd::cout << arr[i];',
  steps: [
    { line: 0, vars: { 'arr[0]': '1', i: '?' }, note: 'Three slots: 0, 1, 2.' },
    { line: 1, vars: { i: '3' }, note: 'Index 3 is one past the end.' },
    { line: 2, crash: 'Out-of-bounds read: undefined behavior', note: 'Reading past the end is UB.' },
  ],
};
const SHIELD_DEMO: Pick<Demo, 'code' | 'steps'> = {
  code: 'std::vector<int> v{1, 2, 3};\nstd::size_t i = 3;\nif (i < v.size()) std::cout << v.at(i);\nelse std::cout << "Blocked!";',
  steps: [
    { line: 1, vars: { i: '3' }, note: 'Same bad index.' },
    { line: 2, note: 'Check first. Trust no index.' },
    { line: 3, out: 'Blocked!\n', shield: 'Bounds check deflected the bad index', note: 'Shield up!' },
  ],
};
const LONG =
  'std::cout << "This line is deliberately long so it has to wrap inside the block, keeping one line number and a hanging indent" << \'\\n\';';

export default function UiGallery() {
  const dialog = useDialog();
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [n, setN] = useState(3);
  const [combo, setCombo] = useState(0);
  const [fill, setFill] = useState('');
  const [line, setLine] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<CurloTier>(1);
  const [form, setForm] = useState<CurloFormN>(1);
  const [hurt, setHurt] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const c = useCurloReact();
  const [say, setSay] = useState(curloLine('greet'));

  return (
    <Screen label="UI gallery">
      <ScreenTitle eyebrow="Dev only · #/dev/ui">UI gallery</ScreenTitle>

      <Section title="Buttons">
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="teal" icon="play">
            Teal
          </Button>
          <Button variant="sun">Sun</Button>
          <Button variant="coral" icon="swords">
            Coral
          </Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className={styles.row}>
          <Button size="small" icon="retype">
            Small
          </Button>
          <Button size="small" variant="ghost">
            Small ghost
          </Button>
          <IconButton icon="x" label="Close" />
          <IconButton icon="back" label="Back" size="small" />
          <MorphIconButton icon="settings" label="Settings" open={open} onClick={() => setOpen(!open)} />
          <MorphIconButton icon="stats" label="Stats" open={open} onClick={() => setOpen(!open)} />
        </div>
        <Button block variant="teal" icon="play">
          Block / big
        </Button>
      </Section>

      <Section title="Chips + game bits">
        <div className={styles.row}>
          <Chip icon="quest" onClick={() => toast('Chip tapped', { icon: 'quest' })} label="Quests">
            1/3
          </Chip>
          <Chip tone="hot" icon="quest">
            3/3
          </Chip>
          <Chip tone="teal" icon="check">
            Done
          </Chip>
          <Chip lead={<StreakFlame days={12} />}>12</Chip>
          <ComboMeter combo={combo} multiplier={combo >= 10 ? 3 : combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1} />
        </div>
        <div className={styles.row}>
          <Button size="small" variant="ghost" onClick={() => setN((x) => Math.max(0, x - 1))}>
            Lose heart
          </Button>
          <Button size="small" variant="ghost" onClick={() => setN((x) => Math.min(5, x + 1))}>
            Gain heart
          </Button>
          <Button size="small" variant="ghost" onClick={() => setCombo((x) => x + 1)}>
            Combo +1
          </Button>
          <Button size="small" variant="ghost" onClick={() => setCombo(0)}>
            Reset combo
          </Button>
        </div>
        <Hearts n={n} max={5} size={28} />
      </Section>

      <Section title="ProgressBar + CountUp">
        <ProgressBar value={n} max={5} label="Hearts" />
        <div style={{ height: 8 }} />
        <ProgressBar value={n} max={5} tone="teal" height={22}>
          {n} / 5 min today
        </ProgressBar>
        <p>
          XP: <CountUp value={n * 137} /> · <CountUp value={n * 20} format={(v) => `${v}%`} />
        </p>
      </Section>

      <Section title="Tabs + Expander">
        <Tabs
          label="Demo tabs"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'a', label: 'Cards', icon: 'vault', panel: <p>First panel.</p> },
            { id: 'b', label: 'Defense Rules', icon: 'shieldO', panel: <p>Second panel, slides by direction.</p> },
            { id: 'c', label: 'Third', panel: <p>Third.</p> },
          ]}
        />
        <p>
          <b>Short text by default.</b>
        </p>
        <Expander>
          <p>
            The long explanation lives here, one tap away. It animates open and closed, and closed content can’t take
            focus.
          </p>
        </Expander>
      </Section>

      <Section title="Dialogs, sheets, toasts">
        <div className={styles.row}>
          <Button
            size="small"
            onClick={async () => {
              const ok = await dialog.confirm({ title: 'Reset progress?', body: <p>This can’t be undone.</p>, danger: true });
              toast(ok ? 'Confirmed' : 'Cancelled');
            }}
          >
            Confirm
          </Button>
          <Button
            size="small"
            variant="teal"
            onClick={async () => {
              const v = await dialog.open({
                title: 'Knocked out!',
                mood: 'worried',
                body: <p>{curloLine('knockedOut')}</p>,
                buttons: [
                  { label: 'Try again', value: 'retry', variant: 'coral', icon: 'swords' },
                  { label: 'Back to map', value: 'map', variant: 'ghost' },
                ],
              });
              toast(`Picked: ${String(v)}`);
            }}
          >
            Dialog
          </Button>
          <Button
            size="small"
            variant="sun"
            onClick={() =>
              dialog.sheet({
                title: 'A sheet',
                body: (close) => (
                  <>
                    <p>Swipe the handle down, tap outside, press Esc, or:</p>
                    <Button block onClick={close}>
                      Close me
                    </Button>
                  </>
                ),
              })
            }
          >
            Sheet (API)
          </Button>
          <Button size="small" variant="ghost" onClick={() => setSheetOpen(true)}>
            Sheet (component)
          </Button>
          <Button size="small" variant="ghost" onClick={() => toast('New world unlocked!', { icon: 'map' })}>
            Toast
          </Button>
        </div>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Declarative sheet">
          <p>Rendered from state with &lt;Sheet open onClose&gt;.</p>
        </Sheet>
      </Section>

      <Section title="FX">
        <div className={styles.row}>
          <Button size="small" onClick={(e) => burstAt(e.currentTarget, { n: 80 })}>
            Burst
          </Button>
          <Button size="small" variant="teal" onClick={() => rain(140)}>
            Rain
          </Button>
          <Button size="small" variant="coral" onClick={(e) => (void flash(), void shake(e.currentTarget))}>
            Flash + shake
          </Button>
          <Button size="small" variant="ghost" onClick={(e) => void bounce(e.currentTarget)}>
            Bounce
          </Button>
          <Button size="small" variant="ghost" onClick={(e) => void wiggle(e.currentTarget)}>
            Wiggle
          </Button>
          <Button size="small" variant="sun" onClick={(e) => floatText(e.currentTarget, '+20 XP')}>
            +XP
          </Button>
        </div>
        <h4>Celebrations (tap to skip)</h4>
        <div className={styles.row}>
          <Button size="small" onClick={() => void showCelebration({ type: 'levelup', level: 5 })}>
            Level up
          </Button>
          <Button
            size="small"
            variant="teal"
            onClick={() =>
              void showCelebration({
                type: 'achievement',
                def: { id: 'x', name: 'Null and Void', desc: 'Defeat the Null Ghost.', test: 'bestiary:x' },
              })
            }
          >
            Achievement
          </Button>
          <Button
            size="small"
            variant="ghost"
            onClick={() =>
              void showCelebration({
                type: 'bug',
                def: {
                  id: 'off-by-one',
                  name: 'Off-by-One Imp',
                  world: 'w5',
                  art: 'imp',
                  color: '#FF5A70',
                  how: '',
                  prevent: 'Loop with `i < size`, not `<=`.',
                },
              })
            }
          >
            Bug
          </Button>
          <Button
            size="small"
            variant="coral"
            onClick={() =>
              void showCelebration({
                type: 'cosmetic',
                def: { id: 'wizard-hat', slot: 'hat', name: 'Template Wizard Hat', source: 'dev' },
              })
            }
          >
            Gear
          </Button>
          <Button size="small" variant="ghost" onClick={() => void showCelebration({ type: 'tier', tier: 2 })}>
            Shield tier
          </Button>
          <Button size="small" variant="sun" onClick={() => void showCelebration({ type: 'evolve', from: 1, to: 2 })}>
            Evolve
          </Button>
          <Button
            size="small"
            variant="ghost"
            onClick={() =>
              void showCelebration([
                { type: 'levelup', level: 3 },
                { type: 'tier', tier: 3 },
              ])
            }
          >
            Queue of 2
          </Button>
        </div>
      </Section>

      <Section title="Curlo">
        <div className={styles.row}>
          {CURLO_MOODS.map((m) => (
            <div key={m} className={styles.cell}>
              <Curlo mood={m} size={72} />
              <small>{m}</small>
            </div>
          ))}
        </div>
        <div className={styles.row}>
          {([1, 2, 3] as const).map((t) => (
            <div key={t} className={styles.cell}>
              <Curlo tier={t} form={1} mood="bracing" size={72} cosmetics={{ hat: null, color: 'classic', shield: null }} />
              <small>tier {t}</small>
            </div>
          ))}
          {([1, 2, 3] as const).map((f) => (
            <div key={f} className={styles.cell}>
              <Curlo form={f} size={72} cosmetics={{ hat: null, color: 'classic', shield: null }} />
              <small>form {f}</small>
            </div>
          ))}
        </div>
        <div className={styles.row}>
          {['gremlin-horns', 'blob-bowtie', 'golem-helm', 'party-hat', 'wizard-hat', 'crown', 'cap-sky', 'bow-ribbon', 'antenna-bobble', 'tophat', 'halo-ring'].map(
            (h) => (
              <div key={h} className={styles.cell}>
                <Curlo size={60} cosmetics={{ hat: h }} />
                <small>{h}</small>
              </div>
            ),
          )}
        </div>
        <div className={styles.row}>
          {['classic', 'berry', 'mint', 'sky', 'sunny', 'grape', 'midnight'].map((col) => (
            <div key={col} className={styles.cell}>
              <Curlo size={60} cosmetics={{ color: col }} />
              <small>{col}</small>
            </div>
          ))}
          {['shield-circuit', 'shield-brace'].map((sh) => (
            <div key={sh} className={styles.cell}>
              <Curlo size={60} mood="bracing" tier={2} cosmetics={{ shield: sh }} />
              <small>{sh}</small>
            </div>
          ))}
          <div className={styles.cell}>
            <Curlo size={60} silhouette />
            <small>silhouette</small>
          </div>
        </div>
        <h4>Live: tier / form / reactions</h4>
        <div className={styles.row}>
          <div style={{ width: 150 }}>
            <Curlo {...c.props} tier={tier} form={form} onPoke={() => setSay(curloLine('poke'))} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <SpeechBubble popKey={say} text={say} />
            <div className={styles.row}>
              {CURLO_MOODS.map((m) => (
                <Button key={m} size="small" variant="ghost" onClick={() => c.react(m, 1400)}>
                  {m}
                </Button>
              ))}
              <Button size="small" variant="ghost" onClick={() => setTier((t) => ((t % 3) + 1) as CurloTier)}>
                tier {tier}
              </Button>
              <Button size="small" variant="ghost" onClick={() => setForm((f) => ((f % 3) + 1) as CurloFormN)}>
                form {form}
              </Button>
            </div>
          </div>
        </div>
        <CurloSays mood="thinking" text={curloLine('thinking')} />
        <SpeechBubble tail="bottom" tone="boss">
          <b>The Syntax Gremlin:</b> Your semicolons are MINE!
        </SpeechBubble>
      </Section>

      <Section title="Bosses">
        <div className={styles.row}>
          <Button size="small" variant="ghost" onClick={() => setHurt(!hurt)}>
            {hurt ? 'Healthy' : 'Hurt'}
          </Button>
        </div>
        <div className={styles.grid}>
          {BOSS_KEYS.map((k) => (
            <div key={k} className={styles.cell}>
              <BossArt kind={k} size={96} hurt={hurt} />
              <small>{k}</small>
            </div>
          ))}
          <div className={styles.cell}>
            <BossArt kind="gremlin" size={96} color="#3D8BFF" />
            <small>color prop</small>
          </div>
        </div>
      </Section>

      <Section title="Bestiary creatures">
        <div className={styles.grid}>
          {BEAST_KEYS.map((k) => (
            <div key={k} className={styles.cell}>
              <BeastArt kind={k} size={72} />
              <small>{k}</small>
            </div>
          ))}
          <div className={styles.cell}>
            <BeastArt kind="imp" size={72} locked />
            <small>locked</small>
          </div>
          <div className={styles.cell}>
            <BeastArt kind="slime" size={72} color="#FF5A70" />
            <small>color prop</small>
          </div>
        </div>
      </Section>

      <Section title="Icons + world icons">
        <div className={styles.icons}>
          {ICON_NAMES.map((k) => (
            <span key={k} className={styles.iconCell} title={k}>
              <Icon name={k} size={24} />
              <small>{k}</small>
            </span>
          ))}
        </div>
        <div className={styles.icons}>
          {WORLD_ICON_KEYS.map((k) => (
            <span key={k} className={styles.worldCell} title={k}>
              <WorldIcon kind={k} size={34} />
              <small>{k}</small>
            </span>
          ))}
        </div>
      </Section>

      <Section title="CodeBlock">
        <CodeBlock code={DEMO.code} />
        <CodeBlock code={LONG} highlightLines={0} />
        <CodeBlock code={'int* p = nullptr;\n*p = 5;   // crash (or worse)'} unsafe />
        <CodeBlock code="g++ -std=c++20 -Wall -Wextra main.cpp -o hero" lang="shell" />
        <CodeBlock
          code={'int main() {\n    std::cout << ___ << "\\n";\n}'}
          blank={<AutoGrowInput variant="fill" value={fill} onChange={setFill} placeholder="?" label="Fill the blank" />}
        />
        <CodeBlock
          code={'for (int i = 0; i <= 3; i++) {\n    sum += v[i];\n}'}
          onLineClick={(i) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
          pressedLines={picked}
          lineState={(i) => (i === 0 && picked.includes(0) ? 'flagged' : undefined)}
        />
        <AutoGrowInput
          variant="console"
          prompt=">"
          value={line}
          onChange={setLine}
          placeholder="Type a line of C++"
          label="Write a line"
          onEnter={() => toast(`Enter: ${line || '(empty)'}`)}
        />
      </Section>

      <Section title="CodeDemo">
        <CodeDemo demo={DEMO} />
        <h4>Crash</h4>
        <CodeDemo demo={CRASH_DEMO} unsafe autoStart={false} />
        <h4>Shield</h4>
        <CodeDemo demo={SHIELD_DEMO} autoStart={false} />
      </Section>

      <Section title="SideBySide">
        <SideBySide unsafe={CRASH_DEMO.code} hardened={SHIELD_DEMO.code} />
        <UbNote />
      </Section>

      <Section title="Navigation">
        <div className={styles.row}>
          <Button size="small" onClick={(e) => navigate('/lesson/w1.l1', { dir: 'expand', origin: e.currentTarget })}>
            Expand → lesson
          </Button>
          <Button size="small" variant="teal" onClick={() => navigate('/boss/w1', { dir: 'up' })}>
            Up → boss
          </Button>
          <Button size="small" variant="ghost" onClick={() => navigate('/', { dir: -1 })}>
            Slide → map
          </Button>
        </div>
      </Section>
    </Screen>
  );
}
