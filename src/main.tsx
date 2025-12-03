import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initializeAuth, isSupabaseConfigured, hasDevTokens, injectDevSession } from './lib/supabase'
import './index.css'

/**
 * Display a dev auth bypass error toast.
 * Creates a temporary DOM element to show the error since React hasn't mounted yet.
 * Auto-dismisses after 5 seconds.
 * Uses DOM APIs instead of innerHTML to prevent XSS.
 */
function showDevAuthError(message: string): void {
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
  title.textContent = 'Dev Auth Bypass Failed'
  
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
 * are present in .env.local, the app will attempt to inject these tokens
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
 * 2. Generate tokens: pnpm run gen:token
 * 3. Copy tokens to .env.local
 * 4. Restart dev server: pnpm dev:app
 * 
 * @see src/lib/supabase.ts for injectDevSession() and hasDevTokens()
 * @see scripts/generate-dev-token.ts for token generation script
 */
async function bootstrap() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error("Root element with id 'root' not found in index.html")
  }

  // Only initialize auth if Supabase is configured
  // If not configured, the app will show a setup screen
  if (isSupabaseConfigured()) {
    // DEV MODE: Try to inject dev session tokens BEFORE normal auth init
    // This allows AI agents and developers to bypass login for local development
    if (import.meta.env.DEV && hasDevTokens()) {
      const result = await injectDevSession()
      if (!result.success) {
        console.error('Dev auth bypass failed:', result.error)
        showDevAuthError(result.error || 'Unknown error - check console')
        // Fall through to normal auth initialization
      } else {
        console.log('✓ Dev auth bypass: Session injected successfully')
      }
    }

    try {
      await initializeAuth()
    } catch (error) {
      // Log error but don't block app rendering
      // The app will handle auth errors gracefully
      console.error('Auth initialization failed:', error)
    }
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
