import { Link, NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

export function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b bg-background">
      <nav className="container mx-auto flex items-center justify-between h-14 px-4">
        <Link
          to="/"
          className="font-semibold text-lg text-foreground hover:text-foreground/80 transition-colors"
        >
          Finanças da Família
        </Link>
        <div className="flex items-center gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )
            }
          >
            Painel
          </NavLink>
          <NavLink
            to="/manage"
            className={({ isActive }) =>
              cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )
            }
          >
            Gerenciar
          </NavLink>
          {isAuthenticated && (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l">
              {user?.email && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
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
      </nav>
    </header>
  )
}
