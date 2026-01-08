/**
 * Tour trigger component - button to manually start a page tour.
 * 
 * Used in the header menu and potentially on individual pages
 * to allow users to replay tours.
 */

import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TourTriggerProps {
  /** Callback to start the tour */
  onStartTour: () => void
  /** Whether the tour is currently loading */
  isLoading?: boolean
  /** Whether the tour is currently active */
  isActive?: boolean
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Additional class names */
  className?: string
  /** Custom label (default: "Mostrar tour") */
  label?: string
  /** Whether to show icon only */
  iconOnly?: boolean
}

export function TourTrigger({
  onStartTour,
  isLoading = false,
  isActive = false,
  variant = 'ghost',
  size = 'sm',
  className,
  label = 'Mostrar tour',
  iconOnly = false,
}: TourTriggerProps) {
  if (iconOnly) {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={onStartTour}
        disabled={isLoading || isActive}
        className={cn(className)}
        aria-label={label}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onStartTour}
      disabled={isLoading || isActive}
      className={cn(className)}
    >
      <HelpCircle className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}






