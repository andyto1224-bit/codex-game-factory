export type EventMap = Record<string, unknown>;
type Listener<T> = (payload: T) => void;

/** 泛型同步事件总线：事件名和负载由 Events 约束，每轮按监听快照派发。 */
export class EventBus<Events extends { [Key in keyof Events]: unknown }> {
  private readonly listeners = new Map<keyof Events, Set<Listener<unknown>>>();

  /** 订阅并返回取消函数；场景退出时调用取消函数，避免重复监听。 */
  on<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(listener as Listener<unknown>);
    return () => this.off(event, listener);
  }

  /** 按函数身份移除监听；不存在的订阅可安全重复取消。 */
  off<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): void {
    const bucket = this.listeners.get(event);
    bucket?.delete(listener as Listener<unknown>);
    if (bucket?.size === 0) this.listeners.delete(event);
  }

  /** 只执行一次；fired 同时防止本轮旧快照和重入 emit 使回调重复执行。 */
  once<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): () => void {
    let fired = false;
    const unsubscribe = this.on(event, (payload) => {
      if (fired) return;
      fired = true;
      unsubscribe(); // 先解除订阅，再执行可能再次 emit 的业务回调。
      listener(payload);
    });
    return unsubscribe;
  }

  /** 新订阅从下轮生效；移除订阅不修改本轮快照，监听异常向调用方传播。 */
  emit<Key extends keyof Events>(event: Key, payload: Events[Key]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) listener(payload);
  }

  /** 不传事件名则清空全部订阅；已在执行的 emit 仍使用它自己的快照。 */
  clear(event?: keyof Events): void {
    if (event === undefined) this.listeners.clear();
    else this.listeners.delete(event);
  }
}
