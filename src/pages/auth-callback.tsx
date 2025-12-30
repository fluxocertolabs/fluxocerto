import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { getAuthErrorMessage, isExpiredLinkError } from '@/lib/auth-errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const handleCallback = async () => {
      // Guard against unconfigured Supabase
      if (!isSupabaseConfigured()) {
        setError('Aplicação não está configurada corretamente. Entre em contato com o suporte.')
        return
      }

      // #region agent log
      fetch('http://localhost:7245/ingest/158be8d1-062b-42b2-98bb-ffafb90f1f2e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H3',
          location: 'src/pages/auth-callback.tsx:AuthCallbackPage:handleCallback:start',
          message: 'Auth callback handling started',
          data: {
            origin: window.location.origin,
            path: window.location.pathname,
            searchHasError: searchParams.has('error'),
            searchKeys: Array.from(searchParams.keys()),
            hashHasAccessToken: window.location.hash.includes('access_token='),
            hashHasRefreshToken: window.location.hash.includes('refresh_token='),
            hashHasError: window.location.hash.includes('error='),
            hashHasErrorCode: window.location.hash.includes('error_code='),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion agent log

      const client = getSupabase()
      
      // Check for error in URL params (from Supabase redirect)
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (errorParam) {
        const errorObj = new Error(errorDescription || errorParam)
        setError(getAuthErrorMessage(errorObj))
        setIsExpired(isExpiredLinkError(errorObj))

        // #region agent log
        fetch('http://localhost:7245/ingest/158be8d1-062b-42b2-98bb-ffafb90f1f2e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H3',
            location: 'src/pages/auth-callback.tsx:AuthCallbackPage:handleCallback:errorParam',
            message: 'Auth callback has explicit error params',
            data: {
              error: errorParam,
              hasErrorDescription: Boolean(errorDescription),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion agent log

        return
      }

      // Try to get the session (Supabase client handles token extraction)
      const { data: { session }, error: sessionError } = await client.auth.getSession()

      if (sessionError) {
        setError(getAuthErrorMessage(sessionError))
        setIsExpired(isExpiredLinkError(sessionError))

        // #region agent log
        fetch('http://localhost:7245/ingest/158be8d1-062b-42b2-98bb-ffafb90f1f2e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H3',
            location: 'src/pages/auth-callback.tsx:AuthCallbackPage:handleCallback:getSessionError',
            message: 'client.auth.getSession returned error',
            data: {
              errorMessage: sessionError.message,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion agent log

        return
      }

      if (session) {
        // Successfully authenticated, redirect to dashboard
        navigate('/', { replace: true })
      } else {
        // No session and no error - might be a stale callback
        setError('Não foi possível completar o login. Por favor, solicite um novo link de acesso.')

        // #region agent log
        fetch('http://localhost:7245/ingest/158be8d1-062b-42b2-98bb-ffafb90f1f2e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H3',
            location: 'src/pages/auth-callback.tsx:AuthCallbackPage:handleCallback:noSessionNoError',
            message: 'No session and no error after callback',
            data: {
              hashPresent: window.location.hash.length > 1,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion agent log

      }
    }

    handleCallback()
  }, [navigate, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="rounded-full bg-destructive/10 w-16 h-16 mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <CardTitle>
              {isExpired ? 'Link Expirado' : 'Erro ao Entrar'}
            </CardTitle>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => navigate('/login', { replace: true })}>
              {isExpired ? 'Solicitar Novo Link' : 'Voltar para Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state while processing callback
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center mb-4">
            <svg
              className="animate-spin w-8 h-8 text-primary"
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
          </div>
          <CardTitle>Completando login...</CardTitle>
          <CardDescription>
            Por favor, aguarde enquanto verificamos seu link de acesso.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

