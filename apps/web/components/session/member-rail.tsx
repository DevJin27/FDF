import { MemberPublic } from '../../types/session'

export function MemberRail({ members, leaderId }: { members: MemberPublic[]; leaderId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => {
        const label = member.user.name || member.user.phone
        return (
          <span
            key={member.id}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {label.charAt(0).toUpperCase()}
            </span>
            {label}
            {member.userId === leaderId && <span className="text-xs font-semibold text-emerald-700">Host</span>}
          </span>
        )
      })}
    </div>
  )
}
