/** Tiny typed event emitter (the engine's replacement for legacy CH.events). */
export type Handler<T> = (payload: T) => void;

export class Emitter<Events extends object> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  /** Subscribe; returns an unsubscribe function. */
  on<K extends keyof Events>(evt: K, fn: Handler<Events[K]>): () => void {
    let set = this.handlers.get(evt);
    if (!set) this.handlers.set(evt, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  }

  emit<K extends keyof Events>(evt: K, payload: Events[K]): void {
    for (const fn of [...(this.handlers.get(evt) ?? [])]) {
      try {
        (fn as Handler<Events[K]>)(payload);
      } catch (e) {
        console.error(`[events] handler for ${String(evt)} failed`, e);
      }
    }
  }
}
