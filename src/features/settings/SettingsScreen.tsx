/**
 * Settings panel (#/settings, header gear toggle). STUB: Phase B builds the
 * full screen (export/import, reset with confirm, name, daily goal…). The
 * two controls below are already live so the shell's text-size and
 * reduced-motion plumbing can be checked.
 */
import { useGame } from '@/app/gameContext';
import { StubScreen } from '@/app/StubScreen';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Layout';
import { Tabs } from '@/ui/Tabs';
import type { TextSize } from '@/engine/save';

export function SettingsScreen() {
  const { store, update } = useGame();
  const st = store.state.settings;
  return (
    <StubScreen
      label="Settings"
      eyebrow="Make it yours"
      title="Settings"
      todo="Reduce animations, text size, export / import progress, reset (with an in-app confirm)."
    >
      <Card>
        <h4>Text size</h4>
        <Tabs<TextSize>
          label="Text size"
          size="small"
          value={st.textSize}
          onChange={(v) => update((s) => void (s.settings.textSize = v))}
          items={[
            { id: 's', label: 'S' },
            { id: 'm', label: 'M' },
            { id: 'l', label: 'L' },
          ]}
        />
        <h4>Animations</h4>
        <Button
          variant={st.reduceMotion ? 'teal' : 'ghost'}
          size="small"
          icon="motion"
          aria-pressed={st.reduceMotion}
          onClick={() => update((s) => void (s.settings.reduceMotion = !s.settings.reduceMotion))}
        >
          Reduce animations: {st.reduceMotion ? 'on' : 'off'}
        </Button>
      </Card>
    </StubScreen>
  );
}
