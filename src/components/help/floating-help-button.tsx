/**
 * Floating help button component.
 *
 * UX:
 * - Default: floating "?" FAB in the bottom-right
 * - On hover (desktop): FAB slides/fades out, options slide/fade in *in its place*
 * - On click (touch/mobile): toggles open; click outside closes
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpCircle, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTourStore } from '@/stores/tour-store'
import type { TourKey } from '@/types'

/**
 * Get the tour key for the current route.
 */
function getTourKeyForRoute(pathname: string): TourKey | null {
  if (pathname === '/' || pathname === '/dashboard') {
    return 'dashboard'
  }
  if (pathname === '/manage') {
    return 'manage'
  }
  if (pathname === '/history') {
    return 'history'
  }
  return null
}

interface FloatingHelpButtonProps {
  /** Additional class names */
  className?: string
}

export function FloatingHelpButton({ className }: FloatingHelpButtonProps) {
  const location = useLocation()
  const { startTour } = useTourStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isPinnedOpen, setIsPinnedOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)
  
  const currentTourKey = getTourKeyForRoute(location.pathname)
  
  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsPinnedOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const clearCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const handleOpenHover = () => {
    clearCloseTimeout()
    if (!isPinnedOpen) {
      setIsOpen(true)
    }
  }

  const handleCloseHover = () => {
    if (isPinnedOpen) return
    // Delay closing to prevent flicker when moving to the menu pill
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
    }, 160)
  }

  const handleTogglePinned = () => {
    clearCloseTimeout()
    setIsPinnedOpen((prev) => {
      const next = !prev
      setIsOpen(next)
      return next
    })
  }

  const handleStartTour = () => {
    if (currentTourKey) {
      startTour(currentTourKey)
    }
    setIsOpen(false)
    setIsPinnedOpen(false)
  }

  // Don't render if there's no tour available for this page
  if (!currentTourKey) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        className
      )}
      onMouseEnter={handleOpenHover}
      onMouseLeave={handleCloseHover}
    >
      {/* Menu (slides in from right, replaces the FAB) */}
      <div
        className={cn(
          'absolute bottom-0 right-0',
          'transition-all origin-bottom-right',
          prefersReducedMotion ? 'duration-0' : 'duration-260 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          isOpen
            ? 'opacity-100 translate-x-0 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-x-full translate-y-0 scale-100 pointer-events-none'
        )}
        style={
          prefersReducedMotion
            ? undefined
            : { transitionDelay: isOpen ? '40ms' : '0ms' }
        }
      >
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleStartTour}
            className={cn(
              'group flex items-center gap-3 px-4 py-3 rounded-full',
              'bg-card border border-border shadow-lg',
              'hover:bg-accent hover:border-accent-foreground/20',
              'cursor-pointer transition-all',
              prefersReducedMotion ? 'duration-0' : 'duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
            aria-label="Iniciar tour guiado da página"
          >
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full',
                'bg-primary/10 text-primary',
                'group-hover:bg-primary group-hover:text-primary-foreground',
                // Icon color should switch instantly (no delayed transition)
                'transition-none'
              )}
            >
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-foreground whitespace-nowrap pr-1">
              Conhecer a página
            </span>
          </button>
        </div>
      </div>

      {/* Floating FAB (slides out to the left on open) */}
      <button
        onClick={handleTogglePinned}
        onMouseEnter={clearCloseTimeout}
        className={cn(
          'relative flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-lg hover:shadow-xl',
          'transition-all',
          prefersReducedMotion ? 'duration-0' : 'duration-180 ease-[cubic-bezier(0.2,1,0.2,1)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Idle animation
          !isOpen && !prefersReducedMotion && 'animate-help-pulse',
          // On hover/open: the FAB shoots to the right (off-screen-ish) and fades
          isOpen && 'opacity-0 translate-x-14 scale-75 rotate-12 pointer-events-none'
        )}
        aria-label={isOpen ? 'Ajuda (aberta)' : 'Abrir ajuda'}
        aria-expanded={isOpen}
      >
        <HelpCircle className="w-6 h-6" />

        {/* Animated rings (only when closed) */}
        {!isOpen && !prefersReducedMotion && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-primary-foreground/30 animate-help-ring pointer-events-none" />
            <span className="absolute inset-0 rounded-full border-2 border-primary-foreground/20 animate-help-ring-delayed pointer-events-none" />
          </>
        )}
      </button>
    </div>
  )
}

