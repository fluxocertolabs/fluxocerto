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
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md"
    >
      <Users className="h-3 w-3" />
      {name}
    </span>
  )
}


