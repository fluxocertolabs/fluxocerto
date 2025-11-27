import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { Project, PaymentSchedule } from '@/types'

interface ProjectListItemProps {
  project: Project
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

const FREQUENCY_LABELS: Record<Project['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  'twice-monthly': 'Twice a month',
  monthly: 'Monthly',
}

const CERTAINTY_LABELS: Record<Project['certainty'], string> = {
  guaranteed: 'Guaranteed',
  probable: 'Probable',
  uncertain: 'Uncertain',
}

const CERTAINTY_COLORS: Record<Project['certainty'], string> = {
  guaranteed: 'bg-green-500/10 text-green-700 dark:text-green-400',
  probable: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  uncertain: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(navigator.language, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

function formatPaymentSchedule(schedule: PaymentSchedule | undefined, legacyPaymentDay?: number): string {
  if (schedule) {
    switch (schedule.type) {
      case 'dayOfWeek':
        return WEEKDAY_LABELS[schedule.dayOfWeek] || `Day ${schedule.dayOfWeek}`
      case 'dayOfMonth':
        return `Day ${schedule.dayOfMonth}`
      case 'twiceMonthly':
        return `Days ${schedule.firstDay} & ${schedule.secondDay}`
    }
  }
  // Legacy fallback
  if (legacyPaymentDay !== undefined) {
    return `Day ${legacyPaymentDay}`
  }
  return 'Not set'
}

export function ProjectListItem({
  project,
  onEdit,
  onDelete,
  onToggleActive,
}: ProjectListItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        'p-4 rounded-lg border bg-card transition-opacity',
        !project.isActive && 'opacity-60'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate" title={project.name}>
            {project.name}
          </span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {FREQUENCY_LABELS[project.frequency]}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded', CERTAINTY_COLORS[project.certainty])}>
            {CERTAINTY_LABELS[project.certainty]}
          </span>
          {!project.isActive && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {formatPaymentSchedule(project.paymentSchedule, project.paymentDay)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-medium text-muted-foreground">
          {formatCurrency(project.amount)}
        </span>
        
        <div className="flex items-center gap-1">
          <Switch
            checked={project.isActive}
            onCheckedChange={onToggleActive}
            aria-label={project.isActive ? 'Deactivate project' : 'Activate project'}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

