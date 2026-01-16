/**
 * Floating help button component.
 *
 * UX:
 * - Default: floating "?" FAB in the bottom-right
 * - On hover (desktop): FAB slides/fades out, options slide/fade in *in its place*
 * - On click (touch/mobile): toggles open; click outside closes
 *
 * The menu shows:
 * - "Conhecer a página" (tour) — only on pages with tours
 * - "Falar com suporte" (Tawk.to chat) — only when Tawk is configured
 * - "Sugerir melhorias" (Canny feedback portal) — always visible
 */

import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpCircle, Compass, MessageCircle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTourStore } from '@/stores/tour-store'
import { useAuth } from '@/hooks/use-auth'
import { isTawkConfigured, openSupportChat, preloadTawkWidget } from '@/lib/support-chat/tawk'
import type { TourKey } from '@/types'

const CLOSE_DELAY_MS = 380
const HOVER_SAFE_PADDING_PX = 28
const CANNY_FEEDBACK_URL = 'https://fluxo-certo.canny.io'

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
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isPinnedOpen, setIsPinnedOpen] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)
  
  const currentTourKey = getTourKeyForRoute(location.pathname)
  const showTawkOption = isTawkConfigured()
  
  // Canny feedback is always available
  const showCannyOption = true
  
  // If there's nothing to show in the menu, don't render the button at all
  const hasAnyOption = Boolean(currentTourKey) || showTawkOption || showCannyOption
  
  // Preload Tawk widget in background when user is authenticated
  // This makes the chat open instantly when they click the button
  useEffect(() => {
    if (user && showTawkOption) {
      preloadTawkWidget()
    }
  }, [user, showTawkOption])
  
  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const clearCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const getHoverSafeRect = useCallback(() => {
    const rects: DOMRect[] = []
    if (containerRef.current) rects.push(containerRef.current.getBoundingClientRect())
    if (menuRef.current) rects.push(menuRef.current.getBoundingClientRect())
    if (rects.length === 0) return null

    return {
      left: Math.min(...rects.map((r) => r.left)) - HOVER_SAFE_PADDING_PX,
      top: Math.min(...rects.map((r) => r.top)) - HOVER_SAFE_PADDING_PX,
      right: Math.max(...rects.map((r) => r.right)) + HOVER_SAFE_PADDING_PX,
      bottom: Math.max(...rects.map((r) => r.bottom)) + HOVER_SAFE_PADDING_PX,
    }
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShouldAnimate(true)
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

  // Keep the menu open while the pointer is within a forgiving "safe zone"
  // around the FAB + menu, so small mouse movements don't instantly close it.
  useEffect(() => {
    if (!isOpen || isPinnedOpen) return
    if (typeof window === 'undefined') return

    const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? true
    if (!canHover) return

    function handlePointerMove(event: PointerEvent) {
      const rect = getHoverSafeRect()
      if (!rect) return

      const inSafeZone =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      if (inSafeZone) {
        clearCloseTimeout()
        return
      }

      if (!timeoutRef.current) {
        timeoutRef.current = window.setTimeout(() => {
          setIsOpen(false)
          timeoutRef.current = null
        }, CLOSE_DELAY_MS)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [clearCloseTimeout, getHoverSafeRect, isOpen, isPinnedOpen])

  // Early return AFTER all hooks have been called
  if (!hasAnyOption) {
    return null
  }

  const handleOpenHover = () => {
    clearCloseTimeout()
    if (!isPinnedOpen) {
      setShouldAnimate(true)
      setIsOpen(true)
    }
  }

  const handleCloseHover = (event: ReactMouseEvent) => {
    if (isPinnedOpen) return
    const rect = getHoverSafeRect()
    if (
      rect &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    ) {
      // Pointer left the component subtree, but is still close enough (safe zone).
      // Let the pointermove handler keep the menu open.
      return
    }

    // Delay closing so the user can move a bit away without instantly losing the menu
    clearCloseTimeout()
    timeoutRef.current = window.setTimeout(() => {
      setShouldAnimate(true)
      setIsOpen(false)
      timeoutRef.current = null
    }, CLOSE_DELAY_MS)
  }

  const handleTogglePinned = () => {
    clearCloseTimeout()
    setShouldAnimate(true)
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
    setShouldAnimate(true)
    setIsOpen(false)
    setIsPinnedOpen(false)
  }

  const handleOpenChat = async () => {
    setShouldAnimate(true)
    setIsOpen(false)
    setIsPinnedOpen(false)

    if (!user?.email) {
      console.warn('[FloatingHelpButton] No user email available for chat')
      return
    }

    try {
      await openSupportChat({
        email: user.email,
        name: user.user_metadata?.name as string | undefined,
      })
    } catch (err) {
      console.error('[FloatingHelpButton] Failed to open support chat:', err)
    }
  }

  const handleOpenFeedback = () => {
    setShouldAnimate(true)
    setIsOpen(false)
    setIsPinnedOpen(false)
    window.open(CANNY_FEEDBACK_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      ref={containerRef}
      data-testid="floating-help-button"
      className={cn(
        'fixed bottom-6 right-6 z-50',
        className
      )}
      onMouseEnter={handleOpenHover}
      onMouseLeave={handleCloseHover}
    >
      {/* Menu (slides in from right, replaces the FAB) */}
      <div
        ref={menuRef}
        className={cn(
          'absolute bottom-0 right-0 z-20',
          'origin-bottom-right',
          shouldAnimate && (isOpen ? 'animate-help-menu-in' : 'animate-help-menu-out'),
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col items-end gap-2">
          {/* 
           * Button order (bottom to top, closest to FAB first):
           * 1. Support chat (most important - direct help)
           * 2. Feedback (Canny)
           * 3. Tour (page-specific)
           */}

          {/* Tour option — only on pages with tours (top) */}
          {currentTourKey && (
            <button
              onClick={handleStartTour}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-full',
                'bg-card border border-border shadow-lg',
                'hover:bg-accent hover:border-accent-foreground/20',
                'cursor-pointer',
                // Animate the pill *in* only. On close, the container animates out and carries it with it.
                shouldAnimate && isOpen && 'animate-help-pill-in',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-label="Iniciar tour guiado da página"
              tabIndex={isOpen ? 0 : -1}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
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
          )}

          {/* Feedback option — link to Canny.io portal (middle) */}
          {showCannyOption && (
            <button
              onClick={handleOpenFeedback}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-full',
                'bg-card border border-border shadow-lg',
                'hover:bg-accent hover:border-accent-foreground/20',
                'cursor-pointer',
                shouldAnimate && isOpen && 'animate-help-pill-in',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-label="Sugerir melhorias ou reportar problemas"
              tabIndex={isOpen ? 0 : -1}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
                  'bg-primary/10 text-primary',
                  'group-hover:bg-primary group-hover:text-primary-foreground',
                  'transition-none'
                )}
              >
                <Lightbulb className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-foreground whitespace-nowrap pr-1">
                Sugerir melhorias
              </span>
            </button>
          )}

          {/* Chat option — only when Tawk.to is configured (bottom, closest to FAB) */}
          {showTawkOption && (
            <button
              onClick={handleOpenChat}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-full',
                'bg-card border border-border shadow-lg',
                'hover:bg-accent hover:border-accent-foreground/20',
                'cursor-pointer',
                shouldAnimate && isOpen && 'animate-help-pill-in',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-label="Abrir chat de suporte"
              tabIndex={isOpen ? 0 : -1}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
                  'bg-primary/10 text-primary',
                  'group-hover:bg-primary group-hover:text-primary-foreground',
                  'transition-none'
                )}
              >
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-foreground whitespace-nowrap pr-1">
                Falar com suporte
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Floating FAB (slides out to the right on open) */}
      <button
        onClick={handleTogglePinned}
        onMouseEnter={clearCloseTimeout}
        className={cn(
          // Keep FAB above the menu while it animates out (menu is clickable; FAB is pointer-events-none when open).
          'relative z-30 flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-lg hover:shadow-xl',
          'will-change-transform',
          shouldAnimate && (isOpen ? 'animate-help-fab-out' : 'animate-help-fab-in'),
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Idle animation
          !isOpen && !prefersReducedMotion && 'animate-help-pulse',
          // When open, prevent interactions. Visuals are handled by keyframe animation.
          isOpen && 'pointer-events-none',
          // Safety: if the menu is forced open without animations, still hide the FAB.
          isOpen && !shouldAnimate && 'opacity-0'
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

