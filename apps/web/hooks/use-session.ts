'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api-client'
import { SessionPublic } from '../types/session'
import { useSessionEvents } from './use-session-events'

export function useSession(sessionCode: string) {
  const [session, setSession] = useState<SessionPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    try {
      setError('')
      const data = await apiFetch<SessionPublic>(`/api/sessions/${sessionCode}`)
      setSession(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load session')
    } finally {
      setLoading(false)
    }
  }, [sessionCode])

  useEffect(() => {
    setLoading(true)
    refetch()
  }, [refetch])

  const events = useSessionEvents(sessionCode, refetch)

  const totals = useMemo(() => {
    const subtotal = session?.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0
    const deliveryGap = Math.max(0, (session?.minOrder ?? 0) - subtotal)
    return { subtotal, deliveryGap, qualifies: deliveryGap === 0 }
  }, [session])

  return { session, loading, error, refetch, ...events, ...totals }
}
