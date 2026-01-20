import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { LottieIllustration } from '@/components/illustrations/lottie-illustration'

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
})

