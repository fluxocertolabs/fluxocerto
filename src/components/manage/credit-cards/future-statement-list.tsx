import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { FutureStatement } from '@/types'
import { formatMonthYear, isMonthInPast } from '@/types'

interface FutureStatementListProps {
  statements: FutureStatement[]
  onAdd: () => void
  onEdit: (statement: FutureStatement) => void
  onDelete: (id: string) => void
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

interface FutureStatementItemProps {
  statement: FutureStatement
  onEdit: () => void
  onDelete: () => void
}

function FutureStatementItem({
  statement,
  onEdit,
  onDelete,
}: FutureStatementItemProps) {
  const isPast = isMonthInPast(statement.targetMonth, statement.targetYear)
  const monthLabel = formatMonthYear(statement.targetMonth, statement.targetYear)

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 rounded-lg',
        'bg-muted/50 hover:bg-muted transition-colors',
        isPast && 'opacity-50'
      )}
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{monthLabel}</span>
        <span className="text-sm text-muted-foreground ml-2">·</span>
        <span className="text-sm font-semibold ml-2">
          {formatCurrency(statement.amount)}
        </span>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
          disabled={isPast}
          title={isPast ? 'Não é possível editar meses passados' : 'Editar'}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir fatura futura?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a fatura de {monthLabel}? Esta
                ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export function FutureStatementList({
  statements,
  onAdd,
  onEdit,
  onDelete,
}: FutureStatementListProps) {
  if (statements.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Nenhuma fatura futura definida
        </p>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar próxima fatura
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {statements.map((statement) => (
        <FutureStatementItem
          key={statement.id}
          statement={statement}
          onEdit={() => onEdit(statement)}
          onDelete={() => onDelete(statement.id)}
        />
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2"
        onClick={onAdd}
      >
        <Plus className="h-4 w-4 mr-1" />
        Adicionar
      </Button>
    </div>
  )
}

