import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { SetupRequired } from '@/components/setup-required'
import { Dashboard } from '@/pages/dashboard'
import { ManagePage } from '@/pages/manage'

function App() {
  // Show setup screen if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return <SetupRequired />
  }

  return (
    <BrowserRouter>
      <div className={cn('min-h-screen bg-background text-foreground')}>
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/manage" element={<ManagePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
