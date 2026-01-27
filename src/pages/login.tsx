import { motion, useReducedMotion } from 'motion/react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'
import { BrandLogo } from '@/components/brand'

export function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const reduceMotion = useReducedMotion()
  const intent = searchParams.get('intent')
  const mode = intent === 'login' ? 'login' : 'signup'
  const isSignup = mode === 'signup'

  const title = isSignup ? 'Comece seu teste grátis de 14 dias' : 'Entrar na sua conta'
  const subtitle = isSignup
    ? 'Digite seu e-mail para receber um link de acesso. Sem senha, sem cartão.'
    : 'Digite seu e-mail para receber um link de acesso.'
  const submitLabel = isSignup ? 'Começar agora' : 'Enviar link de acesso'
  const toggleMode = isSignup ? 'login' : 'signup'

  const handleToggle = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('intent', toggleMode)
    setSearchParams(nextParams)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <BrandLogo className="h-10 w-auto" />
          <p className="text-muted-foreground mt-2">
            Preveja seu fluxo de caixa com clareza
          </p>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <motion.div
              key={mode}
              className="space-y-2"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reduceMotion ? undefined : { duration: 0.2, ease: 'easeOut' }}
            >
              <CardTitle>{title}</CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <LoginForm emailPlaceholder="seu@email.com" submitLabel={submitLabel} />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {isSignup ? (
                <>
                  Já tem conta?{' '}
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-4 hover:text-foreground/80"
                    onClick={handleToggle}
                  >
                    Clique aqui para entrar
                  </button>
                </>
              ) : (
                <>
                  Não tem conta?{' '}
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-4 hover:text-foreground/80"
                    onClick={handleToggle}
                  >
                    Comece grátis por 14 dias
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  )
}

