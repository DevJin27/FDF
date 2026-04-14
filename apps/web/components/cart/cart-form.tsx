'use client'

import Image from 'next/image'
import { FormEvent, useState } from 'react'
import { formatCurrency } from '../../lib/formatters'
import { ItemPublic } from '../../types/session'
import { Button } from '../ui/button'
import { Field, Input } from '../ui/input'

const itemImages: Record<string, string> = {
  SWIGGY: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=80',
  BLINKIT: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=80',
  ZEPTO: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80',
}

export function CartForm({
  memberId,
  items,
  pending,
  onAdd,
}: {
  memberId: string
  items: ItemPublic[]
  pending: boolean
  onAdd: (input: { memberId: string; itemId?: string; name: string; price: number; quantity: number }) => void
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || Number(price) <= 0) return
    onAdd({ memberId, name: name.trim(), price: Number(price), quantity: 1 })
    setName('')
    setPrice('')
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="font-semibold text-zinc-950">Add items</h2>
        <p className="mt-1 text-sm text-zinc-500">Pick a quick item or add your own cart line.</p>
      </div>

      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.slice(0, 4).map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={pending}
              onClick={() => onAdd({ memberId, itemId: item.id.startsWith('fallback-') ? undefined : item.id, name: item.name, price: item.price, quantity: 1 })}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 text-left transition hover:border-emerald-300 disabled:opacity-60"
            >
              <div className="relative h-28 w-full">
                <Image src={item.imageUrl || itemImages[item.platform]} alt="" fill sizes="(min-width: 640px) 280px, 100vw" className="object-cover" />
              </div>
              <div className="p-3">
                <p className="font-semibold text-zinc-900">{item.name}</p>
                <p className="text-sm text-zinc-500">{formatCurrency(item.price)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <Field label="Item name">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dosa, milk, coffee..." disabled={pending} />
        </Field>
        <Field label="Price">
          <Input type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="149" disabled={pending} />
        </Field>
        <Button type="submit" disabled={pending || !name.trim() || Number(price) <= 0}>
          Add
        </Button>
      </form>
    </div>
  )
}
