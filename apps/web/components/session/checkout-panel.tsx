'use client'

import { useState } from 'react'
import { apiFetch } from '../../lib/api-client'
import { formatCurrency } from '../../lib/formatters'
import { OrderPublic, SessionPublic } from '../../types/session'
import { Button } from '../ui/button'

export function CheckoutPanel({
  session,
  subtotal,
  isLeader,
  onLocked,
  onOrdered,
}: {
  session: SessionPublic
  subtotal: number
  isLeader: boolean
  onLocked: () => Promise<void>
  onOrdered: (order: OrderPublic) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function lock() {
    setPending(true)
    setError('')
    try {
      await apiFetch(`/api/sessions/${session.code}/lock`, { method: 'POST' })
      await onLocked()
      setConfirming(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to lock session')
    } finally {
      setPending(false)
    }
  }

  async function createOrder() {
    setPending(true)
    setError('')
    try {
      const order = await apiFetch<OrderPublic>('/api/order', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: session.code }),
      })
      onOrdered(order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create order')
    } finally {
      setPending(false)
    }
  }

  if (!isLeader) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        {session.status === 'OPEN' ? 'The host will lock the session when everyone is done.' : 'Locked. Waiting for the host to place the order.'}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-zinc-950">Checkout</h2>
          <p className="mt-1 text-sm text-zinc-500">Current cart total: {formatCurrency(subtotal)}</p>
        </div>
        {session.status === 'OPEN' ? (
          <Button type="button" variant="secondary" onClick={() => setConfirming(true)} disabled={pending}>
            Lock
          </Button>
        ) : session.status === 'LOCKED' ? (
          <Button type="button" onClick={createOrder} disabled={pending}>
            Place order
          </Button>
        ) : (
          <Button type="button" variant="ghost" disabled>
            Settled
          </Button>
        )}
      </div>

      {confirming && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Lock this session?</p>
          <p className="mt-1 text-sm text-amber-800">Members will no longer be able to add or remove cart items.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={lock} disabled={pending}>
              Confirm lock
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Keep open
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </div>
  )
}
