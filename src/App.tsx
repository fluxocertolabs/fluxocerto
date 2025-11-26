import { cn } from '@/lib/utils'
import { Dashboard } from '@/pages/dashboard'

function App() {
  return (
    <div className={cn('min-h-screen bg-background text-foreground')}>
      <Dashboard />
    </div>
  )
}

export default App
