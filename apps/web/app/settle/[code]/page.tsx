'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AppShell, PageSection } from '../../../components/layout/app-shell'
import { SettlementRow } from '../../../components/settlement/settlement-row'
import { Button } from '../../../components/ui/button'
import { StatusBadge } from '../../../components/ui/status-badge'
import { apiFetch } from '../../../lib/api-client'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { formatCurrency } from '../../../lib/formatters'
import { SessionPublic, SettlementPublic } from '../../../types/session'

function upiLink(upiId: string, amount: number, note: string) {
  const params = new URLSearchParams({
    pa: upiId,
    am: amount.toFixed(2),
    tn: note,
    cu: 'INR',
  })
  return `upi://pay?${params.toString()}`
}

export default function SettlementPage({ params }: { params: { code: string } }) {
  const currentUser = useCurrentUser()
  const [session, setSession] = useState<SessionPublic | null>(null)
  const [breakdown, setBreakdown] = useState<SettlementPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [sessionData, settlementData] = await Promise.all([
        apiFetch<SessionPublic>(`/api/sessions/${params.code}`),
        apiFetch<SettlementPublic[]>(`/api/sessions/${params.code}/settlement`),
      ])
      setSession(sessionData)
      setBreakdown(settlementData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settlement')
    } finally {
      setLoading(false)
    }
  }, [params.code])

  useEffect(() => {
    load()
  }, [load])

  async function markPaid(memberId: string) {
    try {
      await apiFetch(`/api/sessions/${params.code}/settlement/${memberId}/mark-paid`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark as paid')
    }
  }

  if (loading) {
    return (
      <AppShell>
        <PageSection className="space-y-4">
          <div className="h-32 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-64 animate-pulse rounded-lg bg-zinc-200" />
        </PageSection>
      </AppShell>
    )
  }

  if (error || !session) {
    return (
      <AppShell>
        <PageSection>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-700">{error || 'Settlement not found'}</div>
        </PageSection>
      </AppShell>
    )
  }

  const total = breakdown.reduce((sum, row) => sum + row.amountOwed, 0)
  const isLeader = currentUser?.userId === session.leaderId
  const mySettlement = breakdown.find((row) => {
    const member = session.members.find((entry) => entry.id === row.memberId)
    return member?.userId === currentUser?.userId
  })
  const shouldPayLeader = mySettlement && currentUser?.userId !== session.leaderId && mySettlement.amountOwed > 0 && !mySettlement.paid

  return (
    <AppShell>
      <PageSection className="space-y-5">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-6">
          <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Back to dashboard
          </Link>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950">Settlement</h1>
              <p className="mt-2 text-sm text-zinc-500">{session.name}</p>
            </div>
            <StatusBadge status={session.status} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">Total</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(total)}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">Members</p>
              <p className="mt-1 text-2xl font-bold">{session.members.length}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">Platform</p>
              <p className="mt-1 text-2xl font-bold">{session.platform}</p>
            </div>
          </div>
        </div>

        {shouldPayLeader && session.leader.upiId && (
          <a
            href={upiLink(session.leader.upiId, mySettlement.amountOwed, `FDF-${session.code}`)}
            className="block rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Pay host {formatCurrency(mySettlement.amountOwed)} via UPI
          </a>
        )}

        <div className="space-y-3">
          {breakdown.map((row) => (
            <SettlementRow
              key={row.memberId}
              settlement={row}
              session={session}
              currentUserId={currentUser?.userId}
              isLeader={isLeader}
              onMarkPaid={markPaid}
            />
          ))}
        </div>

        {isLeader && (
          <Button type="button" variant="ghost" onClick={load}>
            Refresh settlement
          </Button>
        )}
      </PageSection>
    </AppShell>
  )
}
