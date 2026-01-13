/**
 * Multi-step onboarding wizard UI.
 * 
 * Guides new users through setting up their account with the minimum
 * required data for cashflow projections.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Toast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useOnboardingState } from '@/hooks/use-onboarding-state'
import { useToast } from '@/hooks/use-toast'
import { useFinanceStore } from '@/stores/finance-store'
import { useGroup } from '@/hooks/use-group'
import { getSupabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { getStepConfig, isFirstStep, getNextStep, getTotalSteps, getStepIndex } from '@/lib/onboarding/steps'
import type { BankAccount, OnboardingStep } from '@/types'

function triggerShake(el: HTMLElement | null): void {
  if (!el) return
  el.classList.remove('animate-shake')
  // Force reflow so the animation can replay reliably.
  void el.offsetWidth
  el.classList.add('animate-shake')
}

function shakeNextFrame(shakeEl: HTMLElement | null, focusEl?: HTMLElement | null): void {
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 0)

  schedule(() => {
    triggerShake(shakeEl)
    const elToFocus = (focusEl ?? shakeEl) as HTMLElement | null
    if (elToFocus && 'focus' in elToFocus) {
      ;(elToFocus as HTMLElement).focus()
    }
  })
}

/**
 * Onboarding wizard component.
 * Renders as a dialog overlay when active.
 */
export function OnboardingWizard() {
  const {
    isWizardActive,
    currentStep,
    progress,
    error: onboardingError,
    refetch,
    nextStep,
    previousStep,
    complete,
    closeWizard,
    accounts,
    isFinanceLoading,
  } = useOnboardingState()

  const { group, members, isLoading: isGroupLoading, retry: retryGroup } = useGroup()
  const currentMemberName = members.find(m => m.isCurrentUser)?.name ?? ''
  const currentGroupName = group?.name ?? ''
  const groupId = group?.id

  const { toast, showError, hideToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (onboardingError) {
      showError(onboardingError, refetch)
    }
  }, [onboardingError, refetch, showError])

  // Safety: never render the legacy "done" confirmation screen.
  // If state transitions to 'done' for any reason, just close the wizard.
  useEffect(() => {
    if (isWizardActive && currentStep === 'done') {
      closeWizard()
    }
  }, [isWizardActive, currentStep, closeWizard])

  const handleStepComplete = useCallback(async () => {
    const next = getNextStep(currentStep)
    // Don't navigate to the "done" step UI; just complete onboarding and close.
    if (!next || next === 'done') {
      await complete()
    } else {
      await nextStep()
    }
  }, [currentStep, complete, nextStep])

  const handleBack = useCallback(async () => {
    await previousStep()
  }, [previousStep])

  const stepConfig = getStepConfig(currentStep)
  const totalSteps = getTotalSteps()
  const stepNumber = Math.min(getStepIndex(currentStep) + 1, totalSteps)

  return (
    <>
      {currentStep !== 'done' && (
        <Dialog open={isWizardActive} onOpenChange={() => {}}>
          <DialogContent
            className="sm:max-w-lg"
            showClose={false}
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Passo {stepNumber} de {totalSteps}
                </span>
              </div>
              <Progress value={progress} className="h-2 mb-4" />
              <DialogTitle>{stepConfig.title}</DialogTitle>
              <DialogDescription>{stepConfig.description}</DialogDescription>
            </DialogHeader>

            <StepContent
              step={currentStep}
              onComplete={handleStepComplete}
              onBack={handleBack}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              showError={showError}
              isFirstStep={isFirstStep(currentStep)}
              groupId={groupId}
              currentGroupName={currentGroupName}
              currentMemberName={currentMemberName}
              isGroupLoading={isGroupLoading}
              retryGroup={retryGroup}
              accounts={accounts}
              isFinanceLoading={isFinanceLoading}
            />
          </DialogContent>
        </Dialog>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
          onRetry={toast.onRetry}
          duration={8000}
        />
      )}
    </>
  )
}

interface StepContentProps {
  step: OnboardingStep
  onComplete: () => Promise<void>
  onBack: () => Promise<void>
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  showError: (message: string, onRetry?: () => void) => void
  isFirstStep: boolean
  groupId?: string
  currentGroupName: string
  currentMemberName: string
  isGroupLoading: boolean
  retryGroup: () => void
  accounts: BankAccount[]
  isFinanceLoading: boolean
}

function StepContent({
  step,
  onComplete,
  onBack,
  isSubmitting,
  setIsSubmitting,
  showError,
  isFirstStep,
  groupId,
  currentGroupName,
  currentMemberName,
  isGroupLoading,
  retryGroup,
  accounts,
  isFinanceLoading,
}: StepContentProps) {
  switch (step) {
    case 'profile':
      return (
        <ProfileStep
          onComplete={onComplete}
          onBack={onBack}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          showError={showError}
          isFirstStep={isFirstStep}
          serverName={currentMemberName}
          isGroupLoading={isGroupLoading}
          retryGroup={retryGroup}
        />
      )
    case 'group':
      return (
        <GroupStep
          onComplete={onComplete}
          onBack={onBack}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          showError={showError}
          groupId={groupId}
          serverName={currentGroupName}
          isGroupLoading={isGroupLoading}
          retryGroup={retryGroup}
        />
      )
    case 'bank_account':
      return (
        <BankAccountStep
          onComplete={onComplete}
          onBack={onBack}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          showError={showError}
          accounts={accounts}
          isFinanceLoading={isFinanceLoading}
        />
      )
    case 'income':
      return (
        <IncomeStep
          onComplete={onComplete}
          onBack={onBack}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          showError={showError}
        />
      )
    case 'expense':
      return (
        <ExpenseStep
          onComplete={onComplete}
          onBack={onBack}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          showError={showError}
        />
      )
    case 'credit_card':
      return (
        <CreditCardStep
          onComplete={onComplete}
          onBack={onBack}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          showError={showError}
        />
      )
    case 'done':
      return <DoneStep onComplete={onComplete} />
    default:
      return null
  }
}

// Step navigation buttons component
interface StepNavigationProps {
  onBack?: () => void
  isSubmitting: boolean
  isFirstStep?: boolean
  isLastStep?: boolean
  nextLabel?: string
}

function StepNavigation({
  onBack,
  isSubmitting,
  isFirstStep = false,
  isLastStep = false,
  nextLabel,
}: StepNavigationProps) {
  const showBack = !isFirstStep && !!onBack

  return (
    <div className={`flex gap-2 pt-6 ${showBack ? 'justify-between' : 'justify-end'}`}>
      {showBack && (
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Voltar
        </Button>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : nextLabel ?? (isLastStep ? 'Concluir' : 'Próximo')}
      </Button>
    </div>
  )
}

// Profile step - update user's display name
interface ProfileStepProps {
  onComplete: () => Promise<void>
  onBack: () => Promise<void>
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  showError: (message: string, onRetry?: () => void) => void
  isFirstStep: boolean
  serverName: string
  isGroupLoading: boolean
  retryGroup: () => void
}

function ProfileStep({
  onComplete,
  onBack,
  isSubmitting,
  setIsSubmitting,
  showError,
  isFirstStep,
  serverName,
  isGroupLoading,
  retryGroup,
}: ProfileStepProps) {
  const currentName = serverName
  const [name, setName] = useState(currentName)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Keep input in sync with current server value when navigating back/forward.
  // Don't overwrite if the user is actively editing.
  useEffect(() => {
    if (isDirty) return
    if (!currentName) return
    setName(currentName)
  }, [currentName, isDirty])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsDirty(false)
    
    const trimmedName = name.trim()
    if (!trimmedName) {
      const message = 'Seu nome é obrigatório'
      setErrors({ name: message })
      showError(message)
      shakeNextFrame(nameInputRef.current)
      return
    }

    setIsSubmitting(true)

    try {
      const client = getSupabase()

      // Prefer getSession() (local) over getUser() (network) to avoid auth-service bottlenecks
      // under CI parallel load.
      const { data: { session } } = await client.auth.getSession()
      let email = session?.user?.email ?? null

      // Fallback: in rare early-hydration cases session can be null, so we ask the auth server.
      if (!email) {
        const { data: { user } } = await client.auth.getUser()
        email = user?.email ?? null
      }

      if (!email) {
        throw new Error('Usuário não encontrado')
      }

      // Update profile name
      const { error: updateError } = await client
        .from('profiles')
        .update({ name: trimmedName })
        .eq('email', email.toLowerCase())

      if (updateError) {
        throw updateError
      }

      // Refresh group/member data so the updated name is reflected when navigating back.
      retryGroup()
      await onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao atualizar perfil')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Seu Nome</Label>
        <p className="text-xs text-muted-foreground">
          Este nome será exibido no app e pode ser alterado depois.
        </p>
        <div className="relative">
          <Input
            ref={nameInputRef}
            id="profile-name"
            type="text"
            placeholder={isGroupLoading ? 'Carregando...' : 'Como você quer ser chamado?'}
            value={name}
            onChange={(e) => {
              const next = e.target.value
              setName(next)
              setIsDirty(true)
              if (errors.name) {
                setErrors(prev => {
                  const nextErrors = { ...prev }
                  delete nextErrors.name
                  return nextErrors
                })
              }
            }}
            // Profile name update does not depend on group data; don't block typing while group loads.
            disabled={isSubmitting}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'profile-name-error' : undefined}
            className={cn(
              isGroupLoading && 'pr-10',
              errors.name && '!border-destructive focus-visible:!ring-destructive'
            )}
          />
          {isGroupLoading && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </span>
          )}
        </div>
        {errors.name && (
          <p id="profile-name-error" className="sr-only">
            {errors.name}
          </p>
        )}
      </div>
      <StepNavigation
        onBack={onBack}
        isSubmitting={isSubmitting}
        isFirstStep={isFirstStep}
      />
    </form>
  )
}

// Group step - update group name
interface GroupStepProps {
  onComplete: () => Promise<void>
  onBack: () => Promise<void>
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  showError: (message: string, onRetry?: () => void) => void
  groupId?: string
  serverName: string
  isGroupLoading: boolean
  retryGroup: () => void
}

function GroupStep({
  onComplete,
  onBack,
  isSubmitting,
  setIsSubmitting,
  showError,
  groupId,
  serverName,
  isGroupLoading,
  retryGroup,
}: GroupStepProps) {
  const currentName = serverName
  const [name, setName] = useState(currentName)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Keep input in sync with current server value when navigating back/forward.
  // Don't overwrite if the user is actively editing.
  useEffect(() => {
    if (isDirty) return
    if (!currentName) return
    setName(currentName)
  }, [currentName, isDirty])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsDirty(false)

    const trimmedName = name.trim()
    if (!trimmedName) {
      const message = 'Nome do grupo é obrigatório'
      setErrors({ name: message })
      showError(message)
      shakeNextFrame(nameInputRef.current)
      return
    }

    if (!groupId) {
      showError('Grupo não encontrado')
      return
    }

    setIsSubmitting(true)

    try {
      const client = getSupabase()
      const { error: updateError } = await client
        .from('groups')
        .update({ name: trimmedName })
        .eq('id', groupId)

      if (updateError) {
        throw updateError
      }

      // Refresh group/member data so the updated name is reflected when navigating back.
      retryGroup()
      await onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao atualizar grupo')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="group-name">Nome do Grupo</Label>
        <p className="text-xs text-muted-foreground">
          Dê um nome ao seu grupo financeiro. Você pode convidar outras pessoas depois.
        </p>
        <div className="relative">
          <Input
            ref={nameInputRef}
            id="group-name"
            type="text"
            placeholder={isGroupLoading ? 'Carregando...' : 'ex: Grupo Silva, Meu Orçamento'}
            value={name}
            onChange={(e) => {
              const next = e.target.value
              setName(next)
              setIsDirty(true)
              if (errors.name) {
                setErrors(prev => {
                  const nextErrors = { ...prev }
                  delete nextErrors.name
                  return nextErrors
                })
              }
            }}
            disabled={isSubmitting || isGroupLoading}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'group-name-error' : undefined}
            className={cn(
              isGroupLoading && 'pr-10',
              errors.name && '!border-destructive focus-visible:!ring-destructive'
            )}
          />
          {isGroupLoading && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </span>
          )}
        </div>
        {errors.name && (
          <p id="group-name-error" className="sr-only">
            {errors.name}
          </p>
        )}
      </div>
      <StepNavigation
        onBack={onBack}
        isSubmitting={isSubmitting || isGroupLoading}
      />
    </form>
  )
}

// Bank account step
interface BankAccountStepProps {
  onComplete: () => Promise<void>
  onBack: () => Promise<void>
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  showError: (message: string, onRetry?: () => void) => void
  accounts: BankAccount[]
  isFinanceLoading: boolean
}

function BankAccountStep({
  onComplete,
  onBack,
  isSubmitting,
  setIsSubmitting,
  showError,
  accounts,
  isFinanceLoading,
}: BankAccountStepProps) {
  const store = useFinanceStore()
  const existingAccount = accounts.length > 0
    ? [...accounts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]
    : null

  const [accountId, setAccountId] = useState<string | null>(() => existingAccount?.id ?? null)
  const [name, setName] = useState(() => existingAccount?.name ?? '')
  const [type, setType] = useState<'checking' | 'savings' | 'investment'>(() => existingAccount?.type ?? 'checking')
  const [balance, setBalance] = useState(() =>
    existingAccount ? (existingAccount.balance / 100).toFixed(2) : ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill from existing account when navigating back (and don't overwrite user edits).
  useEffect(() => {
    if (isDirty) return
    if (!existingAccount) return
    setAccountId(existingAccount.id)
    setName(existingAccount.name)
    setType(existingAccount.type)
    setBalance((existingAccount.balance / 100).toFixed(2))
  }, [existingAccount, isDirty])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (isFinanceLoading) {
      showError('Carregando contas...')
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      const message = 'Nome da conta é obrigatório'
      setErrors({ name: message })
      showError(message)
      shakeNextFrame(nameInputRef.current)
      return
    }

    setIsSubmitting(true)

    try {
      // If an account already exists (or was created earlier in onboarding), update it instead of creating a duplicate.
      const balanceCents = Math.round((parseFloat(balance) || 0) * 100)

      const result = accountId
        ? await store.updateAccount(accountId, { name: trimmedName, type, balance: balanceCents, ownerId: null })
        : await store.addAccount({ name: trimmedName, type, balance: balanceCents, ownerId: null })

      if (!result.success) {
        showError(result.error)
        return
      }

      // If we just created the account, remember it so subsequent submits update instead of inserting again.
      if (!accountId && result.success && typeof result.data === 'string') {
        setAccountId(result.data)
      }

      setIsDirty(false)
      await onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao adicionar conta')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="account-name">Nome da Conta</Label>
        <div className="relative">
          <Input
            ref={nameInputRef}
            id="account-name"
            type="text"
            placeholder={isFinanceLoading ? 'Carregando...' : 'ex: Conta Corrente Principal'}
            value={name}
            onChange={(e) => {
              const next = e.target.value
              setName(next)
              setIsDirty(true)
              if (errors.name) {
                setErrors(prev => {
                  const nextErrors = { ...prev }
                  delete nextErrors.name
                  return nextErrors
                })
              }
            }}
            disabled={isSubmitting || isFinanceLoading}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'account-name-error' : undefined}
            className={cn(
              isFinanceLoading && 'pr-10',
              errors.name && '!border-destructive focus-visible:!ring-destructive'
            )}
          />
          {isFinanceLoading && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </span>
          )}
        </div>
        {errors.name && (
          <p id="account-name-error" className="sr-only">
            {errors.name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="account-type">Tipo de Conta</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)} disabled={isSubmitting}>
            <SelectTrigger id="account-type" aria-invalid={!!errors.type}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Conta Corrente</SelectItem>
              <SelectItem value="savings">Poupança</SelectItem>
              <SelectItem value="investment">Investimento</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="sr-only">
              {errors.type}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="account-balance">Saldo Atual</Label>
          <CurrencyInput
            id="account-balance"
            value={balance}
            onChange={(next) => {
              setBalance(next)
              setIsDirty(true)
            }}
            disabled={isSubmitting || isFinanceLoading}
            aria-invalid={!!errors.balance}
            aria-describedby={errors.balance ? 'account-balance-error' : undefined}
          />
          {errors.balance && (
            <p id="account-balance-error" className="sr-only">
              {errors.balance}
            </p>
          )}
        </div>
      </div>

      <StepNavigation onBack={onBack} isSubmitting={isSubmitting || isFinanceLoading} />
    </form>
  )
}

// Income step
interface IncomeStepProps {
  onComplete: () => Promise<void>
  onBack: () => Promise<void>
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  showError: (message: string, onRetry?: () => void) => void
}

function IncomeStep({ onComplete, onBack, isSubmitting, setIsSubmitting, showError }: IncomeStepProps) {
  const store = useFinanceStore()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDay, setPaymentDay] = useState('5')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nameInputRef = useRef<HTMLInputElement>(null)
  const amountWrapperRef = useRef<HTMLDivElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const nextErrors: Record<string, string> = {}

    const trimmedName = name.trim()
    const trimmedAmount = amount.trim()

    // Optional step: if left completely empty, just continue.
    if (!trimmedName && !trimmedAmount) {
      await onComplete()
      return
    }

    const amountValue = parseFloat(amount) || 0
    if (!trimmedName) {
      nextErrors.name = 'Nome da renda é obrigatório'
    }
    if (amountValue <= 0) {
      nextErrors.amount = 'Valor deve ser maior que zero'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      const firstKey = nextErrors.name ? 'name' : 'amount'
      const message = nextErrors[firstKey] ?? 'Preencha os campos obrigatórios'
      showError(message)
      if (firstKey === 'name') {
        shakeNextFrame(nameInputRef.current)
      } else {
        shakeNextFrame(amountWrapperRef.current, amountInputRef.current)
      }
      return
    }

    setIsSubmitting(true)

    try {
      const result = await store.addProject({
        type: 'recurring',
        name: trimmedName,
        amount: Math.round(amountValue * 100),
        frequency: 'monthly',
        paymentSchedule: {
          type: 'dayOfMonth',
          dayOfMonth: parseInt(paymentDay) || 5,
        },
        certainty: 'guaranteed',
        isActive: true,
      })

      if (!result.success) {
        showError(result.error)
        return
      }

      await onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao adicionar renda')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="income-name">Nome da Renda</Label>
        <Input
          ref={nameInputRef}
          id="income-name"
          type="text"
          placeholder="ex: Salário, Freelance"
          value={name}
          onChange={(e) => {
            const next = e.target.value
            setName(next)
            if (errors.name) {
              setErrors(prev => {
                const nextErrors = { ...prev }
                delete nextErrors.name
                return nextErrors
              })
            }
          }}
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'income-name-error' : undefined}
          className={errors.name ? '!border-destructive focus-visible:!ring-destructive' : undefined}
        />
        {errors.name && (
          <p id="income-name-error" className="sr-only">
            {errors.name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="income-amount">Valor Mensal</Label>
          <div ref={amountWrapperRef}>
            <CurrencyInput
              ref={amountInputRef}
              id="income-amount"
              value={amount}
              onChange={(next) => {
                setAmount(next)
                if (errors.amount) {
                  setErrors(prev => {
                    const nextErrors = { ...prev }
                    delete nextErrors.amount
                    return nextErrors
                  })
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'income-amount-error' : undefined}
              className={errors.amount ? '!border-destructive focus-visible:!ring-destructive' : undefined}
            />
          </div>
          {errors.amount && (
            <p id="income-amount-error" className="sr-only">
              {errors.amount}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="income-day">Dia do Pagamento</Label>
          <Select value={paymentDay} onValueChange={setPaymentDay} disabled={isSubmitting}>
            <SelectTrigger id="income-day" aria-invalid={!!errors.paymentDay}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Dia {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.paymentDay && (
            <p className="sr-only">
              {errors.paymentDay}
            </p>
          )}
        </div>
      </div>

      <StepNavigation onBack={onBack} isSubmitting={isSubmitting} />
    </form>
  )
}

// Expense step
interface ExpenseStepProps {
  onComplete: () => Promise<void>
  onBack: () => Promise<void>
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  showError: (message: string, onRetry?: () => void) => void
}

function ExpenseStep({ onComplete, onBack, isSubmitting, setIsSubmitting, showError }: ExpenseStepProps) {
  const store = useFinanceStore()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('10')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nameInputRef = useRef<HTMLInputElement>(null)
  const amountWrapperRef = useRef<HTMLDivElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const nextErrors: Record<string, string> = {}

    const trimmedName = name.trim()
    const trimmedAmount = amount.trim()

    // Optional step: if left completely empty, just continue.
    if (!trimmedName && !trimmedAmount) {
      await onComplete()
      return
    }
    if (!trimmedName) {
      nextErrors.name = 'Nome da despesa é obrigatório'
    }

    const amountValue = parseFloat(amount) || 0
    if (amountValue <= 0) {
      nextErrors.amount = 'Valor deve ser maior que zero'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      const firstKey = nextErrors.name ? 'name' : 'amount'
      const message = nextErrors[firstKey] ?? 'Preencha os campos obrigatórios'
      showError(message)
      if (firstKey === 'name') {
        shakeNextFrame(nameInputRef.current)
      } else {
        shakeNextFrame(amountWrapperRef.current, amountInputRef.current)
      }
      return
    }

    setIsSubmitting(true)

    try {
      const result = await store.addExpense({
        type: 'fixed',
        name: trimmedName,
        amount: Math.round(amountValue * 100),
        dueDay: parseInt(dueDay) || 10,
        isActive: true,
      })

      if (!result.success) {
        showError(result.error)
        return
      }

      await onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao adicionar despesa')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="expense-name">Nome da Despesa</Label>
        <Input
          ref={nameInputRef}
          id="expense-name"
          type="text"
          placeholder="ex: Aluguel, Internet, Luz"
          value={name}
          onChange={(e) => {
            const next = e.target.value
            setName(next)
            if (errors.name) {
              setErrors(prev => {
                const nextErrors = { ...prev }
                delete nextErrors.name
                return nextErrors
              })
            }
          }}
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'expense-name-error' : undefined}
          className={errors.name ? '!border-destructive focus-visible:!ring-destructive' : undefined}
        />
        {errors.name && (
          <p id="expense-name-error" className="sr-only">
            {errors.name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="expense-amount">Valor Mensal</Label>
          <div ref={amountWrapperRef}>
            <CurrencyInput
              ref={amountInputRef}
              id="expense-amount"
              value={amount}
              onChange={(next) => {
                setAmount(next)
                if (errors.amount) {
                  setErrors(prev => {
                    const nextErrors = { ...prev }
                    delete nextErrors.amount
                    return nextErrors
                  })
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
              className={errors.amount ? '!border-destructive focus-visible:!ring-destructive' : undefined}
            />
          </div>
          {errors.amount && (
            <p id="expense-amount-error" className="sr-only">
              {errors.amount}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="expense-day">Dia de Vencimento</Label>
          <Select value={dueDay} onValueChange={setDueDay} disabled={isSubmitting}>
            <SelectTrigger id="expense-day" aria-invalid={!!errors.dueDay}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Dia {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.dueDay && (
            <p className="sr-only">
              {errors.dueDay}
            </p>
          )}
        </div>
      </div>

      <StepNavigation onBack={onBack} isSubmitting={isSubmitting} />
    </form>
  )
}

// Credit card step
interface CreditCardStepProps {
  onComplete: () => Promise<void>
  onBack: () => Promise<void>
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  showError: (message: string, onRetry?: () => void) => void
}

function CreditCardStep({ onComplete, onBack, isSubmitting, setIsSubmitting, showError }: CreditCardStepProps) {
  const store = useFinanceStore()
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [dueDay, setDueDay] = useState('15')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      // Optional step: allow continuing without adding a credit card
      await onComplete()
      return
    }

    setIsSubmitting(true)

    try {
      const result = await store.addCreditCard({
        name: trimmedName,
        statementBalance: Math.round((parseFloat(balance) || 0) * 100),
        dueDay: parseInt(dueDay) || 15,
        ownerId: null,
      })

      if (!result.success) {
        showError(result.error)
        return
      }

      await onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao adicionar cartão')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="card-name">Nome do Cartão</Label>
        <Input
          id="card-name"
          type="text"
          placeholder="ex: Nubank, Itaú Platinum"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="card-balance">Fatura Atual</Label>
          <CurrencyInput
            id="card-balance"
            value={balance}
            onChange={setBalance}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="card-day">Dia de Vencimento</Label>
          <Select value={dueDay} onValueChange={setDueDay} disabled={isSubmitting}>
            <SelectTrigger id="card-day">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Dia {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <StepNavigation
        onBack={onBack}
        isSubmitting={isSubmitting}
        isLastStep={true}
        nextLabel="Finalizar"
      />
    </form>
  )
}

// Done step - completion message
interface DoneStepProps {
  onComplete: () => Promise<void>
}

function DoneStep({ onComplete }: DoneStepProps) {
  return (
    <div className="text-center py-6">
      <div className="rounded-full bg-green-100 dark:bg-green-900/30 w-16 h-16 mx-auto flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">Configuração Concluída!</h3>
      <p className="text-muted-foreground text-sm mb-6">
        Seu Fluxo Certo está pronto. Agora você pode ver suas projeções de fluxo de caixa.
      </p>
      <Button onClick={onComplete} size="lg">
        Ir para o Dashboard
      </Button>
    </div>
  )
}

