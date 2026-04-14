'use client'

import { useEffect, useState } from 'react'
import { API_URL } from '../lib/api-client'

export function useSessionEvents(sessionCode: string, onChange: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!sessionCode) return

    const source = new EventSource(`${API_URL}/api/sessions/${sessionCode}/events`)

    source.addEventListener('CONNECTED', () => setConnected(true))
    source.addEventListener('TICK', ((event: MessageEvent) => {
      const payload = JSON.parse(event.data) as { secondsLeft: number }
      setSecondsLeft(payload.secondsLeft)
    }) as EventListener)

    for (const eventName of ['MEMBER_JOINED', 'ITEM_ADDED', 'ITEM_REMOVED', 'SESSION_LOCKED', 'SETTLEMENT_UPDATED']) {
      source.addEventListener(eventName, onChange)
    }

    source.onerror = () => setConnected(false)

    return () => {
      source.close()
    }
  }, [sessionCode, onChange])

  return { secondsLeft, connected }
}
