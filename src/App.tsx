import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Header } from '@/components/layout/header'
import { SetupRequired } from '@/components/setup-required'
import { Dashboard } from '@/pages/dashboard'
import { ManagePage } from '@/pages/manage'
import { LoginPage } from '@/pages/login'
import { AuthCallbackPage } from '@/pages/auth-callback'

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <svg
          className="animate-spin h-8 w-8 text-primary mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/auth/confirm" element={<AuthCallbackPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <div className={cn('min-h-screen bg-background text-foreground')}>
              <Header />
              <Dashboard />
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/manage"
        element={
          isAuthenticated ? (
            <div className={cn('min-h-screen bg-background text-foreground')}>
              <Header />
              <ManagePage />
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  // Show setup screen if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return <SetupRequired />
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
