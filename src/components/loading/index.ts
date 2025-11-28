/**
 * Loading components barrel export.
 * Provides all loading-related components and primitives.
 */

// Core wrapper component
export { PageLoadingWrapper } from './page-loading-wrapper'

// Skeleton primitives
export {
  SkeletonBase,
  SkeletonCard,
  SkeletonLine,
  SkeletonSummaryCard,
  SkeletonChart,
  SkeletonListItem,
  SkeletonTabs,
  SkeletonBalanceItem,
} from './skeleton-primitives'

// Page-specific skeletons
export { DashboardSkeleton } from './dashboard-skeleton'
export { ManageSkeleton } from './manage-skeleton'
export { ModalSkeleton } from './modal-skeleton'

