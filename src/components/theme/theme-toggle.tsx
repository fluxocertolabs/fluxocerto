/**
 * Theme toggle button component.
 * Cycles through light → dark → system themes.
 * Uses Sun/Moon icons from lucide-react.
 */

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import type { ThemeValue } from '@/types/theme'

/** Get next theme in cycle: light → dark → system → light */
function getNextTheme(current: ThemeValue): ThemeValue {
  switch (current) {
    case 'light':
      return 'dark'
    case 'dark':
      return 'system'
    case 'system':
      return 'light'
  }
}

/** Get aria-label text in Brazilian Portuguese */
function getAriaLabel(theme: ThemeValue): string {
  switch (theme) {
    case 'light':
      return 'Tema atual: Claro. Clique para mudar para Escuro'
    case 'dark':
      return 'Tema atual: Escuro. Clique para mudar para Sistema'
    case 'system':
      return 'Tema atual: Sistema. Clique para mudar para Claro'
  }
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const handleToggle = () => {
    const nextTheme = getNextTheme(theme)
    setTheme(nextTheme)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={getAriaLabel(theme)}
      className="relative"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{getAriaLabel(theme)}</span>
    </Button>
  )
}

