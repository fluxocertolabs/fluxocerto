import type { ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

import logoLight from '@/assets/brand/logo-light.svg'
import logoDark from '@/assets/brand/logo-dark.svg'

interface BrandLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  alt?: string
}

/**
 * Renders the full "Fluxo Certo" wordmark.
 * Uses the `.dark` class to swap between light/dark SVGs with zero JS.
 */
export function BrandLogo({
  className,
  alt = 'Fluxo Certo',
  ...props
}: BrandLogoProps) {
  return (
    <>
      <img
        src={logoLight}
        alt={alt}
        className={cn('block dark:hidden', className)}
        {...props}
      />
      <img
        src={logoDark}
        alt={alt}
        className={cn('hidden dark:block', className)}
        {...props}
      />
    </>
  )
}


