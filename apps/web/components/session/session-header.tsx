import Link from 'next/link'
import { formatTimer } from '../../lib/formatters'
import { SessionPublic } from '../../types/session'
import { StatusBadge } from '../ui/status-badge'

export function SessionHeader({
  session,
  secondsLeft,
  connected,
}: {
  session: SessionPublic
  secondsLeft: number | null
  connected: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Back to dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">{session.name}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {session.platform} · Invite code <span className="font-mono font-semibold text-zinc-800">{session.code}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={session.status} />
          {session.status === 'OPEN' && (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700">
              {formatTimer(secondsLeft)}
            </span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
            {connected ? 'Live' : 'Syncing'}
          </span>
        </div>
      </div>
    </div>
  )
}
