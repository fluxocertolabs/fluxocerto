import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import { Dashboard } from '@/pages/dashboard'
import { ManagePage } from '@/pages/manage'

function App() {
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
