import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { LottieIllustration } from '@/components/illustrations/lottie-illustration'

const useReducedMotionMock = vi.fn<[], boolean>()

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<object>('motion/react')
  return {
    ...actual,
    useReducedMotion: () => useReducedMotionMock(),
  }
})

vi.mock('lottie-react', () => ({
  default: () => <div data-testid="lottie" />,
}))

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('LottieIllustration', () => {
  it('renders the static fallback when reduced motion is preferred', () => {
    mockMatchMedia(true)
    useReducedMotionMock.mockReturnValue(true)
    const animationLoader = vi.fn().mockResolvedValue({ default: {} })

    render(
      <LottieIllustration
        animationLoader={animationLoader}
        staticFallback={<div data-testid="fallback" />}
      />
    )

    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    expect(animationLoader).not.toHaveBeenCalled()
  })

  it('renders the Lottie component when motion is allowed', async () => {
    mockMatchMedia(false)
    useReducedMotionMock.mockReturnValue(false)
    const animationLoader = vi.fn().mockResolvedValue({ default: {} })

    render(
      <LottieIllustration
        animationLoader={animationLoader}
        staticFallback={<div data-testid="fallback" />}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('lottie')).toBeInTheDocument()
    })
  })

  it('falls back when the animation loader fails', async () => {
    mockMatchMedia(false)
    useReducedMotionMock.mockReturnValue(false)
    const animationLoader = vi.fn().mockRejectedValue(new Error('boom'))

    render(
      <LottieIllustration
        animationLoader={animationLoader}
        staticFallback={<div data-testid="fallback" />}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('fallback')).toBeInTheDocument()
    })
  })
})

