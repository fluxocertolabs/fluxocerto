/**
 * List component for displaying snapshots.
 * Shows SnapshotCard for each snapshot or SnapshotEmptyState if none exist.
 */

import { motion, useReducedMotion } from 'motion/react'
import { SnapshotCard } from './snapshot-card'
import { SnapshotEmptyState } from './snapshot-empty-state'
import type { SnapshotListItem } from '@/types/snapshot'

interface SnapshotListProps {
  snapshots: SnapshotListItem[]
  onDelete?: (id: string) => Promise<void>
  deletingId?: string | null
}

export function SnapshotList({ snapshots, onDelete, deletingId }: SnapshotListProps) {
  const shouldReduceMotion = useReducedMotion()

  if (snapshots.length === 0) {
    return <SnapshotEmptyState />
  }

  return (
    <motion.div
      className="space-y-4"
      initial={shouldReduceMotion ? false : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'show'}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: 0.07, delayChildren: 0.03 },
        },
      }}
    >
      {snapshots.map((snapshot) => (
        <motion.div
          key={snapshot.id}
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <SnapshotCard
            snapshot={snapshot}
            onDelete={onDelete}
            isDeleting={deletingId === snapshot.id}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

