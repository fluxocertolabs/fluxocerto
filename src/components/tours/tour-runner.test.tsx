/**
 * Tests for TourRunner component.
 *
 * Covers:
 * - Renders step UI when target exists
 * - Deterministic missing target skips/advances
 * - Keyboard navigation: ArrowRight/ArrowLeft/Escape
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { TourRunner } from './tour-runner'
import type { TourStep } from '@/lib/tours/definitions'

// Mock createPortal to render in the test container
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  }
})

describe('TourRunner', () => {
  const mockSteps: TourStep[] = [
    {
      target: '[data-tour="step1"]',
      title: 'Step 1',
      content: 'Content for step 1',
      placement: 'bottom',
    },
    {
      target: '[data-tour="step2"]',
      title: 'Step 2',
      content: 'Content for step 2',
      placement: 'top',
    },
    {
      target: '[data-tour="step3"]',
      title: 'Step 3',
      content: 'Content for step 3',
      placement: 'right',
    },
  ]

  const defaultProps = {
    steps: mockSteps,
    currentStepIndex: 0,
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onComplete: vi.fn(),
    onDismiss: vi.fn(),
    isActive: true,
  }

  // Create target elements in the DOM
  function createTargetElement(selector: string) {
    const el = document.createElement('div')
    el.setAttribute('data-tour', selector.replace('[data-tour="', '').replace('"]', ''))
    el.style.position = 'fixed'
    el.style.top = '100px'
    el.style.left = '100px'
    el.style.width = '100px'
    el.style.height = '50px'
    document.body.appendChild(el)
    return el
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    // Clean up target elements
    document.querySelectorAll('[data-tour]').forEach((el) => el.remove())
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('does not render when isActive is false', () => {
      render(<TourRunner {...defaultProps} isActive={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders tooltip when target exists', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      // Wait for target to be found
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Content for step 1')).toBeInTheDocument()
    })

    it('shows step counter', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByText('1 de 3')).toBeInTheDocument()
      })
    })

    it('shows close button', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fechar tour/i })).toBeInTheDocument()
      })
    })

    it('shows Próximo button on non-last step', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /próximo/i })).toBeInTheDocument()
      })
    })

    it('shows Concluir button on last step', async () => {
      createTargetElement('[data-tour="step3"]')
      
      render(<TourRunner {...defaultProps} currentStepIndex={2} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /concluir/i })).toBeInTheDocument()
      })
    })

    it('hides Voltar button on first step', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /voltar/i })).not.toBeInTheDocument()
    })

    it('shows Voltar button on non-first step', async () => {
      createTargetElement('[data-tour="step2"]')
      
      render(<TourRunner {...defaultProps} currentStepIndex={1} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument()
      })
    })
  })

  describe('missing target handling', () => {
    it('calls onNext when target is not found (non-last step)', async () => {
      // Don't create target element - it will be missing
      const onNext = vi.fn()
      
      render(<TourRunner {...defaultProps} onNext={onNext} />)

      // Wait for timeout (500ms max wait)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(onNext).toHaveBeenCalled()
    })

    it('calls onComplete when target is not found (last step)', async () => {
      // Don't create target element
      const onComplete = vi.fn()
      
      render(<TourRunner {...defaultProps} currentStepIndex={2} onComplete={onComplete} />)

      // Wait for timeout
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(onComplete).toHaveBeenCalled()
    })

    it('logs warning when target is not found', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tour target not found'))
      consoleSpy.mockRestore()
    })
  })

  describe('button interactions', () => {
    it('calls onNext when Próximo is clicked', async () => {
      createTargetElement('[data-tour="step1"]')
      const onNext = vi.fn()
      
      render(<TourRunner {...defaultProps} onNext={onNext} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /próximo/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /próximo/i }))
      expect(onNext).toHaveBeenCalled()
    })

    it('calls onPrevious when Voltar is clicked', async () => {
      createTargetElement('[data-tour="step2"]')
      const onPrevious = vi.fn()
      
      render(<TourRunner {...defaultProps} currentStepIndex={1} onPrevious={onPrevious} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
      expect(onPrevious).toHaveBeenCalled()
    })

    it('calls onComplete when Concluir is clicked', async () => {
      createTargetElement('[data-tour="step3"]')
      const onComplete = vi.fn()
      
      render(<TourRunner {...defaultProps} currentStepIndex={2} onComplete={onComplete} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /concluir/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /concluir/i }))
      expect(onComplete).toHaveBeenCalled()
    })

    it('calls onDismiss when close button is clicked', async () => {
      createTargetElement('[data-tour="step1"]')
      const onDismiss = vi.fn()
      
      render(<TourRunner {...defaultProps} onDismiss={onDismiss} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fechar tour/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /fechar tour/i }))
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('keyboard navigation', () => {
    it('calls onNext on ArrowRight (non-last step)', async () => {
      createTargetElement('[data-tour="step1"]')
      const onNext = vi.fn()
      
      render(<TourRunner {...defaultProps} onNext={onNext} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(window, { key: 'ArrowRight' })
      expect(onNext).toHaveBeenCalled()
    })

    it('calls onComplete on ArrowRight (last step)', async () => {
      createTargetElement('[data-tour="step3"]')
      const onComplete = vi.fn()
      
      render(<TourRunner {...defaultProps} currentStepIndex={2} onComplete={onComplete} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(window, { key: 'ArrowRight' })
      expect(onComplete).toHaveBeenCalled()
    })

    it('calls onNext on Enter (non-last step)', async () => {
      createTargetElement('[data-tour="step1"]')
      const onNext = vi.fn()
      
      render(<TourRunner {...defaultProps} onNext={onNext} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(window, { key: 'Enter' })
      expect(onNext).toHaveBeenCalled()
    })

    it('calls onPrevious on ArrowLeft (non-first step)', async () => {
      createTargetElement('[data-tour="step2"]')
      const onPrevious = vi.fn()
      
      render(<TourRunner {...defaultProps} currentStepIndex={1} onPrevious={onPrevious} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      expect(onPrevious).toHaveBeenCalled()
    })

    it('does not call onPrevious on ArrowLeft (first step)', async () => {
      createTargetElement('[data-tour="step1"]')
      const onPrevious = vi.fn()
      
      render(<TourRunner {...defaultProps} onPrevious={onPrevious} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      expect(onPrevious).not.toHaveBeenCalled()
    })

    it('calls onDismiss on Escape', async () => {
      createTargetElement('[data-tour="step1"]')
      const onDismiss = vi.fn()
      
      render(<TourRunner {...defaultProps} onDismiss={onDismiss} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('backdrop interaction', () => {
    it('calls onDismiss when backdrop is clicked', async () => {
      createTargetElement('[data-tour="step1"]')
      const onDismiss = vi.fn()
      
      render(<TourRunner {...defaultProps} onDismiss={onDismiss} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Click on the SVG backdrop
      const svg = document.querySelector('svg')
      if (svg) {
        fireEvent.click(svg)
        expect(onDismiss).toHaveBeenCalled()
      }
    })
  })

  describe('accessibility', () => {
    it('has role="dialog"', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('has aria-modal="true"', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
      })
    })

    it('has aria-labelledby pointing to title', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'tour-title')
      })
    })

    it('has aria-describedby pointing to content', async () => {
      createTargetElement('[data-tour="step1"]')
      
      render(<TourRunner {...defaultProps} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'tour-content')
      })
    })
  })
})

