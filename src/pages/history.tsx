/**
 * History page - Displays list of saved projection snapshots.
 * Allows users to browse, view, and manage their snapshot history.
 */

import { useEffect, useState } from 'react'
import { useSnapshotsStore } from '@/stores/snapshots-store'
import { SnapshotList } from '@/components/snapshots/snapshot-list'
import { Toast } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function HistoryPage() {
  const { snapshots, isLoading, error, fetchSnapshots, deleteSnapshot } = useSnapshotsStore()
  const { toast, showSuccess, showError, hideToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch snapshots on mount
  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  // Handle delete snapshot
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const result = await deleteSnapshot(id)
    setDeletingId(null)

    if (result.success) {
      showSuccess('Snapshot excluído com sucesso!')
    } else {
      showError(result.error, () => handleDelete(id))
    }
  }

  return (
    <div className={cn('container mx-auto p-4 md:p-6 max-w-4xl')}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Histórico de Snapshots
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize e compare suas projeções financeiras salvas
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {/* Loading skeleton */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => fetchSnapshots()}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <SnapshotList
          snapshots={snapshots}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
          onRetry={toast.onRetry}
        />
      )}
    </div>
  )
}

