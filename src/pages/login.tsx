import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'
import { BrandLogo } from '@/components/brand'

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <BrandLogo className="h-10 w-auto" />
          <p className="text-muted-foreground mt-2">
            Gerencie as finanças da sua família juntos
          </p>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              Digite seu e-mail para receber um link de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Apenas membros da família pré-aprovados podem acessar este app.
        </p>
      </div>
    </div>
  )
}

