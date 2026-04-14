import { SessionStatus } from '../../types/session'

export function StatusBadge({ status }: { status: SessionStatus | string }) {
  const styles: Record<string, string> = {
    OPEN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    LOCKED: 'border-amber-200 bg-amber-50 text-amber-700',
    SETTLED: 'border-sky-200 bg-sky-50 text-sky-700',
  }

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] ?? styles.OPEN}`}>
      {status}
    </span>
  )
}
