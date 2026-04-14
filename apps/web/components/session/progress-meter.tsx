import { formatCurrency } from '../../lib/formatters'

export function ProgressMeter({ subtotal, target }: { subtotal: number; target: number }) {
  const percent = Math.min(100, Math.round((subtotal / target) * 100)) || 0
  const gap = Math.max(0, target - subtotal)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-zinc-800">Group cart</span>
        <span className="text-zinc-600">
          {formatCurrency(subtotal)} / {formatCurrency(target)}
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        {gap === 0 ? 'Minimum reached. Ready to lock.' : `${formatCurrency(gap)} more to unlock free delivery.`}
      </p>
    </div>
  )
}
