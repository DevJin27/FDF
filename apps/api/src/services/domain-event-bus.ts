import { DomainEventMap } from "../lib/domain";

type DomainEventName = keyof DomainEventMap;

export interface DomainEventSubscriber {
  onEvent<K extends DomainEventName>(
    name: K,
    payload: DomainEventMap[K]
  ): void | Promise<void>;
}

export class DomainEventBus {
  private readonly subscribers = new Set<DomainEventSubscriber>();

  subscribe(subscriber: DomainEventSubscriber) {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  async emit<K extends DomainEventName>(name: K, payload: DomainEventMap[K]) {
    for (const subscriber of this.subscribers) {
      await subscriber.onEvent(name, payload);
    }
  }
}
