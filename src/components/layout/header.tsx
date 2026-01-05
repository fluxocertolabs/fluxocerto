import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Menu, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ThemeToggle } from '@/components/theme'
import { GroupBadge } from '@/components/group'
import { BrandSymbol } from '@/components/brand'
import { signOut } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useGroup } from '@/hooks/use-group'
import { useTourStore } from '@/stores/tour-store'
import type { TourKey } from '@/types'

/**
 * Get the tour key for the current route.
 */
function getTourKeyForRoute(pathname: string): TourKey | null {
  if (pathname === '/' || pathname === '/dashboard') {
    return 'dashboard'
  }
  if (pathname === '/manage') {
    return 'manage'
  }
  if (pathname === '/history') {
    return 'history'
  }
  return null
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const { group, isLoading: groupLoading } = useGroup()
  const { startTour } = useTourStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  
  // Get the tour key for the current route
  const currentTourKey = getTourKeyForRoute(location.pathname)
  
  const handleShowTour = () => {
    if (currentTourKey) {
      startTour(currentTourKey)
    }
    setMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
    setMobileMenuOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b bg-background">
      <nav className="container mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            aria-label="Fluxo Certo"
            className="flex items-center hover:opacity-90 transition-opacity cursor-pointer"
          >
            <BrandSymbol
              className="h-8 w-8 text-foreground"
              animation={prefersReducedMotion ? 'none' : 'once'}
              aria-hidden="true"
            />
            <span className="sr-only">Fluxo Certo</span>
          </Link>
          {isAuthenticated && group && !groupLoading && (
            <GroupBadge name={group.name} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors hover:text-foreground cursor-pointer',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )
              }
            >
              Painel
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors hover:text-foreground cursor-pointer',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )
              }
            >
              Histórico
            </NavLink>
            <NavLink
              to="/manage"
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors hover:text-foreground cursor-pointer',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )
              }
            >
              Gerenciar
            </NavLink>
            <ThemeToggle />
            {isAuthenticated && currentTourKey && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowTour}
                className="text-muted-foreground hover:text-foreground gap-1"
                aria-label="Mostrar tour da página"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden lg:inline">Tour</span>
              </Button>
            )}
            {isAuthenticated && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l">
                {user?.email && (
                  <span className="text-xs text-muted-foreground hidden lg:inline">
                    {user.email}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sair
                </Button>
              </div>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile navigation menu (sheet) */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent
          className={cn(
            'left-auto right-0 top-0 bottom-0 translate-x-0 translate-y-0',
            'h-[100dvh] w-[85vw] max-w-sm rounded-none',
            'border-l p-4 flex flex-col overflow-y-auto'
          )}
        >
          <DialogHeader className="text-left">
            <DialogTitle>Menu</DialogTitle>
            <DialogDescription className="sr-only">
              Navegue entre as seções do app.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-2">
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )
              }
            >
              Painel
            </NavLink>
            <NavLink
              to="/history"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )
              }
            >
              Histórico
            </NavLink>
            <NavLink
              to="/manage"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )
              }
            >
              Gerenciar
            </NavLink>
          </div>

          <div className="mt-auto pt-4 border-t space-y-2">
            {currentTourKey && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={handleShowTour}
              >
                <HelpCircle className="h-4 w-4" />
                Mostrar tour da página
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
