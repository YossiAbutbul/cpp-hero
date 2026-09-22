/** The canvas + flash layer behind effects.ts. Mounted once, inside the app frame. */
import { useEffect, useRef } from 'react';
import { clearConfetti, registerFxLayer } from './effects';
import { useReducedMotion } from './motion';
import styles from './fx.module.css';

export function FxLayer() {
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const rm = useReducedMotion();

  useEffect(() => {
    registerFxLayer({ canvas: canvas.current, flash: flash.current, layer: layer.current });
    return () => registerFxLayer({ canvas: null, flash: null, layer: null });
  }, []);
  useEffect(() => {
    if (rm) clearConfetti();
  }, [rm]);

  return (
    <div ref={layer} className={styles.layer} aria-hidden="true">
      <div ref={flash} className={styles.flash} />
      <canvas ref={canvas} className={styles.canvas} />
    </div>
  );
}
