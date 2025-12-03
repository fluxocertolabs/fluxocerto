/**
 * List component for displaying snapshots.
 * Shows SnapshotCard for each snapshot or SnapshotEmptyState if none exist.
 */

import { SnapshotCard } from './snapshot-card'
import { SnapshotEmptyState } from './snapshot-empty-state'
import type { SnapshotListItem } from '@/types/snapshot'

interface SnapshotListProps {
  snapshots: SnapshotListItem[]
  onDelete?: (id: string) => Promise<void>
  deletingId?: string | null
}

export function SnapshotList({ snapshots, onDelete, deletingId }: SnapshotListProps) {
  if (snapshots.length === 0) {
    return <SnapshotEmptyState />
  }

  return (
    <div className="space-y-3">
      {snapshots.map((snapshot) => (
        <SnapshotCard
          key={snapshot.id}
          snapshot={snapshot}
          onDelete={onDelete}
          isDeleting={deletingId === snapshot.id}
        />
      ))}
    </div>
  )
}

