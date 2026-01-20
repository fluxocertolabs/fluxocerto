import type { CSSProperties, SVGProps } from 'react'
import { cn } from '@/lib/utils'

type BrandSymbolAnimation = 'none' | 'once' | 'spin'

interface BrandSymbolProps extends SVGProps<SVGSVGElement> {
  /** Controls the intro / orbit animation */
  animation?: BrandSymbolAnimation
}

/**
 * The Fluxo Certo "C" symbol.
 *
 * Animation notes:
 * - `once`: clock-like rotation (whole symbol ticks around once, then settles).
 * - `spin`: continuous orbit (used as a loading spinner).
 * Uses `currentColor` so it adapts automatically to light/dark theme.
 */
export function BrandSymbol({
  animation = 'none',
  className,
  ...props
}: BrandSymbolProps) {
  const cssVars = {
    // Keep these as CSS variables so we can safely freeze animations in tests
    // (`toHaveScreenshot({ animations: 'disabled' })`) while preserving a stable
    // static final state.
    '--fc-symbol-duration': animation === 'spin' ? '1400ms' : '650ms',
    '--fc-spin-sway-duration': '1800ms',
  } as CSSProperties

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      className={cn('shrink-0', className)}
      data-fc-brand-symbol="true"
      data-fc-anim={animation}
      style={cssVars}
      focusable="false"
      {...props}
    >
      <style>{`
        svg[data-fc-brand-symbol="true"] .fc-center {
          transform-box: view-box;
          transform-origin: center;
        }

        svg[data-fc-brand-symbol="true"] .fc-self {
          transform-box: fill-box;
          transform-origin: center;
        }

        /* Accent color (uses the app theme token) */
        svg[data-fc-brand-symbol="true"] .fc-accent {
          color: var(--color-primary);
        }

        /* Final/static state (important for visual tests that disable animations) */
        svg[data-fc-brand-symbol="true"] .fc-trace {
          fill: none;
          stroke: currentColor;
          stroke-width: 10;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          filter: drop-shadow(0 0 6px currentColor);
        }

        svg[data-fc-brand-symbol="true"] .fc-dotGlow {
          transform-box: fill-box;
          transform-origin: center;
          opacity: 0;
          filter: drop-shadow(0 0 8px currentColor);
        }

        svg[data-fc-brand-symbol="true"] .fc-ghost {
          opacity: 0;
          filter: drop-shadow(0 0 6px currentColor);
        }

        /* Intro: clock-like rotation (whole symbol ticks around once) */
        svg[data-fc-brand-symbol="true"][data-fc-anim="once"] .fc-rotate {
          animation: fcClockRotateOnce var(--fc-symbol-duration) steps(60, end) 1;
        }

        /* Spin: continuous orbit (loading) */
        svg[data-fc-brand-symbol="true"][data-fc-anim="spin"] .fc-rotate {
          animation: fcSymbolRotateSpin var(--fc-spin-sway-duration) ease-in-out infinite;
        }

        svg[data-fc-brand-symbol="true"][data-fc-anim="spin"] .fc-float {
          animation: fcSymbolFloatSpin var(--fc-spin-sway-duration) ease-in-out infinite;
        }

        svg[data-fc-brand-symbol="true"][data-fc-anim="spin"] .fc-orbit {
          animation: fcDotOrbitSpin var(--fc-symbol-duration) linear infinite;
        }

        @keyframes fcClockRotateOnce {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fcSymbolRotateSpin {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(-8deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes fcSymbolFloatSpin {
          0% { transform: translate(0px, 0px); }
          50% { transform: translate(1px, -2px); }
          100% { transform: translate(0px, 0px); }
        }

        @keyframes fcDotOrbitSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <g className="fc-center fc-rotate">
        <g className="fc-center fc-float">
          <path
            fill="currentColor"
            d="M82.52,127.88c-27.58,0-45.76-19.09-45.76-47.88s18.18-47.88,45.76-47.88c18.4,0,33.68,9.12,40.96,23.59h36.14C150.04,22.02,120.31,0,82.52,0,33.12,0,.39,32.12.39,80s32.73,80,82.13,80c37.59,0,67.29-21.97,77.06-55.71h-36.3c-7.4,14.49-22.58,23.59-40.77,23.59Z"
          />

          {/* Outline "trace" (intro only) */}
          <path
            className="fc-trace fc-accent"
            pathLength={1}
            d="M82.52,127.88c-27.58,0-45.76-19.09-45.76-47.88s18.18-47.88,45.76-47.88c18.4,0,33.68,9.12,40.96,23.59h36.14C150.04,22.02,120.31,0,82.52,0,33.12,0,.39,32.12.39,80s32.73,80,82.13,80c37.59,0,67.29-21.97,77.06-55.71h-36.3c-7.4,14.49-22.58,23.59-40.77,23.59Z"
          />

          {/* Dot orbit */}
          <g className="fc-center fc-orbit">
            <g className="fc-self fc-dotPop">
              {/* Trailing "ghosts" (intro only) */}
              <g className="fc-accent fc-ghost fc-ghost2" transform="rotate(-36 80 80)">
                <circle fill="currentColor" cx="142.57" cy="80" r="6.6" />
              </g>
              <g className="fc-accent fc-ghost fc-ghost1" transform="rotate(-18 80 80)">
                <circle fill="currentColor" cx="142.57" cy="80" r="8.4" />
              </g>

              <circle fill="currentColor" cx="142.57" cy="80" r="12.43" />
              {/* soft afterglow (intro only) */}
              <circle className="fc-dotGlow fc-accent" fill="currentColor" cx="142.57" cy="80" r="12.43" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}
