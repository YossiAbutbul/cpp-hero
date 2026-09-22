/** Renders the dialogs/sheets opened through useDialog() (see dialogContext.ts). */
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../Button';
import { Dialog } from './Dialog';
import { DialogContext, type DialogApi, type OpenDialogOptions, type OpenSheetOptions } from './dialogContext';
import { Sheet } from './Sheet';

type Item =
  | { kind: 'dialog'; id: number; open: boolean; opts: OpenDialogOptions<unknown>; resolve: (v: unknown) => void }
  | { kind: 'sheet'; id: number; open: boolean; opts: OpenSheetOptions; resolve: () => void };

export function DialogProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);

  const finish = useCallback((id: number, value?: unknown) => {
    setItems((list) =>
      list.map((it) => {
        if (it.id !== id || !it.open) return it;
        it.resolve(value);
        return { ...it, open: false };
      }),
    );
  }, []);
  const remove = useCallback((id: number) => setItems((list) => list.filter((it) => it.id !== id)), []);

  const api = useMemo<DialogApi>(() => {
    const open = <T,>(opts: OpenDialogOptions<T>) =>
      new Promise<T | undefined>((resolve) => {
        const id = ++seq.current;
        setItems((l) => [
          ...l,
          {
            kind: 'dialog',
            id,
            open: true,
            opts: opts as OpenDialogOptions<unknown>,
            resolve: resolve as (v: unknown) => void,
          },
        ]);
      });
    return {
      open,
      confirm: ({ title, body, yes = 'Yes', no = 'Cancel', danger }) =>
        open<boolean>({
          title,
          body,
          mood: danger ? 'worried' : 'thinking',
          dismissValue: false,
          buttons: [
            { label: yes, value: true, variant: danger ? 'coral' : 'primary' },
            { label: no, value: false, variant: 'ghost' },
          ],
        }).then((v) => v === true),
      sheet(opts) {
        const id = ++seq.current;
        let resolveClosed: () => void = () => {};
        const closed = new Promise<void>((r) => (resolveClosed = r));
        setItems((l) => [...l, { kind: 'sheet', id, open: true, opts, resolve: resolveClosed }]);
        return { close: () => finish(id), closed };
      },
    };
  }, [finish]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {items.map((it) => {
        if (it.kind === 'sheet') {
          const close = () => finish(it.id);
          const b = it.opts.body;
          return (
            <Sheet key={it.id} open={it.open} onClose={close} title={it.opts.title} onExited={() => remove(it.id)}>
              {typeof b === 'function' ? b(close) : b}
            </Sheet>
          );
        }
        const o = it.opts;
        const close = (v: unknown) => finish(it.id, v);
        const buttons = o.buttons ?? [{ label: 'OK', value: true as unknown }];
        return (
          <Dialog
            key={it.id}
            open={it.open}
            onClose={() => close(o.dismissValue)}
            dismissible={o.dismissible ?? true}
            title={o.title}
            mood={o.mood}
            art={o.art}
            onExited={() => remove(it.id)}
            actions={buttons.map((btn, i) => (
              <Button
                key={i}
                variant={btn.variant ?? (i ? 'ghost' : 'primary')}
                icon={btn.icon}
                onClick={() => close(btn.value)}
                data-autofocus={i === 0 ? true : undefined}
              >
                {btn.label}
              </Button>
            ))}
          >
            {typeof o.body === 'function' ? o.body(close) : o.body}
          </Dialog>
        );
      })}
    </DialogContext.Provider>
  );
}
