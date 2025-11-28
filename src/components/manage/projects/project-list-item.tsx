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
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  'twice-monthly': 'Duas vezes por mês',
  monthly: 'Mensal',
}

const CERTAINTY_LABELS: Record<Project['certainty'], string> = {
  guaranteed: 'Garantido',
  probable: 'Provável',
  uncertain: 'Incerto',
}

const CERTAINTY_COLORS: Record<Project['certainty'], string> = {
  guaranteed: 'bg-green-500/10 text-green-700 dark:text-green-400',
  probable: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  uncertain: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

function formatCurrency(cents: number): string {
  // Convert cents to reais for display
  const reais = cents / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(reais)
}

/**
 * Format project amount, showing slash format for variable amounts.
 * e.g., "R$ 3.000,00 / R$ 500,00" for variable amounts
 */
function formatProjectAmount(project: Project): string {
  const schedule = project.paymentSchedule
  if (schedule?.type === 'twiceMonthly' && schedule.firstAmount !== undefined && schedule.secondAmount !== undefined) {
    return `${formatCurrency(schedule.firstAmount)} / ${formatCurrency(schedule.secondAmount)}`
  }
  return formatCurrency(project.amount)
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo',
}

function formatPaymentSchedule(schedule: PaymentSchedule | undefined, legacyPaymentDay?: number): string {
  if (schedule) {
    switch (schedule.type) {
      case 'dayOfWeek':
        return WEEKDAY_LABELS[schedule.dayOfWeek] || `Dia ${schedule.dayOfWeek}`
      case 'dayOfMonth':
        return `Dia ${schedule.dayOfMonth}`
      case 'twiceMonthly':
        return `Dias ${schedule.firstDay} e ${schedule.secondDay}`
    }
  }
  // Legacy fallback
  if (legacyPaymentDay !== undefined) {
    return `Dia ${legacyPaymentDay}`
  }
  return 'Não definido'
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
            <span className="text-xs bg-muted px-2 py-0.5 rounded">Inativo</span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {formatPaymentSchedule(project.paymentSchedule, project.paymentDay)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-medium text-muted-foreground">
          {formatProjectAmount(project)}
        </span>
        
        <div className="flex items-center gap-1">
          <Switch
            checked={project.isActive}
            onCheckedChange={onToggleActive}
            aria-label={project.isActive ? 'Desativar projeto' : 'Ativar projeto'}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
          >
            Excluir
          </Button>
        </div>
      </div>
    </div>
  )
}

