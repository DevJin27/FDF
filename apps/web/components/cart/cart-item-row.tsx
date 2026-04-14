import { formatCurrency } from '../../lib/formatters'
import { CartItemPublic } from '../../types/session'
import { Button } from '../ui/button'

export function CartItemRow({
  item,
  canRemove,
  onRemove,
}: {
  item: CartItemPublic
  canRemove: boolean
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-900">{item.name}</p>
        <p className="text-sm text-zinc-500">
          {formatCurrency(item.price)} · Qty {item.quantity}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</span>
        {canRemove && (
          <Button type="button" variant="ghost" className="min-h-9 px-3" onClick={() => onRemove(item.id)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
