/**
 * Pure decision logic for cloud sync: given this device's save, which account
 * the device was last linked to, and the cloud document, decide what the
 * device keeps and what (if anything) to upload. No Firebase here.
 *
 * Cloud document users/{uid} (see firestore.rules):
 *   { v, epoch, save, createdAt, updatedAt, resetAt? }
 * `epoch` counts cloud resets. A device that last synced at an older epoch
 * takes the cloud copy as is (someone pressed Reset on another device) instead
 * of merging its old progress back in.
 */
import { SAVE_VERSION } from '../engine/config';
import { defaultSave, migrate, type SaveV1 } from '../engine/save';
import { clone } from '../engine/util';
import { mergeSaves, sameSave, toCloudSave } from './merge';

/** What this device remembers about its cloud link (localStorage, see LINK_KEY). */
export interface LinkMeta {
  /** Account this device's save was last synced with (kept after sign-out). */
  uid: string | null;
  /** Cloud reset counter seen at the last sync. */
  epoch: number;
}

export const LINK_KEY = 'cpphero.cloud';
/** Backup of the device save taken before it is replaced by another account's / a reset cloud copy. */
export const PREV_SAVE_KEY = 'cpphero.save.prev';

export interface CloudSnapshot {
  v: unknown;
  epoch: unknown;
  save: unknown;
}

export type Reconciled =
  | { kind: 'too-new' }
  | {
      kind: 'ok';
      /** The save this device should hold now. */
      local: SaveV1;
      /** true when `local` differs from the device save (apply it). */
      localChanged: boolean;
      /** Save to write to the cloud, or null when the cloud is already up to date. */
      upload: SaveV1 | null;
      /** true when the document doesn't exist yet (create, epoch 0). */
      create: boolean;
      epoch: number;
      /** Why the device save was replaced instead of merged (UI message). */
      replaced: 'other-account' | 'reset' | null;
    };

export function reconcile(
  local: SaveV1,
  meta: LinkMeta,
  uid: string,
  cloud: CloudSnapshot | null,
  now: Date = new Date(),
): Reconciled {
  const otherAccount = !!meta.uid && meta.uid !== uid;

  if (!cloud) {
    // First sign-in for this account. A save linked to ANOTHER account stays
    // with that account; this one starts fresh.
    const start = otherAccount ? defaultSave(now) : clone(local);
    return {
      kind: 'ok',
      local: start,
      localChanged: otherAccount,
      upload: toCloudSave(start),
      create: true,
      epoch: 0,
      replaced: otherAccount ? 'other-account' : null,
    };
  }

  const v = typeof cloud.v === 'number' ? cloud.v : 1;
  if (v > SAVE_VERSION) return { kind: 'too-new' };
  let remote: SaveV1;
  try {
    remote = migrate(clone(cloud.save), now);
  } catch {
    return { kind: 'too-new' };
  }
  const epoch = typeof cloud.epoch === 'number' && cloud.epoch >= 0 ? cloud.epoch : 0;

  if (otherAccount || (meta.uid === uid && epoch > meta.epoch)) {
    return {
      kind: 'ok',
      local: remote,
      localChanged: !sameSave(remote, local),
      upload: null,
      create: false,
      epoch,
      replaced: otherAccount ? 'other-account' : 'reset',
    };
  }

  const merged = mergeSaves(local, remote);
  return {
    kind: 'ok',
    local: merged,
    localChanged: !sameSave(merged, local),
    upload: sameSave(toCloudSave(merged), toCloudSave(remote)) ? null : toCloudSave(merged),
    create: false,
    epoch,
    replaced: null,
  };
}
