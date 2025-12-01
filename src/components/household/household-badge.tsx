import { Home } from 'lucide-react'

interface HouseholdBadgeProps {
  name: string
}

/**
 * Badge component displaying the household name.
 * Used in the header to show which household the user belongs to.
 */
export function HouseholdBadge({ name }: HouseholdBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
      <Home className="h-3 w-3" />
      {name}
    </span>
  )
}

