import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import {
  initializeAuth,
  isSupabaseConfigured,
  hasDevTokens,
  injectDevSession,
  isPreviewAuthBypassEnabled,
  injectPreviewSession,
} from './lib/supabase'
import { isTawkConfigured, preloadTawkStyles } from './lib/support-chat/tawk'
import { AppErrorBoundary } from '@/components/app-error-boundary'
import { withTimeout } from '@/lib/utils/promise'
import './index.css'

/**
 * Display an auth bypass error toast.
 * Creates a temporary DOM element to show the error since React hasn't mounted yet.
 * Auto-dismisses after 5 seconds.
 * Uses DOM APIs instead of innerHTML to prevent XSS.
 */
function showAuthBypassError(titleText: string, message: string): void {
  // Create style element for animation
  const style = document.createElement('style')
  style.textContent = '@keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }'
  
  // Create toast container
  const toast = document.createElement('div')
  toast.style.cssText = `
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 9999;
    padding: 12px 16px;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    max-width: 400px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    animation: slideIn 0.3s ease-out;
  `
  
  // Create title
  const title = document.createElement('strong')
  title.style.cssText = 'display: block; margin-bottom: 4px;'
  title.textContent = titleText
  
  // Create message span (using textContent to prevent XSS)
  const messageSpan = document.createElement('span')
  messageSpan.textContent = message
  
  // Create close button
  const closeButton = document.createElement('button')
  closeButton.style.cssText = 'position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; color: #dc2626; font-size: 16px;'
  closeButton.textContent = '×'
  closeButton.addEventListener('click', () => toast.remove())
  
  // Assemble toast
  toast.appendChild(style)
  toast.appendChild(title)
  toast.appendChild(messageSpan)
  toast.appendChild(closeButton)
  document.body.appendChild(toast)
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => toast.remove(), 5000)
}

/**
 * Initialize app with authentication.
 * 
 * DEV AUTH BYPASS FLOW:
 * In development mode, if VITE_DEV_ACCESS_TOKEN and VITE_DEV_REFRESH_TOKEN
 * are present (e.g., written to .env by the token generator), the app will attempt to inject these tokens
 * into the Supabase client BEFORE normal auth initialization. This allows
 * developers and AI agents to skip the login flow entirely.
 * 
 * Flow:
 * 1. Check if Supabase is configured
 * 2. If DEV mode + tokens present → inject dev session
 *    - Success: User is authenticated, dashboard loads immediately
 *    - Failure: Show error toast, fall through to normal auth
 * 3. Initialize normal auth (handles Magic Link callbacks, session refresh)
 * 4. Render React app
 * 
 * To set up dev auth bypass:
 * 1. Start Supabase: pnpm db:start
 * 2. Generate tokens: pnpm run gen:token (writes tokens to .env)
 * 3. Restart dev server: pnpm dev:app
 * 
 * @see src/lib/supabase.ts for injectDevSession() and hasDevTokens()
 * @see scripts/generate-dev-token.ts for token generation script
 */
async function bootstrap() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error("Root element with id 'root' not found in index.html")
  }

  // Hide Tawk surfaces as early as possible to prevent refresh flashes.
  if (isTawkConfigured()) {
    preloadTawkStyles()
  }

  // Only initialize auth if Supabase is configured
  // If not configured, the app will show a setup screen
  if (isSupabaseConfigured()) {
    // DEV MODE: Try to inject dev session tokens BEFORE normal auth init
    // This allows AI agents and developers to bypass login for local development
    if (import.meta.env.DEV && hasDevTokens()) {
      let result: Awaited<ReturnType<typeof injectDevSession>>
      try {
        // Guard against hanging network requests (misconfigured URL / Supabase down).
        result = await withTimeout(
          injectDevSession(),
          7000,
          'Dev auth bypass timed out (is Supabase running and reachable?)'
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error - check console'
        result = { success: false, error: message }
      }
      if (!result.success) {
        console.error('Dev auth bypass failed:', result.error)
        showAuthBypassError('Dev Auth Bypass Failed', result.error || 'Unknown error - check console')
        // Fall through to normal auth initialization
      } else {
        console.log('✓ Dev auth bypass: Session injected successfully')
      }
    }

    // PREVIEW MODE: Optional PR-preview auth bypass (disabled by default)
    // This is controlled by VITE_PREVIEW_AUTH_BYPASS at build time.
    if (!import.meta.env.DEV && isPreviewAuthBypassEnabled()) {
      let result: Awaited<ReturnType<typeof injectPreviewSession>>
      try {
        result = await withTimeout(
          injectPreviewSession(),
          7000,
          'Preview auth bypass timed out (is Supabase reachable and configured for this deployment?)'
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error - check console'
        result = { success: false, error: message }
      }

      if (!result.success) {
        console.error('Preview auth bypass failed:', result.error)
        showAuthBypassError('Preview Auth Bypass Failed', result.error || 'Unknown error - check console')
        // Fall through to normal auth initialization
      } else {
        console.log('✓ Preview auth bypass: Session injected successfully')
      }
    }

    // Never block initial render on network/auth initialization. If Supabase is down or
    // misconfigured, awaiting here can cause a “blank screen” until a request times out.
    void initializeAuth().catch((error) => {
      console.error('Auth initialization failed:', error)
    })
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  )
}

function showBootstrapError(error: unknown): void {
  const message =
    error instanceof Error ? error.message : 'Erro desconhecido ao inicializar a aplicação'

  const container = document.createElement('div')
  container.style.cssText = `
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    font-family: system-ui, sans-serif;
    background: #ffffff;
    color: #111827;
  `

  const card = document.createElement('div')
  card.style.cssText = `
    width: 100%;
    max-width: 640px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 20px;
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  `

  const title = document.createElement('h1')
  title.textContent = 'Falha ao carregar o app'
  title.style.cssText = 'font-size: 20px; font-weight: 700; margin: 0 0 8px;'

  const details = document.createElement('pre')
  details.textContent = message
  details.style.cssText = `
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 12px;
    border-radius: 8px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    font-size: 13px;
    line-height: 1.4;
  `

  card.appendChild(title)
  card.appendChild(details)
  container.appendChild(card)
  document.body.appendChild(container)
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error)
  showBootstrapError(error)
})
