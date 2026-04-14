import { CartItemPublic, MemberPublic } from '../../types/session'
import { CartItemRow } from './cart-item-row'

export function CartSummary({
  members,
  items,
  currentUserId,
  locked,
  onRemove,
}: {
  members: MemberPublic[]
  items: CartItemPublic[]
  currentUserId?: string
  locked: boolean
  onRemove: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
        <p className="font-semibold text-zinc-800">No items yet</p>
        <p className="mt-1 text-sm text-zinc-500">Add one item to start moving toward the delivery minimum.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {members.map((member) => {
        const memberItems = items.filter((item) => item.memberId === member.id)
        if (memberItems.length === 0) return null
        const isMine = member.userId === currentUserId
        return (
          <div key={member.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900">{isMine ? 'Your cart' : member.user.name || member.user.phone}</h3>
              <span className="text-sm text-zinc-500">{memberItems.length} items</span>
            </div>
            {memberItems.map((item) => (
              <CartItemRow key={item.id} item={item} canRemove={isMine && !locked} onRemove={onRemove} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
