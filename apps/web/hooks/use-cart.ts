'use client'

import { useState } from 'react'
import { apiFetch } from '../lib/api-client'

export function useCart(sessionCode: string, onChanged: () => void) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function addItem(input: { memberId: string; itemId?: string; name: string; price: number; quantity: number }) {
    setPending(true)
    setError('')
    try {
      await apiFetch(`/api/sessions/${sessionCode}/cart`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add item')
    } finally {
      setPending(false)
    }
  }

  async function removeItem(itemId: string) {
    setPending(true)
    setError('')
    try {
      await apiFetch(`/api/sessions/${sessionCode}/cart/${itemId}`, { method: 'DELETE' })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove item')
    } finally {
      setPending(false)
    }
  }

  return { addItem, removeItem, pending, error, clearError: () => setError('') }
}
