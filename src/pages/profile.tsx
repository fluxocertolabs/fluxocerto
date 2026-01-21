/**
 * Profile settings page.
 * 
 * Allows users to:
 * - Update their display name
 * - View their email (read-only)
 * - Toggle email notifications preference
 */

import { Settings, RefreshCw } from 'lucide-react'
import { useProfile } from '@/hooks/use-profile'
import { ProfileSettingsForm } from '@/components/profile'
import { Button } from '@/components/ui/button'

function LoadingState() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border bg-card p-6"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-9 h-9 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <Settings className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        Erro ao carregar perfil
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {error}
      </p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  )
}

export function ProfilePage() {
  const {
    profile,
    isLoading,
    error,
    updateName,
    updateEmailNotifications,
    updateAnalytics,
    updateSessionRecordings,
    refetch,
  } = useProfile()

  return (
    <main className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-full bg-primary/10 p-2">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Perfil
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas configurações pessoais
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading && !profile ? (
        <LoadingState />
      ) : error && !profile ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : profile ? (
        <ProfileSettingsForm
          profile={profile}
          onUpdateName={updateName}
          onUpdateEmailNotifications={updateEmailNotifications}
          onUpdateAnalytics={updateAnalytics}
          onUpdateSessionRecordings={updateSessionRecordings}
        />
      ) : null}
    </main>
  )
}

