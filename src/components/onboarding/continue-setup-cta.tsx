/**
 * "Continuar configuração" entry point component.
 * 
 * Displays a CTA button/link to open the onboarding wizard.
 * Used in the header and empty states when minimum setup is incomplete.
 */

import { Button } from '@/components/ui/button'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { isMinimumSetupComplete } from '@/lib/onboarding/steps'
import { cn } from '@/lib/utils'

interface ContinueSetupCtaProps {
  /** Variant of the button */
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  /** Size of the button */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Additional class names */
  className?: string
  /** Whether to show only when minimum setup is incomplete */
  showOnlyWhenIncomplete?: boolean
  /** Custom label (default: "Continuar configuração") */
  label?: string
}

export function ContinueSetupCta({
  variant = 'default',
  size = 'default',
  className,
  showOnlyWhenIncomplete = true,
  label = 'Continuar configuração',
}: ContinueSetupCtaProps) {
  const { openWizard } = useOnboardingStore()
  const { accounts, projects, singleShotIncome, fixedExpenses, singleShotExpenses, isLoading } = useFinanceData()
  const setupComplete = isMinimumSetupComplete(
    accounts.length,
    projects.length + singleShotIncome.length,
    fixedExpenses.length + singleShotExpenses.length
  )

  // Don't show if minimum setup is complete and we're configured to hide
  if (showOnlyWhenIncomplete && setupComplete) {
    return null
  }

  // Don't show while loading
  if (isLoading) {
    return null
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={openWizard}
    >
      {label}
    </Button>
  )
}

/**
 * Empty state CTA for pages that need minimum setup.
 * Shows a more prominent call-to-action with description.
 */
interface EmptyStateSetupCtaProps {
  /** Title to display */
  title?: string
  /** Description to display */
  description?: string
  /** Additional class names */
  className?: string
}

export function EmptyStateSetupCta({
  title = 'Configure seu Fluxo Certo',
  description = 'Para ver suas projeções de fluxo de caixa, você precisa configurar pelo menos uma conta bancária, uma fonte de renda e uma despesa.',
  className,
}: EmptyStateSetupCtaProps) {
  const { openWizard } = useOnboardingStore()
  const { accounts, projects, singleShotIncome, fixedExpenses, singleShotExpenses, isLoading } = useFinanceData()
  const setupComplete = isMinimumSetupComplete(
    accounts.length,
    projects.length + singleShotIncome.length,
    fixedExpenses.length + singleShotExpenses.length
  )

  // Don't show if minimum setup is complete
  if (setupComplete) {
    return null
  }

  // Don't show while loading
  if (isLoading) {
    return null
  }

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-6">{description}</p>
      <Button onClick={openWizard} size="lg">
        Começar Configuração
      </Button>
    </div>
  )
}


