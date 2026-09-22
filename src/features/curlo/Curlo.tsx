/**
 * <Curlo/>: the original mascot as a React component.
 *
 *   <Curlo />                                   // the player's Curlo (tier/form/cosmetics from the save)
 *   <Curlo mood="thinking" size={78} />
 *   const c = useCurloReact(); <Curlo {...c.props} />; c.react('celebrate', 1100)
 *   <Curlo form={3} tier={2} cosmetics={{ hat: 'crown', color: 'mint' }} />   // fixed preview
 *   <Curlo onPoke={() => say(curloLine('poke'))} />  // pokeable: springs + random reaction
 *
 * Any prop left out is taken from the player's save when rendered inside
 * <GameProvider>; outside it the defaults are tier 1, form 1, classic color.
 * Mood changes (and reactKey bumps) play the design's body motion (WAAPI,
 * skipped under reduced motion); idle breathing + blinking are CSS.
 */
import { useContext, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { GameContext } from '@/app/gameContext';
import { reduced, springPoke, SPRING } from '@/ui/fx/motion';
import {
  CURLO_MOODS,
  curloInner,
  FALLBACK_COLORS,
  MOVES,
  variantVars,
  type CurloFormN,
  type CurloMood,
  type CurloTier,
} from './curloArt';
import './curlo.css';

export interface CurloCosmetics {
  hat?: string | null;
  /** color cosmetic id ("mint") or a hex color */
  color?: string | null;
  /** shield skin cosmetic id ("shield-circuit") */
  shield?: string | null;
}

export interface CurloProps {
  mood?: CurloMood;
  /** bump to replay the mood's motion without changing the mood */
  reactKey?: number;
  tier?: CurloTier;
  form?: CurloFormN;
  cosmetics?: CurloCosmetics;
  /** width (number = px); height follows the 160×172 viewBox */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** grey "not unlocked yet" look */
  silhouette?: boolean;
  /** accessible name; decorative (aria-hidden) without it */
  label?: string;
  /** makes Curlo a button that squishes + reacts when poked */
  onPoke?: () => void;
  pokeLabel?: string;
}

export function Curlo(props: CurloProps) {
  const { reactKey = 0, size, className, style, silhouette, label, onPoke, pokeLabel } = props;
  const ctx = useContext(GameContext);
  const s = ctx?.store.state;
  const eq = s?.cosmetics.equipped;

  const tier: CurloTier = props.tier ?? (ctx ? ctx.game.shieldTier() : 1);
  const form: CurloFormN = props.form ?? (ctx ? ctx.game.curloForm() : 1);
  const hat = props.cosmetics && 'hat' in props.cosmetics ? props.cosmetics.hat : (eq?.hat ?? null);
  const colorId =
    props.cosmetics && 'color' in props.cosmetics ? props.cosmetics.color : (eq?.color ?? s?.profile.variant ?? null);
  const shield = props.cosmetics && 'shield' in props.cosmetics ? props.cosmetics.shield : (eq?.shield ?? null);
  const color = !colorId
    ? null
    : colorId.startsWith('#')
      ? colorId
      : (ctx?.game.cosmeticDef(colorId)?.color ?? FALLBACK_COLORS[colorId] ?? null);

  // Poke: a transient random reaction on top of the controlled mood.
  const [poke, setPoke] = useState<{ mood: CurloMood; key: number } | null>(null);
  const pokeTimer = useRef(0);
  const mood = poke?.mood ?? props.mood ?? 'happy';
  const key = reactKey + (poke?.key ?? 0);

  const inner = useMemo(() => curloInner(form, hat), [form, hat]);
  const svgRef = useRef<SVGSVGElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const mv = svgRef.current?.querySelector('.c-move');
    if (!mv) return;
    mv.getAnimations?.().forEach((a) => a.cancel());
    if (reduced() || typeof (mv as SVGGElement).animate !== 'function') return;
    const m = MOVES[mood];
    try {
      (mv as SVGGElement).animate(m.kf, {
        duration: m.ms,
        easing: m.easing ?? SPRING,
        fill: m.hold ? 'forwards' : 'none',
      });
    } catch {
      /* ignore */
    }
  }, [mood, key]);

  useLayoutEffect(() => () => clearTimeout(pokeTimer.current), []);

  const w = size == null ? undefined : typeof size === 'number' ? `${size}px` : size;
  const vars = variantVars(color);
  const svg = (
    <svg
      ref={svgRef}
      className={'curlo' + (mood === 'bracing' ? ' shield-up' : '') + (silhouette ? ' silhouette' : '')}
      viewBox="0 0 160 172"
      data-mood={mood}
      data-tier={tier}
      data-form={form}
      data-shield={shield ?? ''}
      style={{ ...(vars as CSSProperties), ...(!onPoke && w ? { width: w } : null), ...(!onPoke ? style : null) }}
      focusable="false"
      {...(label && !onPoke ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );

  if (!onPoke) {
    return className ? (
      <span className={className} style={{ display: 'block' }}>
        {svg}
      </span>
    ) : (
      svg
    );
  }
  return (
    <button
      type="button"
      className={'poke' + (className ? ' ' + className : '')}
      style={{ ...(w ? { width: w } : null), ...style }}
      aria-label={pokeLabel ?? label ?? 'Poke Curlo'}
      onClick={(e) => {
        springPoke(e.currentTarget);
        const choices = CURLO_MOODS.filter((m) => m !== 'happy');
        const pick = choices[Math.floor(Math.random() * choices.length)] ?? 'celebrate';
        setPoke((p) => ({ mood: pick, key: (p?.key ?? 0) + 1 }));
        clearTimeout(pokeTimer.current);
        pokeTimer.current = window.setTimeout(() => setPoke(null), 1100);
        onPoke();
      }}
    >
      {svg}
    </button>
  );
}
