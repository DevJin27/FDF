'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CartForm } from '../../../components/cart/cart-form'
import { CartSummary } from '../../../components/cart/cart-summary'
import { AppShell, PageSection } from '../../../components/layout/app-shell'
import { CheckoutPanel } from '../../../components/session/checkout-panel'
import { MemberRail } from '../../../components/session/member-rail'
import { ProgressMeter } from '../../../components/session/progress-meter'
import { SessionHeader } from '../../../components/session/session-header'
import { Button } from '../../../components/ui/button'
import { apiFetch } from '../../../lib/api-client'
import { useCart } from '../../../hooks/use-cart'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { useSession } from '../../../hooks/use-session'
import { ItemPublic, OrderPublic } from '../../../types/session'

export default function SessionPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const { session, loading, error, refetch, secondsLeft, connected, subtotal } = useSession(params.code)
  const cart = useCart(params.code, refetch)
  const [items, setItems] = useState<ItemPublic[]>([])
  const [joinPending, setJoinPending] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    if (!session) return
    apiFetch<ItemPublic[]>(`/api/items?platform=${session.platform}`).then(setItems).catch(() => setItems([]))
  }, [session])

  if (loading) {
    return (
      <AppShell>
        <PageSection className="space-y-4">
          <div className="h-40 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-80 animate-pulse rounded-lg bg-zinc-200" />
        </PageSection>
      </AppShell>
    )
  }

  if (error || !session) {
    return (
      <AppShell>
        <PageSection>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-700">{error || 'Session not found'}</div>
        </PageSection>
      </AppShell>
    )
  }

  const isLeader = currentUser?.userId === session.leaderId
  const myMember = session.members.find((member) => member.userId === currentUser?.userId)
  const isLocked = session.status !== 'OPEN'

  async function join() {
    setJoinPending(true)
    setJoinError('')
    try {
      await apiFetch(`/api/sessions/${params.code}/join`, { method: 'POST' })
      await refetch()
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Unable to join session')
    } finally {
      setJoinPending(false)
    }
  }

  function onOrdered(order: OrderPublic) {
    router.push(`/settle/${params.code}?order=${order.id}`)
  }

  return (
    <AppShell>
      <PageSection className="space-y-5">
        <SessionHeader session={session} secondsLeft={secondsLeft} connected={connected} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <ProgressMeter subtotal={subtotal} target={session.minOrder} />
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-zinc-950">Members</h2>
                <button
                  type="button"
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  onClick={() => navigator.clipboard?.writeText(window.location.href)}
                >
                  Copy invite
                </button>
              </div>
              <MemberRail members={session.members} leaderId={session.leaderId} />
            </div>
            <CartSummary
              members={session.members}
              items={session.cartItems}
              currentUserId={currentUser?.userId}
              locked={isLocked}
              onRemove={cart.removeItem}
            />
          </div>

          <aside className="space-y-5">
            {!myMember && session.status === 'OPEN' && (
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h2 className="font-semibold text-zinc-950">Join this room</h2>
                <p className="mt-1 text-sm text-zinc-500">Join before adding your cart items.</p>
                <Button type="button" className="mt-4 w-full" onClick={join} disabled={joinPending}>
                  {joinPending ? 'Joining...' : 'Join session'}
                </Button>
                {joinError && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{joinError}</p>}
              </div>
            )}

            {myMember && !isLocked && (
              <CartForm memberId={myMember.id} items={items} pending={cart.pending} onAdd={cart.addItem} />
            )}

            {cart.error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{cart.error}</p>}

            <CheckoutPanel session={session} subtotal={subtotal} isLeader={isLeader} onLocked={refetch} onOrdered={onOrdered} />

            {session.status === 'SETTLED' && (
              <Button type="button" variant="secondary" className="w-full" onClick={() => router.push(`/settle/${session.code}`)}>
                Open settlement
              </Button>
            )}
          </aside>
        </div>
      </PageSection>
    </AppShell>
  )
}
