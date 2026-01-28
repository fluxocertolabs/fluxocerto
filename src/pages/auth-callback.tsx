import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured, ensureCurrentUserGroup, signOut } from '@/lib/supabase'
import { getAuthErrorMessage, isExpiredLinkError } from '@/lib/auth-errors'
import { captureEvent } from '@/lib/analytics/posthog'
import { addSentryBreadcrumb } from '@/lib/observability/sentry'
import { Button } from '@/components/ui/button'
import { StatusScreen } from '@/components/status/status-screen'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AlertTriangle, Copy, Loader2 } from 'lucide-react'

const snapshotAnimation = () => import('@/assets/lottie/snapshot-empty.json')
const cashflowAnimation = () => import('@/assets/lottie/cashflow-empty.json')

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
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy diagnostics:', err)
      })
  }, [])

  useEffect(() => {
    const handleCallback = async () => {
      addSentryBreadcrumb({
        category: 'debug.auth',
        message: 'auth_callback_enter',
        level: 'info',
        data: {
          has_error_param: searchParams.has('error'),
          has_token_hash_param: searchParams.has('token_hash'),
          has_type_param: searchParams.has('type'),
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        },
      })
      // Guard against unconfigured Supabase
      if (!isSupabaseConfigured()) {
        captureEvent('magic_link_callback_error', {
          reason: 'supabase_not_configured',
        })
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
      const tokenHash = searchParams.get('token_hash')
      const otpType = searchParams.get('type')

      // Track that the user reached the callback page (i.e. clicked the link / attempted auth).
      // IMPORTANT: never send raw URL/tokens; only boolean flags.
      captureEvent('magic_link_callback_opened', {
        has_error_param: Boolean(errorParam),
        has_error_description: Boolean(errorDescription),
        has_code_param: searchParams.has('code'),
        has_token_param: searchParams.has('token'),
        has_type_param: searchParams.has('type'),
        has_token_hash_param: searchParams.has('token_hash'),
      })
      
      if (errorParam) {
        const errorObj = new Error(errorDescription || errorParam)
        captureEvent('magic_link_callback_error', {
          reason: 'redirect_error_param',
          error: errorParam,
          is_expired: isExpiredLinkError(errorObj),
        })
        setState({
          type: 'auth_error',
          message: getAuthErrorMessage(errorObj),
          isExpired: isExpiredLinkError(errorObj),
        })
        return
      }

      // If the email template links directly to our app (token_hash flow),
      // we must exchange the hash for a session before reading session state.
      if (tokenHash && otpType) {
        const __verifyStart = Date.now()
        let __verifyOk = false
        let __verifyErrorName: string | undefined = undefined
        let __verifyHasData = false
        let verifyData: unknown = null
        let verifyError: Error | null = null
        try {
          captureEvent('magic_link_verifyotp_attempted')
          const res = await client.auth.verifyOtp({
            // Supabase expects a token_hash from the email template.
            token_hash: tokenHash,
            // Type varies by template: e.g. "magiclink", "signup", "recovery", etc.
            // We keep this flexible to support multiple Supabase email flows.
            type: otpType as never,
          })
          verifyData = res.data
          verifyError = res.error
          __verifyOk = !verifyError
          __verifyErrorName = verifyError?.name
          __verifyHasData = Boolean(verifyData)
        } finally {
          addSentryBreadcrumb({
            category: 'debug.auth',
            message: 'verify_otp_result',
            level: __verifyOk ? 'info' : 'error',
            data: {
              durationMs: Date.now() - __verifyStart,
              ok: __verifyOk,
              hasVerifyData: __verifyHasData,
              errorName: __verifyErrorName,
            },
          })
        }

        if (verifyError) {
          captureEvent('magic_link_callback_error', {
            reason: 'verify_otp_failed',
            error: verifyError.name,
            is_expired: isExpiredLinkError(verifyError),
          })
          setState({
            type: 'auth_error',
            message: getAuthErrorMessage(verifyError),
            isExpired: isExpiredLinkError(verifyError),
          })
          return
        }

        // Defensive: in some environments, verifyOtp can succeed but the session may not be
        // immediately readable via getSession() yet. If Supabase returns a session payload,
        // explicitly persist it.
        const sessionFromVerify = verifyData && typeof verifyData === 'object' && 'session' in verifyData
          ? (verifyData as { session?: { access_token?: string; refresh_token?: string } | null }).session
          : null
        const access = sessionFromVerify?.access_token ?? null
        const refresh = sessionFromVerify?.refresh_token ?? null
        if (access && refresh) {
          await client.auth.setSession({ access_token: access, refresh_token: refresh })
        }
      }

      // Try to get the session (Supabase client handles token extraction)
      const __getSessionStart = Date.now()
      const { data: { session }, error: sessionError } = await client.auth.getSession()
      addSentryBreadcrumb({
        category: 'debug.auth',
        message: 'get_session_result',
        level: sessionError ? 'error' : 'info',
        data: {
          durationMs: Date.now() - __getSessionStart,
          ok: !sessionError,
          hasSession: Boolean(session),
          errorName: sessionError?.name,
          hasUserId: Boolean(session?.user?.id),
        },
      })

      if (sessionError) {
        captureEvent('magic_link_callback_error', {
          reason: 'get_session_failed',
          error: sessionError.name,
          is_expired: isExpiredLinkError(sessionError),
        })
        setState({
          type: 'auth_error',
          message: getAuthErrorMessage(sessionError),
          isExpired: isExpiredLinkError(sessionError),
        })
        return
      }

      if (!session) {
        captureEvent('magic_link_callback_error', {
          reason: 'no_session',
          is_expired: true,
        })
        // No session and no error - might be a stale callback
        setState({
          type: 'auth_error',
          message: 'Não foi possível completar o login. Por favor, solicite um novo link de acesso.',
          isExpired: true,
        })
        return
      }

      captureEvent('magic_link_session_established')

      // Successfully authenticated - now ensure user has group/profile
      setState({ type: 'provisioning' })
      
      const result = await ensureCurrentUserGroup()
      
      if (result.success) {
        captureEvent('magic_link_provisioning_succeeded')
        // Provisioning successful, redirect to dashboard
        navigate('/', { replace: true })
      } else {
        captureEvent('magic_link_provisioning_failed')
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
      <StatusScreen
        tone="error"
        title={state.isExpired ? 'Link inválido ou expirado' : 'Erro ao entrar'}
        description={<span className="text-destructive">{state.message}</span>}
        illustration={{
          animationLoader: snapshotAnimation,
          ariaLabel: 'Ilustração de erro de autenticação',
          staticFallback: <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />,
        }}
        primaryAction={
          <Button onClick={() => navigate('/login', { replace: true })}>
            Solicitar novo link
          </Button>
        }
        footer="Se você acabou de solicitar o link, verifique também a caixa de spam."
      />
    )
  }

  // Provisioning error state (recoverable)
  if (state.type === 'provisioning_error') {
    return (
      <StatusScreen
        tone="error"
        title="Erro ao configurar conta"
        description={<span className="text-destructive">{state.message}</span>}
        illustration={{
          animationLoader: snapshotAnimation,
          ariaLabel: 'Ilustração de erro de provisionamento',
          staticFallback: <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />,
        }}
        primaryAction={
          <Button onClick={handleProvisioningRetry} disabled={isRetrying}>
            {isRetrying ? 'Tentando...' : 'Tentar novamente'}
          </Button>
        }
        secondaryAction={
          <Button variant="outline" onClick={handleSignOut} disabled={isRetrying}>
            Sair
          </Button>
        }
        footer="Se persistir, abra “Ajuda” e copie os detalhes para o suporte."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              Ajuda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Precisa de ajuda?</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>Ocorreu um erro ao configurar sua conta. Tente:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Verifique sua conexão com a internet</li>
                    <li>Clique em "Tentar Novamente"</li>
                    <li>Se o problema persistir, saia e solicite um novo link de acesso</li>
                  </ul>
                  <p>
                    Se precisar de suporte, copie os detalhes abaixo e envie para nós.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleCopyDiagnostics(state.diagnosticPayload)}
              >
                <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
                {copied ? 'Copiado!' : 'Copiar Detalhes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </StatusScreen>
    )
  }

  // Loading/provisioning state
  return (
    <StatusScreen
      tone="info"
      title={state.type === 'provisioning' ? 'Configurando sua conta…' : 'Completando login…'}
      description={
        state.type === 'provisioning'
          ? 'Estamos preparando tudo para você.'
          : 'Por favor, aguarde enquanto verificamos seu link de acesso.'
      }
      illustration={{
        animationLoader: cashflowAnimation,
        ariaLabel: 'Ilustração de carregamento',
        staticFallback: <Loader2 className="h-10 w-10 text-primary animate-spin" aria-hidden="true" />,
      }}
      footer="Você será redirecionado automaticamente."
    >
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{state.type === 'provisioning' ? 'Provisionando…' : 'Validando sessão…'}</span>
      </div>
    </StatusScreen>
  )
}
