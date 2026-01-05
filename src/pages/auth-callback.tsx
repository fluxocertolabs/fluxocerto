import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured, ensureCurrentUserGroup, signOut } from '@/lib/supabase'
import { getAuthErrorMessage, isExpiredLinkError } from '@/lib/auth-errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type CallbackState = 
  | { type: 'loading' }
  | { type: 'provisioning' }
  | { type: 'auth_error'; message: string; isExpired: boolean }
  | { type: 'provisioning_error'; message: string; diagnosticPayload: string }

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<CallbackState>({ type: 'loading' })
  const [isRetrying, setIsRetrying] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleProvisioningRetry = useCallback(async () => {
    setIsRetrying(true)
    setState({ type: 'provisioning' })
    
    const result = await ensureCurrentUserGroup()
    
    if (result.success) {
      navigate('/', { replace: true })
    } else {
      const diagnosticPayload = JSON.stringify({
        error: result.error,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }, null, 2)
      
      setState({
        type: 'provisioning_error',
        message: result.error ?? 'Erro ao configurar sua conta',
        diagnosticPayload,
      })
    }
    setIsRetrying(false)
  }, [navigate])

  const handleSignOut = useCallback(async () => {
    await signOut()
    navigate('/login', { replace: true })
  }, [navigate])

  const handleCopyDiagnostics = useCallback((payload: string) => {
    navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  useEffect(() => {
    const handleCallback = async () => {
      // Guard against unconfigured Supabase
      if (!isSupabaseConfigured()) {
        setState({
          type: 'auth_error',
          message: 'Aplicação não está configurada corretamente. Entre em contato com o suporte.',
          isExpired: false,
        })
        return
      }

      const client = getSupabase()
      
      // Check for error in URL params (from Supabase redirect)
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (errorParam) {
        const errorObj = new Error(errorDescription || errorParam)
        setState({
          type: 'auth_error',
          message: getAuthErrorMessage(errorObj),
          isExpired: isExpiredLinkError(errorObj),
        })
        return
      }

      // Try to get the session (Supabase client handles token extraction)
      const { data: { session }, error: sessionError } = await client.auth.getSession()

      if (sessionError) {
        setState({
          type: 'auth_error',
          message: getAuthErrorMessage(sessionError),
          isExpired: isExpiredLinkError(sessionError),
        })
        return
      }

      if (!session) {
        // No session and no error - might be a stale callback
        setState({
          type: 'auth_error',
          message: 'Não foi possível completar o login. Por favor, solicite um novo link de acesso.',
          isExpired: true,
        })
        return
      }

      // Successfully authenticated - now ensure user has group/profile
      setState({ type: 'provisioning' })
      
      const result = await ensureCurrentUserGroup()
      
      if (result.success) {
        // Provisioning successful, redirect to dashboard
        navigate('/', { replace: true })
      } else {
        // Provisioning failed - show recoverable error
        const diagnosticPayload = JSON.stringify({
          error: result.error,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }, null, 2)
        
        setState({
          type: 'provisioning_error',
          message: result.error ?? 'Erro ao configurar sua conta',
          diagnosticPayload,
        })
      }
    }

    handleCallback()
  }, [navigate, searchParams])

  // Auth error state (expired/invalid link)
  if (state.type === 'auth_error') {
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
              {state.isExpired ? 'Link Inválido ou Expirado' : 'Erro ao Entrar'}
            </CardTitle>
            <CardDescription className="text-destructive">
              {state.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => navigate('/login', { replace: true })}>
              Solicitar Novo Link
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Provisioning error state (recoverable)
  if (state.type === 'provisioning_error') {
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
            <CardTitle>Erro ao Configurar Conta</CardTitle>
            <CardDescription className="text-destructive">
              {state.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={handleProvisioningRetry} disabled={isRetrying}>
              {isRetrying ? 'Tentando...' : 'Tentar Novamente'}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sair
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  Ajuda
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Precisa de Ajuda?</DialogTitle>
                  <DialogDescription className="space-y-4">
                    <p>
                      Ocorreu um erro ao configurar sua conta. Tente as seguintes soluções:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Verifique sua conexão com a internet</li>
                      <li>Clique em "Tentar Novamente"</li>
                      <li>Se o problema persistir, saia e solicite um novo link de acesso</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Se precisar de suporte, copie os detalhes abaixo e entre em contato conosco.
                    </p>
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCopyDiagnostics(state.diagnosticPayload)}
                  >
                    {copied ? 'Copiado!' : 'Copiar Detalhes'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading/provisioning state
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
          <CardTitle>
            {state.type === 'provisioning' ? 'Configurando sua conta...' : 'Completando login...'}
          </CardTitle>
          <CardDescription>
            {state.type === 'provisioning'
              ? 'Estamos preparando tudo para você.'
              : 'Por favor, aguarde enquanto verificamos seu link de acesso.'}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
