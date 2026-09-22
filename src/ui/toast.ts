/**
 * Toasts: short messages that drop in at the top of the app frame. One at a
 * time (a new toast replaces the current one with a fresh pop).
 *   toast('New world unlocked!', { icon: 'map' });
 *   toast('Progress can’t be saved on this device.', { icon: 'info', ms: 5000 });
 * Works anywhere (no hook needed); <ToastHost/> in the app shell renders it.
 */
import { useSyncExternalStore, type ReactNode } from 'react';
import type { IconName } from './Icon';

export interface ToastOptions {
  icon?: IconName;
  /** visible time in ms (default 2600) */
  ms?: number;
}
export interface ToastItem extends ToastOptions {
  id: number;
  msg: ReactNode;
}

let current: ToastItem | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export function toast(msg: ReactNode, opts: ToastOptions = {}): void {
  current = { id: ++seq, msg, ...opts };
  emit();
}

export function dismissToast(id?: number): void {
  if (current && (id == null || current.id === id)) {
    current = null;
    emit();
  }
}

export function useToastState(): ToastItem | null {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => current,
    () => null,
  );
}

/** Hook form, for symmetry with useDialog(): const toast = useToast(); */
export const useToast = () => toast;
