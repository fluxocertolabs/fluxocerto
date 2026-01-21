import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { cn } from '@/lib/utils'
import { motionTransitions } from '@/lib/motion'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useMonthProgression } from '@/hooks/use-month-progression'
import { Header } from '@/components/layout/header'
import { FloatingHelpButton } from '@/components/help'
import { BrandSymbol } from '@/components/brand'
import { SetupRequired } from '@/components/setup-required'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { PosthogPageviews } from '@/components/analytics/posthog-pageviews'
import { Dashboard } from '@/pages/dashboard'
import { ManagePage } from '@/pages/manage'
import { HistoryPage } from '@/pages/history'
import { SnapshotDetailPage } from '@/pages/snapshot-detail'
import { NotificationsPage } from '@/pages/notifications'
import { ProfilePage } from '@/pages/profile'
import { LoginPage } from '@/pages/login'
import { AuthCallbackPage } from '@/pages/auth-callback'
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent'
import { usePosthogGroup } from '@/hooks/use-posthog-group'

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <BrandSymbol
          className="h-10 w-10 text-foreground mx-auto mb-4"
          animation="spin"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  )
}

function AuthenticatedLayout() {
  return (
    <div className={cn('min-h-screen bg-background text-foreground')}>
      <Header />
      <Outlet />
      {/* Onboarding wizard - renders as dialog overlay when active */}
      <OnboardingWizard />
      {/* Floating help button - bottom right corner (desktop/tablet only) */}
      <FloatingHelpButton className="hidden md:block" />
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()
  
  // Run month progression check at app launch (for authenticated users)
  // This promotes future statements to current balance when month changes
  useMonthProgression()

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
        element={
          isAuthenticated ? <AuthenticatedLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="manage" element={<ManagePage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:snapshotId" element={<SnapshotDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AnalyticsBridge() {
  useAnalyticsConsent()
  usePosthogGroup()
  return <PosthogPageviews />
}

function App() {
  // Show setup screen if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return (
      <MotionConfig reducedMotion="user" transition={motionTransitions.ui}>
        <SetupRequired />
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user" transition={motionTransitions.ui}>
      <BrowserRouter>
        <AnalyticsBridge />
        <AppRoutes />
      </BrowserRouter>
    </MotionConfig>
  )
}

export default App
