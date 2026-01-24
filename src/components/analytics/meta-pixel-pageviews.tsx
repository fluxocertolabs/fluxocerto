import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { metaTrack } from '@/lib/analytics/meta-pixel'

/**
 * SPA route tracking for Meta Pixel.
 * Fires a PageView on React Router navigation changes.
 */
export function MetaPixelPageviews() {
  const location = useLocation()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`
    if (lastPathRef.current === path) return
    lastPathRef.current = path
    metaTrack('PageView')
  }, [location.pathname, location.search, location.hash])

  return null
}

