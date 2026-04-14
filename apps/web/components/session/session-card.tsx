import Link from 'next/link'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { SessionPublic } from '../../types/session'
import { StatusBadge } from '../ui/status-badge'

export function SessionCard({ session }: { session: SessionPublic }) {
  return (
    <Link
      href={session.status === 'SETTLED' ? `/settle/${session.code}` : `/session/${session.code}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-950">{session.name}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {session.platform} · {session.members.length} members · {formatDate(session.createdAt)}
          </p>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-zinc-500">Minimum</span>
        <span className="font-semibold">{formatCurrency(session.minOrder)}</span>
      </div>
    </Link>
  )
}
