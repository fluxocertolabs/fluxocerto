import { Users } from 'lucide-react'

interface GroupBadgeProps {
  name: string
}

/**
 * Badge component displaying the group name.
 * Used in the header to show which group the user belongs to.
 */
export function GroupBadge({ name }: GroupBadgeProps) {
  return (
    <span
      data-testid="group-badge"
      title={name}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md min-w-0 max-w-[11rem] md:max-w-none"
    >
      <Users className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  )
}



