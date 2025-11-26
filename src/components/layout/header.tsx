import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Header() {
  return (
    <header className="border-b bg-background">
      <nav className="container mx-auto flex items-center justify-between h-14 px-4">
        <Link
          to="/"
          className="font-semibold text-lg text-foreground hover:text-foreground/80 transition-colors"
        >
          Family Finance
        </Link>
        <div className="flex gap-4">
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
            Dashboard
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
            Manage
          </NavLink>
        </div>
      </nav>
    </header>
  )
}

