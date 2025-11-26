/**
 * Empty state for Quick Balance Update when no accounts/cards exist
 */

import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface QuickUpdateEmptyStateProps {
  /** Callback to close the modal */
  onClose: () => void
}

export function QuickUpdateEmptyState({ onClose }: QuickUpdateEmptyStateProps) {
  const navigate = useNavigate()

  const handleNavigateToManage = () => {
    onClose()
    navigate('/manage')
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No Accounts or Credit Cards
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Add bank accounts or credit cards to start tracking your balances.
      </p>
      <Button onClick={handleNavigateToManage}>
        Go to Manage
      </Button>
    </div>
  )
}

