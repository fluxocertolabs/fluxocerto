import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInWithMagicLink } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { captureEvent } from '@/lib/analytics/posthog'

interface LoginFormProps {
  onSuccess?: () => void
  emailPlaceholder?: string
  submitLabel?: string
}

export function LoginForm({
  onSuccess,
  emailPlaceholder = 'seu@email.com',
  submitLabel = 'Enviar link de acesso',
}: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error: signInError } = await signInWithMagicLink(email)

    setIsLoading(false)

    if (signInError) {
      captureEvent('login_magic_link_request_failed')
      // Map error to user-friendly message
      const errorMessage = getAuthErrorMessage(signInError)
      setError(errorMessage)
      return
    }

    captureEvent('login_magic_link_requested')
    // Always show success message to prevent email enumeration
    setIsSubmitted(true)
    onSuccess?.()
  }

  if (isSubmitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Verifique seu e-mail</h3>
        <p className="text-muted-foreground text-sm">
          Enviamos um link de acesso para <span className="font-medium text-foreground">{email}</span>
        </p>
        <p className="text-muted-foreground text-xs">
          Clique no link do e-mail para entrar. O link expira em 1 hora.
        </p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => {
            setIsSubmitted(false)
            setEmail('')
          }}
        >
          Usar outro e-mail
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Endereço de e-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder={emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={isLoading}
          aria-describedby={error ? 'email-error' : undefined}
        />
        {error && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || !email}>
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
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
            Enviando...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}

