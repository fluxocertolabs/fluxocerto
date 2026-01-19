import type { TourKey } from '@/types'

/**
 * Get the tour key for the current route.
 */
export function getTourKeyForRoute(pathname: string): TourKey | null {
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

