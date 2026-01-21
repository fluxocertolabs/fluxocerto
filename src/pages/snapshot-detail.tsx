/**
 * Snapshot detail page - Displays full projection chart and summary from frozen snapshot data.
 * Shows a read-only historical view with "Projeção Histórica" banner.
 */

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSnapshotsStore } from '@/stores/snapshots-store'
import { useSnapshotProjection } from '@/hooks/use-snapshot-projection'
import { CashflowChart } from '@/components/cashflow/cashflow-chart'
import { SummaryPanel } from '@/components/cashflow/summary-panel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Toast } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ArrowLeftIcon, InfoCircledIcon, TrashIcon } from '@radix-ui/react-icons'
import { captureEvent } from '@/lib/analytics/posthog'

export function SnapshotDetailPage() {
  const { snapshotId } = useParams<{ snapshotId: string }>()
  const navigate = useNavigate()
  const { currentSnapshot, isLoading, error, fetchSnapshot, deleteSnapshot } = useSnapshotsStore()
  const { toast, showSuccess, showError, hideToast } = useToast()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const hasTrackedView = useRef(false)

  // Fetch snapshot on mount or when ID changes
  useEffect(() => {
    if (snapshotId) {
      fetchSnapshot(snapshotId)
    }
  }, [snapshotId, fetchSnapshot])

  useEffect(() => {
    if (!currentSnapshot || hasTrackedView.current) return
    hasTrackedView.current = true
    captureEvent('snapshot_viewed')
  }, [currentSnapshot])

  // Transform snapshot data for chart/summary
  const { chartData, dangerRanges, summaryStats } = useSnapshotProjection(currentSnapshot)

  // Handle delete
  const handleDelete = async () => {
    if (!snapshotId) return

    setIsDeleting(true)
    const result = await deleteSnapshot(snapshotId)
    setIsDeleting(false)
    setShowDeleteConfirm(false)

    if (result.success) {
      showSuccess('Projeção excluída com sucesso!')
      // Navigate back to history after a short delay to show the toast
      setTimeout(() => navigate('/history'), 1000)
    } else {
      showError(result.error)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-24 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => navigate('/history')}>
            Voltar ao Histórico
          </Button>
        </div>
      </div>
    )
  }

  // Not found state
  if (!currentSnapshot) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Projeção não encontrada</p>
          <Button variant="outline" onClick={() => navigate('/history')}>
            Voltar ao Histórico
          </Button>
        </div>
      </div>
    )
  }

  // Format date for display
  const formattedDate = format(
    currentSnapshot.createdAt,
    "d 'de' MMMM 'de' yyyy, HH:mm",
    { locale: ptBR }
  )

  return (
    <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/history')}
        className="mb-4 -ml-2"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      {/* Historical snapshot banner */}
      <Card data-testid="historical-banner" className="mb-6 p-4 bg-muted/50 border-muted-foreground/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <InfoCircledIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-semibold text-foreground break-words">
                Projeção Histórica: {currentSnapshot.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Salvo em {formattedDate} • Visualização somente leitura
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-muted-foreground transition-none hover:text-destructive hover:bg-destructive/10 self-end sm:self-auto"
          >
            <TrashIcon className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only">Excluir</span>
          </Button>
        </div>
      </Card>

      {/* Content */}
      <div className="space-y-6">
        {/* Summary Panel */}
        {summaryStats && <SummaryPanel stats={summaryStats} />}

        {/* Cashflow Chart */}
        <CashflowChart chartData={chartData} dangerRanges={dangerRanges} />
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeção?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a projeção "{currentSnapshot.name}"? Esta ação não pode ser desfeita.
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

      {/* Toast notifications */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
          onRetry={toast.onRetry}
        />
      )}
    </div>
  )
}

