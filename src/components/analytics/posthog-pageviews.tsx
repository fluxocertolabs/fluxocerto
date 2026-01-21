import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { captureEvent } from '@/lib/analytics/posthog'

export function PosthogPageviews() {
  const location = useLocation()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`
    if (lastPathRef.current === path) return
    lastPathRef.current = path
    captureEvent('$pageview', {
      $current_url: window.location.href,
      path: location.pathname,
    })
  }, [location.pathname, location.search, location.hash])

  return null
}

