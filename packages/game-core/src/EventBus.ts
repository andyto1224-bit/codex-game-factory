export type EventMap = Record<string, unknown>;
type Listener<T> = (payload: T) => void;

/** Snapshot dispatch: subscribers added during emit run on the next emit. */
export class EventBus<Events extends { [Key in keyof Events]: unknown }> {
  private readonly listeners = new Map<keyof Events, Set<Listener<unknown>>>();

  on<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(listener as Listener<unknown>);
    return () => this.off(event, listener);
  }

  off<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): void {
    const bucket = this.listeners.get(event);
    bucket?.delete(listener as Listener<unknown>);
    if (bucket?.size === 0) this.listeners.delete(event);
  }

  once<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): () => void {
    let fired = false;
    const unsubscribe = this.on(event, (payload) => {
      if (fired) return;
      fired = true;
      unsubscribe(); // Remove before invocation, including re-entrant emit.
      listener(payload);
    });
    return unsubscribe;
  }

  emit<Key extends keyof Events>(event: Key, payload: Events[Key]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) listener(payload);
  }

  clear(event?: keyof Events): void {
    if (event === undefined) this.listeners.clear();
    else this.listeners.delete(event);
  }
}
