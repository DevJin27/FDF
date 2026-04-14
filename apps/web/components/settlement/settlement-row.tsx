import { formatCurrency } from '../../lib/formatters'
import { SettlementPublic, SessionPublic } from '../../types/session'
import { Button } from '../ui/button'

export function SettlementRow({
  settlement,
  session,
  currentUserId,
  isLeader,
  onMarkPaid,
}: {
  settlement: SettlementPublic
  session: SessionPublic
  currentUserId?: string
  isLeader: boolean
  onMarkPaid: (memberId: string) => void
}) {
  const member = session.members.find((entry) => entry.id === settlement.memberId)
  const userName = settlement.userName || member?.user.name || member?.user.phone || 'Member'
  const isMe = settlement.userId === currentUserId || member?.userId === currentUserId
  const isHost = member?.userId === session.leaderId

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-950">{isMe ? 'You' : userName}</p>
          <p className="text-sm text-zinc-500">{isHost ? 'Host' : 'Member'}</p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="text-right">
            <p className="font-semibold">{formatCurrency(settlement.amountOwed)}</p>
            <p className={settlement.paid ? 'text-sm text-emerald-700' : 'text-sm text-zinc-500'}>
              {settlement.paid ? 'Paid' : 'Pending'}
            </p>
          </div>
          {isLeader && !isHost && !settlement.paid && (
            <Button type="button" variant="ghost" onClick={() => onMarkPaid(settlement.memberId)}>
              Mark paid
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
