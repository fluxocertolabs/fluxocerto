import { Card } from '@/components/ui/card'
import { getMissingEnvVars } from '@/lib/supabase'

export function SetupRequired() {
  const missingVars = getMissingEnvVars()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Configuração Necessária</h1>
          <p className="text-muted-foreground">
            Finanças da Família precisa estar conectado a um banco de dados Supabase para funcionar.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Variáveis de Ambiente Faltando
            </h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {missingVars.map((varName) => (
                <li key={varName}>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                    {varName}
                  </code>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Como Configurar
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Crie uma conta gratuita em{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  supabase.com
                </a>
              </li>
              <li>Crie um novo projeto no painel do Supabase</li>
              <li>
                Vá em <strong>Settings → API</strong> para encontrar suas credenciais
              </li>
              <li>
                Copie <code className="bg-muted px-1 py-0.5 rounded">Project URL</code> →{' '}
                <code className="bg-muted px-1 py-0.5 rounded">VITE_SUPABASE_URL</code>
              </li>
              <li>
                Copie a chave <code className="bg-muted px-1 py-0.5 rounded">anon public</code> →{' '}
                <code className="bg-muted px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>
              </li>
              <li>
                Crie um arquivo <code className="bg-muted px-1 py-0.5 rounded">.env</code> na raiz
                do projeto com esses valores
              </li>
              <li>
                Execute a migração do banco de dados de{' '}
                <code className="bg-muted px-1 py-0.5 rounded">
                  supabase/migrations/001_initial_schema.sql
                </code>
              </li>
              <li>
                Habilite <strong>Anonymous Sign-Ins</strong> em Authentication → Providers
              </li>
              <li>Reinicie o servidor de desenvolvimento</li>
            </ol>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Veja{' '}
              <code className="bg-muted px-1 py-0.5 rounded">
                specs/008-supabase-migration/quickstart.md
              </code>{' '}
              para instruções detalhadas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

