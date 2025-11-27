import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initializeAuth, isSupabaseConfigured } from './lib/supabase'
import './index.css'

// Initialize app with auth
async function bootstrap() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error("Root element with id 'root' not found in index.html")
  }

  // Only initialize auth if Supabase is configured
  // If not configured, the app will show a setup screen
  if (isSupabaseConfigured()) {
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
