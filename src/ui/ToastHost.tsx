/** Renders the current toast (see toast.ts). Mounted once inside the app frame. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { anim } from './fx/motion';
import { Icon } from './Icon';
import { dismissToast, useToastState, type ToastItem } from './toast';
import styles from './ToastHost.module.css';

export function ToastHost() {
  const t = useToastState();
  const [shown, setShown] = useState<ToastItem | null>(null);
  const el = useRef<HTMLDivElement>(null);

  // keep the last toast rendered while it animates out
  if (t && t !== shown) setShown(t);

  useLayoutEffect(() => {
    if (!t) return;
    el.current?.getAnimations().forEach((a) => a.cancel());
    void anim(
      el.current,
      [
        { opacity: 0, transform: 'translate(-50%,-60px) scale(.8)' },
        { opacity: 1, transform: 'translate(-50%,6px) scale(1.04)', offset: 0.6 },
        { opacity: 1, transform: 'translate(-50%,0) scale(1)' },
      ],
      { duration: 340, rm: 'fade' },
    );
    const timer = window.setTimeout(() => dismissToast(t.id), t.ms ?? 2600);
    return () => clearTimeout(timer);
  }, [t]);

  useEffect(() => {
    if (t || !shown) return;
    let alive = true;
    void anim(el.current, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-30px)' }], {
      duration: 220,
      rm: 'keep',
      fill: 'forwards',
    }).then(() => alive && setShown(null));
    return () => {
      alive = false;
    };
  }, [t, shown]);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {shown && (
        <div ref={el} className={styles.toast} onClick={() => dismissToast(shown.id)}>
          {shown.icon && <Icon name={shown.icon} />}
          <span>{shown.msg}</span>
        </div>
      )}
    </div>
  );
}
