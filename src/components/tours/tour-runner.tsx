/**
 * Tour runner component - displays coachmarks/tooltips for page tours.
 * 
 * Features:
 * - Highlights target elements with a spotlight effect
 * - Shows contextual tooltips with Next/Back/Skip controls
 * - Handles missing targets gracefully (skips to next step)
 * - Supports keyboard navigation (Escape to close, Arrow keys to navigate)
 */

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TourStep } from '@/lib/tours/definitions'

interface TourRunnerProps {
  /** Array of tour steps */
  steps: TourStep[]
  /** Current step index */
  currentStepIndex: number
  /** Callback to move to next step */
  onNext: () => void
  /** Callback to move to previous step */
  onPrevious: () => void
  /** Callback when tour is completed */
  onComplete: () => void
  /** Callback when tour is dismissed */
  onDismiss: () => void
  /** Whether the tour is active */
  isActive: boolean
}

interface TooltipPosition {
  top: number
  left: number
  arrowPosition: 'top' | 'right' | 'bottom' | 'left'
}

export function TourRunner({
  steps,
  currentStepIndex,
  onNext,
  onPrevious,
  onComplete,
  onDismiss,
  isActive,
}: TourRunnerProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const maskIdRef = useRef<string | null>(null)
  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  if (!maskIdRef.current) {
    maskIdRef.current = `tour-mask-${Math.random().toString(36).slice(2)}`
  }
  const maskId = maskIdRef.current

  // Find and highlight the target element
  useEffect(() => {
    if (!isActive || !currentStep) return

    // Reset for the new step so we don't briefly show stale spotlight/tooltip.
    setTargetRect(null)
    setTooltipPosition(null)

    let cancelled = false
    let rafId: number | null = null
    const startedAt = performance.now()
    const maxWaitMs = 500

    const findTarget = () => {
      const target = document.querySelector(currentStep.target)
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetRect(rect)
        return true
      }
      return false
    }

    // Update position on scroll/resize
    const handleUpdate = () => {
      const target = document.querySelector(currentStep.target)
      if (target) {
        setTargetRect(target.getBoundingClientRect())
      }
    }

    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    const tryFindFast = () => {
      if (cancelled) return

      if (findTarget()) {
        return
      }

      if (performance.now() - startedAt >= maxWaitMs) {
        // Target not found - skip to next step (FR-018)
        console.warn(`Tour target not found: ${currentStep.target}`)
        if (!isLastStep) {
          onNext()
        } else {
          onComplete()
        }
        return
      }

      rafId = requestAnimationFrame(tryFindFast)
    }

    // Find as soon as the element renders (avoid fixed 500ms delay).
    tryFindFast()

    return () => {
      cancelled = true
      if (rafId != null) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [isActive, currentStep, currentStepIndex, isLastStep, onNext, onComplete])

  // Calculate tooltip position
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return

    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const padding = 16
    const placement = currentStep?.placement || 'bottom'

    let top = 0
    let left = 0
    let arrowPosition: 'top' | 'right' | 'bottom' | 'left' = 'top'

    switch (placement) {
      case 'top':
        top = targetRect.top - tooltipRect.height - padding
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2
        arrowPosition = 'bottom'
        break
      case 'bottom':
        top = targetRect.bottom + padding
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2
        arrowPosition = 'top'
        break
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2
        left = targetRect.left - tooltipRect.width - padding
        arrowPosition = 'right'
        break
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2
        left = targetRect.right + padding
        arrowPosition = 'left'
        break
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (left < padding) left = padding
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding
    }
    if (top < padding) top = padding
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding
    }

    setTooltipPosition({ top, left, arrowPosition })
  }, [targetRect, currentStep?.placement])

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onDismiss()
          break
        case 'ArrowRight':
        case 'Enter':
          if (isLastStep) {
            onComplete()
          } else {
            onNext()
          }
          break
        case 'ArrowLeft':
          if (!isFirstStep) {
            onPrevious()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, isFirstStep, isLastStep, onNext, onPrevious, onComplete, onDismiss])

  if (!isActive || !currentStep) return null

  return createPortal(
    <>
      {/* Backdrop overlay with spotlight cutout */}
      {targetRect ? (
        <svg
          className="fixed inset-0 z-[9998] h-full w-full"
          onClick={onDismiss}
          aria-hidden="true"
        >
          <defs>
            <mask id={maskId}>
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={Math.max(0, targetRect.width + 12)}
                height={Math.max(0, targetRect.height + 12)}
                rx="10"
                ry="10"
                fill="black"
              />
            </mask>
          </defs>

          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.55)"
            mask={`url(#${maskId})`}
          />

          {/* Subtle outline for the highlighted area */}
          <rect
            x={Math.max(0, targetRect.left - 6)}
            y={Math.max(0, targetRect.top - 6)}
            width={Math.max(0, targetRect.width + 12)}
            height={Math.max(0, targetRect.height + 12)}
            rx="10"
            ry="10"
            fill="transparent"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
          />
        </svg>
      ) : (
        <div
          className="fixed inset-0 z-[9998] bg-black/55 transition-opacity"
          onClick={onDismiss}
          aria-hidden="true"
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          'fixed z-[10000] w-80 max-w-[90vw]',
          'bg-popover text-popover-foreground',
          'rounded-lg border shadow-lg p-4',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
        style={{
          top: tooltipPosition?.top ?? 0,
          left: tooltipPosition?.left ?? 0,
          visibility: tooltipPosition ? 'visible' : 'hidden',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        {/* Arrow */}
        {tooltipPosition && (
          <div
            className={cn(
              'absolute bg-popover shadow-sm',
              tooltipPosition.arrowPosition === 'top' && 'h-2 w-4 -top-2 left-1/2 -translate-x-1/2',
              tooltipPosition.arrowPosition === 'bottom' && 'h-2 w-4 -bottom-2 left-1/2 -translate-x-1/2',
              tooltipPosition.arrowPosition === 'left' && 'h-4 w-2 -left-2 top-1/2 -translate-y-1/2',
              tooltipPosition.arrowPosition === 'right' && 'h-4 w-2 -right-2 top-1/2 -translate-y-1/2'
            )}
            style={{
              clipPath:
                tooltipPosition.arrowPosition === 'top'
                  ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                  : tooltipPosition.arrowPosition === 'bottom'
                    ? 'polygon(50% 100%, 0% 0%, 100% 0%)'
                    : tooltipPosition.arrowPosition === 'left'
                      ? 'polygon(0% 50%, 100% 0%, 100% 100%)'
                      : 'polygon(100% 50%, 0% 0%, 0% 100%)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <h3 id="tour-title" className="font-semibold text-base mb-1">
            {currentStep.title}
          </h3>
          <p id="tour-content" className="text-sm text-muted-foreground mb-4">
            {currentStep.content}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentStepIndex + 1} de {steps.length}
          </span>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={onPrevious}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            {isLastStep ? (
              <Button size="sm" onClick={onComplete}>
                Concluir
              </Button>
            ) : (
              <Button size="sm" onClick={onNext}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

