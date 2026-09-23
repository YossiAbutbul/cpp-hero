/**
 * Vault tab (#/vault): the Code Vault cheat sheet, grouped by world, with a
 * separate Defense Rules tab. Cards unlock by finishing lessons.
 * Port of legacy screens.js `screens.vault`.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { useGame } from '@/app/gameContext';
import type { VaultCard as Card, World } from '@/content/schema';
import { Curlo } from '@/features/curlo/Curlo';
import { CodeBlock } from '@/features/code/CodeBlock';
import { Icon } from '@/ui/Icon';
import { Screen, ScreenTitle } from '@/ui/Layout';
import { Md } from '@/ui/Md';
import { Tabs } from '@/ui/Tabs';
import { plural } from '@/ui/format';
import { stagger } from '@/ui/fx/motion';
import styles from './vault.module.css';

type Tab = 'sheet' | 'def';

export function VaultScreen() {
  const [tab, setTab] = useState<Tab>('sheet');
  return (
    <Screen label="Code Vault">
      <ScreenTitle eyebrow="Code Vault">Your cheat sheet</ScreenTitle>
      <Tabs<Tab>
        label="Vault sections"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'sheet', label: 'Cheat Sheet', icon: 'vault', panel: <VaultPanel def={false} /> },
          { id: 'def', label: 'Defense Rules', icon: 'shieldO', panel: <VaultPanel def /> },
        ]}
      />
    </Screen>
  );
}

function VaultPanel({ def }: { def: boolean }) {
  const { store, game } = useGame();
  const owned = store.state.vault;
  const all = Object.values(vaultIndex(game)).filter((v) => !!v.card.defense === def);
  const have = all.filter((v) => owned.includes(v.card.id));
  const groups: { w: World; cards: Card[] }[] = [];
  for (const w of game.worlds()) {
    const cards = have.filter((v) => v.world.id === w.id).map((v) => v.card);
    if (cards.length) groups.push({ w, cards });
  }
  const locked = all.length - have.length;
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const els = ref.current?.querySelectorAll('[data-lift]');
    if (els?.length) stagger(els, { duration: 220 });
  }, [def]);

  return (
    <div ref={ref}>
      {!have.length && (
        <div className={styles.empty}>
          <div className={styles.emptyC}>
            <Curlo mood="thinking" />
          </div>
          <p>
            <b>{def ? 'No defense rules yet.' : 'Your vault is empty.'}</b>
            <br />
            {def ? 'Finish Shield Lessons to collect them.' : 'Finish lessons to collect cards.'}
          </p>
        </div>
      )}
      {groups.map(({ w, cards }) => (
        <section key={w.id} aria-label={`World ${w.num}: ${w.title}`}>
          <h3 className={styles.worldH}>
            World {w.num} · {w.title}
          </h3>
          {cards.map((c) => (
            <VaultCardView key={c.id} card={c} />
          ))}
        </section>
      ))}
      {locked > 0 && (
        <p className={styles.more}>
          <Icon name="lock" size={16} /> {plural(locked, 'more card')} to discover.
        </p>
      )}
    </div>
  );
}

function VaultCardView({ card }: { card: Card }) {
  return (
    <article className={[styles.vcard, card.defense ? styles.def : ''].join(' ')} data-lift>
      <header className={styles.vhead}>
        {card.defense && (
          <span className={styles.badge}>
            <Icon name="shield" size={14} /> Defense rule
          </span>
        )}
        <h4>{card.title}</h4>
      </header>
      {card.code && <CodeBlock code={card.code} label={card.title} capHeight={false} />}
      {card.note && (
        <p className={styles.note}>
          <Md text={card.note} />
        </p>
      )}
    </article>
  );
}

/** The engine's vault index (id → card + world), built from the current content. */
function vaultIndex(game: ReturnType<typeof useGame>['game']) {
  const out: Record<string, { card: Card; world: World }> = {};
  for (const w of game.worlds())
    for (const l of w.lessons) for (const card of l.vault) out[card.id] = { card, world: w };
  return out;
}
