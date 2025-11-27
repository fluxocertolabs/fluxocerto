import { Card } from '@/components/ui/card'
import { getMissingEnvVars } from '@/lib/supabase'

export function SetupRequired() {
  const missingVars = getMissingEnvVars()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Setup Required</h1>
          <p className="text-muted-foreground">
            Family Finance needs to be connected to a Supabase database to work.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Missing Environment Variables
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
              How to Set Up
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Create a free account at{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  supabase.com
                </a>
              </li>
              <li>Create a new project in your Supabase dashboard</li>
              <li>
                Go to <strong>Settings → API</strong> to find your credentials
              </li>
              <li>
                Copy <code className="bg-muted px-1 py-0.5 rounded">Project URL</code> →{' '}
                <code className="bg-muted px-1 py-0.5 rounded">VITE_SUPABASE_URL</code>
              </li>
              <li>
                Copy <code className="bg-muted px-1 py-0.5 rounded">anon public</code> key →{' '}
                <code className="bg-muted px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>
              </li>
              <li>
                Create a <code className="bg-muted px-1 py-0.5 rounded">.env</code> file in the
                project root with these values
              </li>
              <li>
                Run the database migration from{' '}
                <code className="bg-muted px-1 py-0.5 rounded">
                  supabase/migrations/001_initial_schema.sql
                </code>
              </li>
              <li>
                Enable <strong>Anonymous Sign-Ins</strong> in Authentication → Providers
              </li>
              <li>Restart the development server</li>
            </ol>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              See{' '}
              <code className="bg-muted px-1 py-0.5 rounded">
                specs/008-supabase-migration/quickstart.md
              </code>{' '}
              for detailed instructions.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

