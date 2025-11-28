import { cn } from '@/lib/utils'

interface OwnerBadgeProps {
  owner: { name: string } | null
  showUnassigned?: boolean
  className?: string
}

export function OwnerBadge({ owner, showUnassigned = false, className }: OwnerBadgeProps) {
  if (!owner) {
    return showUnassigned ? (
      <span className={cn('text-xs text-muted-foreground', className)}>
        Não atribuído
      </span>
    ) : null
  }

  return (
    <span
      className={cn(
        'text-xs bg-primary/10 text-primary px-2 py-0.5 rounded',
        className
      )}
    >
      {owner.name}
    </span>
  )
}

