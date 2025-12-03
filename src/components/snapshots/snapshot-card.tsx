/**
 * Card component for displaying a snapshot in the history list.
 * Shows name, date, and summary metrics with optional delete action.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
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
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { formatCurrencyWithCents } from '@/lib/format'
import { TrashIcon } from '@radix-ui/react-icons'
import type { SnapshotListItem } from '@/types/snapshot'

interface SnapshotCardProps {
  snapshot: SnapshotListItem
  onDelete?: (id: string) => Promise<void>
  isDeleting?: boolean
}

export function SnapshotCard({ snapshot, onDelete, isDeleting }: SnapshotCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { id, name, createdAt, summaryMetrics } = snapshot
  const { startingBalance, endBalanceOptimistic, dangerDayCount } = summaryMetrics

  // Format date in Portuguese
  const formattedDate = format(createdAt, "d 'de' MMMM 'de' yyyy, HH:mm", {
    locale: ptBR,
  })

  // Calculate balance change
  const balanceChange = endBalanceOptimistic - startingBalance
  const isPositiveChange = balanceChange >= 0

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(id)
    }
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <Link to={`/history/${id}`}>
        <Card
          className={cn(
            'p-4 hover:bg-muted/50 transition-colors cursor-pointer relative',
            'border-l-4',
            dangerDayCount > 0 ? 'border-l-destructive' : 'border-l-emerald-500'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
            </div>

            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Saldo inicial:</span>
                <span className="font-medium">
                  {formatCurrencyWithCents(startingBalance)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Saldo final:</span>
                <span
                  className={cn(
                    'font-medium',
                    isPositiveChange ? 'text-emerald-600' : 'text-destructive'
                  )}
                >
                  {formatCurrencyWithCents(endBalanceOptimistic)}
                </span>
              </div>
              {dangerDayCount > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-destructive text-xs font-medium">
                    {dangerDayCount} {dangerDayCount === 1 ? 'dia' : 'dias'} de risco
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Delete button */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowDeleteConfirm(true)
              }}
              disabled={isDeleting}
              className="absolute top-2 right-2 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              aria-label="Excluir snapshot"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </Card>
      </Link>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o snapshot "{name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

