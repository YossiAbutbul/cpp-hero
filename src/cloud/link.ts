/**
 * What this device remembers about its cloud link (localStorage, never
 * throws). Read by the React side without loading Firebase: `active` tells
 * the app to load the Firebase chunk at startup (signed in, or coming back
 * from a sign-in redirect).
 */
import { LINK_KEY, PREV_SAVE_KEY, type LinkMeta } from './reconcile';

export interface StoredLink extends LinkMeta {
  /** Signed in on this device (or a redirect sign-in is in progress). */
  active: boolean;
}

const EMPTY: StoredLink = { uid: null, epoch: 0, active: false };

function ls(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readLink(): StoredLink {
  try {
    const raw = ls()?.getItem(LINK_KEY);
    if (!raw) return { ...EMPTY };
    const o = JSON.parse(raw) as Partial<StoredLink>;
    return {
      uid: typeof o.uid === 'string' ? o.uid : null,
      epoch: typeof o.epoch === 'number' && o.epoch >= 0 ? o.epoch : 0,
      active: o.active === true,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeLink(patch: Partial<StoredLink>): StoredLink {
  const next = { ...readLink(), ...patch };
  try {
    ls()?.setItem(LINK_KEY, JSON.stringify(next));
  } catch {
    /* memory only: the link is re-established on next sign-in */
  }
  return next;
}

/** Keep a copy of the device save before it is replaced wholesale (not merged). */
export function backupSave(json: string): void {
  try {
    ls()?.setItem(PREV_SAVE_KEY, json);
  } catch {
    /* ignore */
  }
}
