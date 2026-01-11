import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
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
import { useNotifications, useNotificationsInitializer } from '@/hooks/use-notifications'

export function Header() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { group, isLoading: groupLoading } = useGroup()
  const { unreadCount } = useNotifications()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // Initialize notifications on authenticated app entry
  useNotificationsInitializer()

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
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors hover:text-foreground cursor-pointer',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )
              }
            >
              Perfil
            </NavLink>
            <div className="flex items-center gap-1 ml-2">
              <NavLink
                to="/notifications"
                aria-label="Notificações"
                className={({ isActive }) =>
                  cn(
                    'relative p-2 rounded-md transition-colors hover:bg-muted cursor-pointer',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )
                }
              >
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notificações</span>
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1"
                    aria-label={`${unreadCount} notificações não lidas`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
              <ThemeToggle />
            </div>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground ml-2"
              >
                Sair
              </Button>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 md:hidden">
            {isAuthenticated && (
              <NavLink
                to="/notifications"
                aria-label="Notificações"
                className={({ isActive }) =>
                  cn(
                    'relative p-2 rounded-md transition-colors hover:bg-muted cursor-pointer',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )
                }
              >
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notificações</span>
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground px-1"
                    aria-label={`${unreadCount} notificações não lidas`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            )}
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
            <NavLink
              to="/profile"
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
              Perfil
            </NavLink>
          </div>

          <div className="mt-auto pt-4 border-t">
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
