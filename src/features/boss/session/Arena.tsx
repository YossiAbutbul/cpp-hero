/**
 * The defense arena (legacy engine/arena.js): Curlo on the left, a hostile
 * input flying in from the right, a strip of memory cells (or the boss).
 * Used by the project Stress Test and the boss Defense Phase.
 *
 *   const arena = useRef<ArenaHandle>(null);
 *   <Arena ref={arena} cellsLabel="your program" />
 *   arena.current?.setAttack('-5');  await arena.current?.crash();  await arena.current?.block();
 *
 * Every sequence resolves on timers (never only on animation events), so
 * nothing stays half-animated under reduced motion or in a hidden tab.
 */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Curlo } from '@/features/curlo/Curlo';
import { useCurloReact } from '@/features/curlo/useCurloReact';
import { BossArt } from '@/ui/art/Art';
import { burstAt, shock } from '@/ui/fx/effects';
import { anim, cancelAnims, pause, pulseClass, reduced } from '@/ui/fx/motion';
import { shownInput } from './util';
import styles from './session.module.css';

export interface ArenaHandle {
  /** show the incoming hostile input */
  setAttack(text: string): void;
  /** unsafe code: the input breaks through */
  crash(): Promise<void>;
  /** hardened code: the shield deflects it */
  block(): Promise<void>;
  reset(): void;
}

const BYTES = ['2A', '00', '00', '00'];
const HEX = '0123456789ABCDEF';
const junk = () => HEX[Math.floor(Math.random() * 16)]! + HEX[Math.floor(Math.random() * 16)]!;

export const Arena = forwardRef<ArenaHandle, { cellsLabel?: string; bossArt?: string }>(function Arena(
  { cellsLabel = 'memory', bossArt },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);
  const dm = useRef<HTMLDivElement>(null);
  const atk = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const curlo = useCurloReact('happy');
  const react = curlo.react;
  const [cells, setCells] = useState<{ v: string[]; tone: '' | 'safe' | 'bad' }>({ v: BYTES, tone: '' });
  const [attack, setAttackText] = useState<string | null>(null);

  useImperativeHandle(
    ref,
    () => {
      const resetAtk = () => {
        const a = atk.current;
        if (!a) return;
        cancelAnims(a);
        a.style.opacity = '1';
        a.style.transform = '';
      };
      return {
        setAttack(text) {
          resetAtk();
          setAttackText(shownInput(text));
          setCells({ v: BYTES, tone: '' });
          react('thinking');
          void anim(
            atk.current,
            [
              { transform: 'translateX(80px) scale(.6)', opacity: 0 },
              { transform: 'translateX(-6px) scale(1.08)', opacity: 1, offset: 0.7 },
              { transform: 'none', opacity: 1 },
            ],
            { duration: 420, easing: 'ease-out', rm: 'fade' },
          );
        },
        async crash() {
          if (busy.current) return;
          busy.current = true;
          const rm = reduced();
          const W = root.current?.clientWidth ?? 300;
          if (!rm)
            await anim(
              atk.current,
              [
                { transform: 'none' },
                { transform: `translate(${-(W * 0.35)}px,-24px) rotate(-20deg)`, offset: 0.45 },
                { transform: `translate(${-(W * 0.55)}px,40px) scale(.5)`, opacity: 0 },
              ],
              { duration: 520, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' },
            );
          if (atk.current) atk.current.style.opacity = '0';
          react('worried');
          pulseClass(root.current, styles.glitch, 1600);
          let k = 0;
          const iv = window.setInterval(() => {
            setCells({ v: BYTES.map(junk), tone: 'bad' });
            if (++k > 12) window.clearInterval(iv);
          }, 60);
          await pause(rm ? 200 : 760);
          window.clearInterval(iv);
          setCells({ v: ['??', '▒▒', 'FF', '??'], tone: 'bad' });
          busy.current = false;
        },
        async block() {
          if (busy.current) return;
          busy.current = true;
          const rm = reduced();
          react('bracing');
          setCells({ v: BYTES, tone: 'safe' });
          const a = atk.current;
          const W = root.current?.clientWidth ?? 300;
          const dmW = dm.current?.offsetWidth ?? 100;
          const dx = -(W - 14 - (a?.offsetWidth ?? 40) - 14 - dmW * 0.95);
          if (rm) await pause(150);
          else {
            await pause(220);
            await anim(a, [{ transform: 'none' }, { transform: `translate(${dx}px,40px) rotate(-30deg)` }], {
              duration: 360,
              easing: 'cubic-bezier(.5,0,.9,.5)',
              fill: 'forwards',
            });
          }
          const r = dm.current?.getBoundingClientRect();
          const ar = root.current?.getBoundingClientRect();
          if (r && ar) shock(root.current, r.right - ar.left - 8, r.top - ar.top + r.height * 0.62);
          burstAt(dm.current, { n: 36, colors: ['#FFC62E', '#0FA898', '#fff'], speed: 0.8 });
          if (!rm)
            await anim(
              a,
              [
                { transform: `translate(${dx}px,40px) rotate(-30deg)` },
                { transform: `translate(${dx + 90}px,-30px) rotate(200deg) scale(1.1)`, offset: 0.45 },
                { transform: `translate(${dx + 170}px,120px) rotate(420deg) scale(.6)`, opacity: 0 },
              ],
              { duration: 650, easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'forwards' },
            );
          if (a) a.style.opacity = '0';
          react('celebrate', 1200);
          busy.current = false;
        },
        reset() {
          resetAtk();
          setAttackText(null);
          setCells({ v: BYTES, tone: '' });
          react('happy');
        },
      };
    },
    [react],
  );

  const cellCls = cells.tone === 'safe' ? styles.cellSafe : cells.tone === 'bad' ? styles.cellBad : '';
  return (
    <div ref={root} className={[styles.arena, bossArt ? styles.hasBoss : ''].join(' ')} aria-hidden="true">
      <div className={styles.floor} />
      <div ref={dm} className={styles.dm}>
        <Curlo {...curlo.props} />
      </div>
      <div ref={atk} className={styles.attack} hidden={attack == null}>
        {attack}
      </div>
      {bossArt ? (
        <BossArt kind={bossArt} className={styles.arenaBoss} />
      ) : (
        <div className={styles.cells}>
          <span className={styles.cl}>{cellsLabel}</span>
          {cells.v.map((b, i) => (
            <div key={i} className={[styles.cell, cellCls].join(' ')}>
              {b}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
