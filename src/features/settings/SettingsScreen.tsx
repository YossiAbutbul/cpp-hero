/**
 * Settings panel (#/settings, header gear toggle): motion, text size, daily
 * goal, backup (export file / copy / import file / paste), reset with a
 * double in-app confirm, about, and dev-only tools.
 * Port of legacy screens.js `screens.settings`.
 */
import { useId, useRef, useState, type ReactNode } from 'react';
import { useGame } from '@/app/gameContext';
import { useCloud } from '@/cloud/cloudContext';
import { SOUND_ENABLED } from '@/engine/config';
import type { SaveV1, TextSize } from '@/engine/save';
import { Curlo } from '@/features/curlo/Curlo';
import { AutoGrowInput } from '@/ui/AutoGrowInput';
import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/Icon';
import { Card, Screen, ScreenTitle } from '@/ui/Layout';
import { Tabs } from '@/ui/Tabs';
import { plural } from '@/ui/format';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import { CloudCard } from './CloudCard';
import { copyText } from './clipboard';
import { DevTools } from './DevTools';
import styles from './settings.module.css';

type Goal = '5' | '10' | '20';

export function SettingsScreen() {
  const { store, update } = useGame();
  const s = store.state;
  const st = s.settings;
  const goal = String(s.profile.dailyGoalMin) as Goal;

  return (
    <Screen label="Settings">
      <ScreenTitle eyebrow="Settings">Make it yours</ScreenTitle>
      {!store.persistent && (
        <Card tone="notice">
          <Icon name="info" size={24} />
          <span>Progress can’t be saved on this device. Use Export to keep a copy.</span>
        </Card>
      )}
      <Card>
        {SOUND_ENABLED && (
          <>
            <SwitchRow
              icon="sound"
              label="Sound effects"
              on={st.sound}
              onToggle={() => update((x) => void (x.settings.sound = !x.settings.sound))}
            />
            <SwitchRow
              icon="music"
              label="Music"
              on={st.music}
              onToggle={() => update((x) => void (x.settings.music = !x.settings.music))}
            />
          </>
        )}
        <SwitchRow
          icon="motion"
          label="Reduce motion"
          desc="Fades instead of bounces; no confetti"
          on={st.reduceMotion}
          onToggle={() => {
            const next = !st.reduceMotion;
            update((x) => void (x.settings.reduceMotion = next));
            toast(next ? 'Reduce motion on: fades only.' : 'Full springy motion is back!', {
              icon: 'motion',
            });
          }}
        />
        <Row icon="text" label="Text size">
          <Tabs<TextSize>
            label="Text size"
            size="small"
            value={st.textSize}
            onChange={(v) => update((x) => void (x.settings.textSize = v))}
            items={[
              { id: 's', label: 'S' },
              { id: 'm', label: 'M' },
              { id: 'l', label: 'L' },
            ]}
          />
        </Row>
        <Row icon="target" label="Daily goal">
          <Tabs<Goal>
            label="Daily goal"
            size="small"
            value={goal}
            onChange={(v) => update((x) => void (x.profile.dailyGoalMin = Number(v)))}
            items={[
              { id: '5', label: '5m' },
              { id: '10', label: '10m' },
              { id: '20', label: '20m' },
            ]}
          />
        </Row>
      </Card>

      <CloudCard />

      <Backup />

      <Card className={styles.about}>
        <div className={styles.aboutC}>
          <Curlo />
        </div>
        <div>
          <b>Cpp Hero</b>
          <p className="muted small">Learn C++ from zero. Defend your code.</p>
        </div>
      </Card>

      {import.meta.env.DEV && <DevTools />}
    </Screen>
  );
}

function Row({
  icon,
  label,
  desc,
  children,
}: {
  icon: IconName;
  label: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.ic}>
        <Icon name={icon} size={22} />
      </span>
      <div className={styles.t}>
        <b>{label}</b>
        {desc && <small>{desc}</small>}
      </div>
      {children}
    </div>
  );
}

function SwitchRow({
  icon,
  label,
  desc,
  on,
  onToggle,
}: {
  icon: IconName;
  label: string;
  desc?: string;
  on: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <div className={styles.row}>
      <span className={styles.ic}>
        <Icon name={icon} size={22} />
      </span>
      <div className={styles.t}>
        <b id={id}>{label}</b>
        {desc && <small>{desc}</small>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={id}
        className={styles.switch}
        onClick={onToggle}
      >
        <i />
      </button>
    </div>
  );
}

/* ---------------- backup: export / copy / import / paste / reset ---------------- */

function Backup() {
  const { store } = useGame();
  const cloud = useCloud();
  const signedIn = !!cloud.status.user;
  const dialog = useDialog();
  const file = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const { json, fileName } = store.exportJSON();
    try {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Save exported. Keep it somewhere safe!', { icon: 'download' });
    } catch {
      toast('Export failed here. Try Copy instead.', { icon: 'warn' });
    }
  };

  const doCopy = async () => {
    const ok = await copyText(JSON.stringify(JSON.parse(store.exportJSON().json)));
    toast(ok ? 'Save copied. Paste it somewhere safe!' : 'Copy failed on this device.', {
      icon: ok ? 'check' : 'warn',
    });
  };

  const tryImport = async (json: string) => {
    let data: SaveV1;
    try {
      data = store.parseImport(json);
    } catch (e) {
      await dialog.open({
        title: 'Couldn’t import',
        mood: 'worried',
        body: <p>{e instanceof Error && e.message ? e.message : 'That save didn’t work.'}</p>,
      });
      return;
    }
    const lessons = Object.values(data.lessons).filter((l) => l.done).length;
    const yes = await dialog.confirm({
      title: 'Import this save?',
      body: (
        <>
          <p>
            It replaces your progress with: <b>level {data.level}</b>, {plural(lessons, 'lesson')} done,{' '}
            {data.xp} XP.
          </p>
          <p className="muted small">Tip: export your current save first.</p>
        </>
      ),
      yes: 'Import',
      no: 'Cancel',
      danger: true,
    });
    if (!yes) return;
    store.replace(data);
    toast('Progress imported!', { icon: 'upload' });
  };

  const onFile = async () => {
    const f = file.current?.files?.[0];
    if (!f) return;
    let text = '';
    try {
      text = await f.text();
    } catch {
      toast('Couldn’t read that file.', { icon: 'warn' });
      return;
    }
    await tryImport(text);
  };

  const paste = async () => {
    let value = '';
    const v = await dialog.open<'go' | null>({
      title: 'Paste a save',
      mood: 'thinking',
      body: <PasteField onChange={(x) => (value = x)} />,
      buttons: [
        { label: 'Import', value: 'go', variant: 'teal' },
        { label: 'Cancel', value: null, variant: 'ghost' },
      ],
    });
    if (v === 'go' && value.trim()) await tryImport(value);
  };

  const reset = async () => {
    const yes = await dialog.confirm({
      title: 'Reset all progress?',
      body: (
        <p>
          This erases your XP, lessons, streak, collection and settings{' '}
          {signedIn ? 'on this device and in your cloud save (all your devices)' : 'on this device'}.{' '}
          <b>It can’t be undone.</b>
        </p>
      ),
      yes: 'Reset everything',
      no: 'Keep my progress',
      danger: true,
    });
    if (!yes) return;
    const yes2 = await dialog.confirm({
      title: 'Are you really sure?',
      body: <p>Last chance! Curlo will forget everything.</p>,
      yes: 'Yes, reset',
      no: 'No, wait',
      danger: true,
    });
    if (!yes2) return;
    const r = await cloud.resetProgress();
    if (r === 'offline')
      toast('You’re offline. Connect to reset your cloud save too.', { icon: 'warn', ms: 4000 });
    else if (r === 'error') toast('Reset didn’t work. Try again.', { icon: 'warn' });
    else toast('Progress reset. Fresh start!');
  };

  return (
    <Card>
      <h3>Your progress</h3>
      <p className="muted small">Back up your save, or move it to another device.</p>
      <div className={styles.btns}>
        <Button variant="teal" icon="download" size="small" onClick={doExport}>
          Export
        </Button>
        <Button variant="ghost" size="small" onClick={() => void doCopy()}>
          Copy
        </Button>
        <Button
          variant="ghost"
          icon="upload"
          size="small"
          onClick={() => {
            if (file.current) {
              file.current.value = '';
              file.current.click();
            }
          }}
        >
          Import
        </Button>
        <Button variant="ghost" size="small" onClick={() => void paste()}>
          Paste
        </Button>
      </div>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="sr"
        tabIndex={-1}
        aria-hidden="true"
        onChange={() => void onFile()}
      />
      <div className={styles.danger}>
        <Button variant="coral" icon="trash" size="small" onClick={() => void reset()}>
          Reset progress
        </Button>
      </div>
    </Card>
  );
}

function PasteField({ onChange }: { onChange: (v: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div className={styles.paste}>
      <p className="muted small">Paste the text you copied with Copy.</p>
      <AutoGrowInput
        variant="field"
        multiline
        label="Save text"
        value={v}
        minCh={16}
        autoFocus
        onChange={(x) => {
          setV(x);
          onChange(x);
        }}
      />
    </div>
  );
}
