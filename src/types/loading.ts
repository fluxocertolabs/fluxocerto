/**
 * Loading state types for coordinated page loading experience.
 * Provides type definitions for skeleton displays, transitions, and error handling.
 */

/**
 * Represents the current phase of a loading operation.
 * - idle: No loading in progress
 * - loading: Data is being fetched
 * - success: Data loaded successfully
 * - error: An error occurred during loading
 * - timeout: Loading exceeded the timeout threshold
 */
export type LoadingPhase = 'idle' | 'loading' | 'success' | 'error' | 'timeout'

/**
 * Configuration for coordinated loading behavior.
 */
export interface LoadingConfig {
  /** Minimum time to display skeleton (prevents flash), in ms. Default: 100 */
  minDisplayTime?: number
  /** Maximum time to wait before showing timeout error, in ms. Default: 5000 */
  timeoutThreshold?: number
  /** Whether to log timing information in development. Default: true in dev */
  enableDevLogging?: boolean
}

/**
 * Result from the useCoordinatedLoading hook.
 */
export interface CoordinatedLoadingState {
  /** Current loading phase */
  phase: LoadingPhase
  /** Whether skeleton should be displayed */
  showSkeleton: boolean
  /** Whether error state should be displayed */
  showError: boolean
  /** Error message to display (if showError is true) */
  errorMessage: string | null
  /** Timestamp when loading started (for dev logging) */
  loadingStartTime: number | null
  /** Function to retry the failed operation */
  retry: () => void
}

/**
 * Props for page-level skeleton components.
 * Each page has its own skeleton that matches its layout.
 */
export interface PageSkeletonProps {
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Props for skeleton text lines.
 */
export interface SkeletonLineProps {
  /** Width of the line (Tailwind class or CSS value) */
  width?: string
  /** Height of the line. Default: 'h-4' */
  height?: string
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Error state information for display.
 */
interface LoadingErrorState {
  /** Type of error that occurred */
  type: 'network' | 'timeout' | 'api' | 'unknown'
  /** User-friendly error message */
  message: string
  /** Whether the error is retryable */
  canRetry: boolean
  /** Original error object (for logging) */
  originalError?: Error
}

/**
 * Maps error types to user-friendly messages (Portuguese).
 */
export const ERROR_MESSAGES: Record<LoadingErrorState['type'], string> = {
  network: 'Erro de conexão. Verifique sua internet e tente novamente.',
  timeout: 'A requisição demorou muito. Por favor, tente novamente.',
  api: 'Erro ao carregar dados. Por favor, tente novamente.',
  unknown: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
}

