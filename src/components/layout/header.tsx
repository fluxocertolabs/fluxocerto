import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Menu } from 'lucide-react'
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
import { getTawkChatUrl } from '@/lib/support-chat/tawk'
import { useTourStore } from '@/stores/tour-store'
import { getTourKeyForRoute } from '@/components/help/tour-helpers'
import { useSupportChatPreload } from '@/components/help/use-support-chat-preload'

const CANNY_FEEDBACK_URL = 'https://fluxo-certo.canny.io'
type MobileMenuView = 'nav' | 'help' | 'chat'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { group, isLoading: groupLoading } = useGroup()
  const { unreadCount } = useNotifications()
  const { startTour } = useTourStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMenuView, setMobileMenuView] = useState<MobileMenuView>('nav')
  const [isSupportLoading, setIsSupportLoading] = useState(false)
  const supportLoadRafRef = useRef<number | null>(null)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const currentTourKey = getTourKeyForRoute(location.pathname)
  const tawkChatUrl = getTawkChatUrl()
  const showTawkOption = Boolean(tawkChatUrl)

  useSupportChatPreload(tawkChatUrl)

  // Initialize notifications on authenticated app entry
  useNotificationsInitializer()

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
    setMobileMenuView('nav')
    setIsSupportLoading(false)
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
    closeMobileMenu()
    navigate('/login', { replace: true })
  }

  const handleMobileMenuOpenChange = (open: boolean) => {
    setMobileMenuOpen(open)
    if (!open) {
      setMobileMenuView('nav')
      setIsSupportLoading(false)
    }
  }

  const handleOpenHelpMenu = () => {
    setMobileMenuView('help')
  }

  const handleBackToNav = () => {
    setMobileMenuView('nav')
    setIsSupportLoading(false)
  }

  const handleBackToHelp = () => {
    setMobileMenuView('help')
    setIsSupportLoading(false)
  }

  const handleStartTour = () => {
    if (currentTourKey) {
      startTour(currentTourKey)
    }
    closeMobileMenu()
  }

  const handleOpenFeedback = () => {
    window.open(CANNY_FEEDBACK_URL, '_blank', 'noopener,noreferrer')
    closeMobileMenu()
  }

  const handleOpenChat = () => {
    setIsSupportLoading(true)
    setMobileMenuView('chat')
  }

  const finishSupportLoading = () => {
    if (supportLoadRafRef.current) {
      cancelAnimationFrame(supportLoadRafRef.current)
    }
    supportLoadRafRef.current = requestAnimationFrame(() => {
      supportLoadRafRef.current = requestAnimationFrame(() => {
        setIsSupportLoading(false)
        supportLoadRafRef.current = null
      })
    })
  }

  useEffect(() => {
    return () => {
      if (supportLoadRafRef.current) {
        cancelAnimationFrame(supportLoadRafRef.current)
      }
    }
  }, [])

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
      <Dialog open={mobileMenuOpen} onOpenChange={handleMobileMenuOpenChange}>
        <DialogContent
          className={cn(
            'left-auto right-0 top-0 bottom-0 translate-x-0 translate-y-0',
            'h-[100dvh] w-[85vw] max-w-sm rounded-none',
            'border-l p-4 flex flex-col overflow-y-auto'
          )}
        >
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2">
              {mobileMenuView !== 'nav' && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Voltar ao menu"
                  onClick={mobileMenuView === 'chat' ? handleBackToHelp : handleBackToNav}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle>
                {mobileMenuView === 'nav'
                  ? 'Menu'
                  : mobileMenuView === 'help'
                    ? 'Ajuda e suporte'
                    : 'Falar com suporte'}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              {mobileMenuView === 'nav'
                ? 'Navegue entre as seções do app.'
                : mobileMenuView === 'help'
                  ? 'Acesse ajuda, suporte e feedback.'
                  : 'Converse com o suporte pelo chat.'}
            </DialogDescription>
          </DialogHeader>

          {mobileMenuView === 'nav' && (
            <>
              <div className="mt-4 flex flex-col gap-2">
                <NavLink
                  to="/"
                  end
                  onClick={closeMobileMenu}
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
                  onClick={closeMobileMenu}
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
                  onClick={closeMobileMenu}
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
                  onClick={closeMobileMenu}
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
                <NavLink
                  to="/notifications"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-base font-medium transition-colors',
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )
                  }
                >
                  Notificações
                </NavLink>
                <button
                  type="button"
                  onClick={handleOpenHelpMenu}
                  className={cn(
                    'rounded-lg px-3 py-2 text-base font-medium transition-colors text-left',
                    'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  Ajuda e suporte
                </button>
              </div>

              <div className="mt-auto pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  Sair
                </Button>
              </div>
            </>
          )}

          {mobileMenuView === 'help' && (
            <div className="mt-4 flex flex-col gap-2">
              {currentTourKey && (
                <button
                  type="button"
                  onClick={handleStartTour}
                  className={cn(
                    'rounded-lg px-3 py-2 text-base font-medium transition-colors text-left',
                    'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  Conhecer a página
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenFeedback}
                className={cn(
                  'rounded-lg px-3 py-2 text-base font-medium transition-colors text-left',
                  'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                Sugerir melhorias
              </button>
              {showTawkOption && (
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className={cn(
                    'rounded-lg px-3 py-2 text-base font-medium transition-colors text-left',
                    'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  Falar com suporte
                </button>
              )}
            </div>
          )}

          {mobileMenuView === 'chat' && (
            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              {tawkChatUrl ? (
                <div className="relative h-full min-h-[50vh] w-full flex-1 overflow-hidden rounded-lg border border-border bg-card">
                  {isSupportLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80">
                      <div
                        className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary"
                        style={{ animation: 'spin 0.9s linear infinite' }}
                      />
                    </div>
                  )}
                  <iframe
                    title="Chat de suporte"
                    src={tawkChatUrl}
                    className="h-full w-[calc(100%+16px)] -mr-4 border-0"
                    loading="lazy"
                    onLoad={finishSupportLoading}
                    onError={finishSupportLoading}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    O chat de suporte não está configurado no momento.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </header>
  )
}
