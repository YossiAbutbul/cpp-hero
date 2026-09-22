import { createContext, useContext, type ReactNode } from 'react';
import type { CurloMood } from '@/features/curlo/curloArt';
import type { ButtonVariant } from '../Button';
import type { IconName } from '../Icon';

export interface DialogButton<T> {
  label: ReactNode;
  value: T;
  variant?: ButtonVariant;
  icon?: IconName;
}

export interface OpenDialogOptions<T> {
  title: ReactNode;
  /** content, or a render function that can close the dialog with a value */
  body?: ReactNode | ((close: (v: T) => void) => ReactNode);
  /** default: one "OK" button resolving `true` */
  buttons?: DialogButton<T>[];
  mood?: CurloMood;
  art?: ReactNode;
  /** value when dismissed with Escape / scrim / swipe (default undefined) */
  dismissValue?: T;
  /** false = a button must be chosen */
  dismissible?: boolean;
}

export interface ConfirmOptions {
  title: ReactNode;
  body?: ReactNode;
  yes?: ReactNode;
  no?: ReactNode;
  /** coral confirm button + worried Curlo */
  danger?: boolean;
}

export interface OpenSheetOptions {
  title: ReactNode;
  body: ReactNode | ((close: () => void) => ReactNode);
}

export interface SheetHandle {
  close(): void;
  /** resolves when the sheet has closed */
  closed: Promise<void>;
}

export interface DialogApi {
  /** Open a dialog; resolves with the chosen button's value (dismissValue when dismissed). */
  open<T = boolean>(opts: OpenDialogOptions<T>): Promise<T | undefined>;
  /** Yes / Cancel; resolves true or false. */
  confirm(opts: ConfirmOptions): Promise<boolean>;
  /** Open a bottom sheet. */
  sheet(opts: OpenSheetOptions): SheetHandle;
}

export const DialogContext = createContext<DialogApi | null>(null);

/**
 * Promise-style dialogs and sheets (needs <DialogProvider> above; the app
 * shell provides it).
 *   const dialog = useDialog();
 *   if (await dialog.confirm({ title: 'Reset progress?', danger: true })) reset();
 *   const pick = await dialog.open({ title: 'Out of hearts', mood: 'worried',
 *     buttons: [{ label: 'Earn a heart', value: 'practice', variant: 'teal' }, { label: 'Wait', value: 'wait', variant: 'ghost' }] });
 *   dialog.sheet({ title: 'Hearts', body: (close) => <HeartsInfo onDone={close} /> });
 */
export function useDialog(): DialogApi {
  const v = useContext(DialogContext);
  if (!v) throw new Error('useDialog() must be used inside <DialogProvider>');
  return v;
}
