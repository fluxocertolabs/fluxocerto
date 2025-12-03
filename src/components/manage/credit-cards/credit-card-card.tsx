import { useState, useMemo } from 'react'
import { MoreHorizontal, Pencil, Trash2, CreditCard as CreditCardIcon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InlineEditInput } from '@/components/manage/shared/inline-edit-input'
import { formatCurrency, formatRelativeTime, isStale } from '@/components/manage/shared/format-utils'
import { cn } from '@/lib/utils'
import type { CreditCard, FutureStatement, FutureStatementInput } from '@/types'
import { FutureStatementList } from './future-statement-list'
import { FutureStatementForm } from './future-statement-form'

interface CreditCardCardProps {
  card: CreditCard
  futureStatements: FutureStatement[]
  onEdit: () => void
  onDelete: () => void
  onUpdateBalance: (balance: number) => Promise<void>
  onAddFutureStatement: (input: FutureStatementInput) => Promise<void>
  onUpdateFutureStatement: (id: string, amount: number) => Promise<void>
  onDeleteFutureStatement: (id: string) => Promise<void>
}

function getDueDayStatus(dueDay: number): { label: string; isUrgent: boolean } {
  const today = new Date()
  const currentDay = today.getDate()
  const daysUntilDue = dueDay >= currentDay 
    ? dueDay - currentDay 
    : (new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - currentDay) + dueDay

  if (daysUntilDue === 0) return { label: 'Vence hoje!', isUrgent: true }
  if (daysUntilDue <= 3) return { label: `Vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`, isUrgent: true }
  return { label: `Dia ${dueDay}`, isUrgent: false }
}

export function CreditCardCard({
  card,
  futureStatements,
  onEdit,
  onDelete,
  onUpdateBalance,
  onAddFutureStatement,
  onUpdateFutureStatement,
  onDeleteFutureStatement,
}: CreditCardCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingStatement, setEditingStatement] = useState<FutureStatement | null>(null)
  
  const stale = isStale(card.balanceUpdatedAt)
  const dueStatus = getDueDayStatus(card.dueDay)

  // Filter future statements for this card and sort by date
  const cardFutureStatements = useMemo(() => {
    return futureStatements
      .filter((s) => s.creditCardId === card.id)
      .sort((a, b) => {
        if (a.targetYear !== b.targetYear) return a.targetYear - b.targetYear
        return a.targetMonth - b.targetMonth
      })
  }, [futureStatements, card.id])

  const handleAddClick = () => {
    setEditingStatement(null)
    setShowForm(true)
  }

  const handleEditClick = (statement: FutureStatement) => {
    setEditingStatement(statement)
    setShowForm(true)
  }

  const handleFormSubmit = async (input: FutureStatementInput) => {
    if (editingStatement) {
      await onUpdateFutureStatement(editingStatement.id, input.amount)
    } else {
      await onAddFutureStatement(input)
    }
    setShowForm(false)
    setEditingStatement(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingStatement(null)
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col p-5 rounded-xl border bg-card',
        'transition-all duration-200 hover:shadow-md hover:border-primary/20'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <CreditCardIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate" title={card.name}>
              {card.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Cartão de Crédito
              {card.owner && <span className="text-primary"> · {card.owner.name}</span>}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowActions(!showActions)}
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {showActions && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowActions(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    setShowActions(false)
                    onEdit()
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                  onClick={() => {
                    setShowActions(false)
                    onDelete()
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="flex-1 flex flex-col justify-center">
        <span className="text-xs text-muted-foreground mb-1">Fatura atual</span>
        <InlineEditInput
          value={card.statementBalance}
          onSave={onUpdateBalance}
          formatDisplay={formatCurrency}
          min={0}
          className="text-2xl font-bold tracking-tight"
        />
      </div>

      {/* Future Statements Section */}
      <Collapsible
        open={isCollapsibleOpen}
        onOpenChange={setIsCollapsibleOpen}
        className="mt-4 pt-3 border-t border-border/50"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between px-0 hover:bg-transparent"
          >
            <span className="text-xs text-muted-foreground">
              Próximas Faturas
              {cardFutureStatements.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">
                  {cardFutureStatements.length}
                </span>
              )}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isCollapsibleOpen && 'rotate-180'
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <FutureStatementList
            statements={cardFutureStatements}
            onAdd={handleAddClick}
            onEdit={handleEditClick}
            onDelete={onDeleteFutureStatement}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Footer - Due Date & Update Status */}
      <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Vencimento</span>
          <span className={cn(
            'font-medium',
            dueStatus.isUrgent ? 'text-amber-500' : 'text-foreground'
          )}>
            {dueStatus.isUrgent && '⚡ '}
            {dueStatus.label}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Última atualização</span>
          <span className={cn(
            'font-medium',
            stale ? 'text-amber-500' : 'text-emerald-500'
          )}>
            {stale && '⚠️ '}
            {formatRelativeTime(card.balanceUpdatedAt)}
          </span>
        </div>
      </div>

      {/* Add/Edit Future Statement Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatement ? 'Editar Fatura Futura' : 'Adicionar Fatura Futura'}
            </DialogTitle>
          </DialogHeader>
          <FutureStatementForm
            creditCardId={card.id}
            existingStatements={cardFutureStatements}
            editingStatement={editingStatement ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
