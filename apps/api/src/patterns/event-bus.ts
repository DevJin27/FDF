import { SseEventName } from '../shared/types'

type Listener = (event: SseEventName, data: unknown) => void

class EventBus {
  private static instance: EventBus
  private listeners = new Map<string, Set<Listener>>()

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  subscribe(sessionId: string, listener: Listener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set())
    }
    this.listeners.get(sessionId)!.add(listener)
    return () => this.unsubscribe(sessionId, listener)
  }

  unsubscribe(sessionId: string, listener: Listener): void {
    this.listeners.get(sessionId)?.delete(listener)
  }

  emit(sessionId: string, event: SseEventName, data: unknown): void {
    const listeners = this.listeners.get(sessionId)
    if (!listeners) return
    for (const listener of listeners) listener(event, data)
  }

  closeSession(sessionId: string): void {
    this.listeners.delete(sessionId)
  }
}

// Patterns: Singleton + Observer.
export const eventBus = EventBus.getInstance()
