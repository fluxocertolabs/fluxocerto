import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ProjectInputSchema,
  type Project,
  type ProjectInput,
  type Frequency,
  type PaymentSchedule,
} from '@/types'

interface ProjectFormProps {
  project?: Project
  onSubmit: (data: ProjectInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

type Certainty = 'guaranteed' | 'probable' | 'uncertain'

// ISO 8601 weekdays: 1 = Monday, 7 = Sunday
const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
] as const

/**
 * Extract initial schedule state from a project.
 */
function getInitialScheduleState(project?: Project): {
  dayOfWeek: number
  dayOfMonth: number
  firstDay: number
  secondDay: number
  firstAmount: string
  secondAmount: string
  variableAmountsEnabled: boolean
} {
  const defaultState = {
    dayOfWeek: 5, // Friday
    dayOfMonth: 1,
    firstDay: 1,
    secondDay: 15,
    firstAmount: '',
    secondAmount: '',
    variableAmountsEnabled: false,
  }

  if (!project) return defaultState

  const schedule = project.paymentSchedule

  if (schedule) {
    switch (schedule.type) {
      case 'dayOfWeek':
        return { ...defaultState, dayOfWeek: schedule.dayOfWeek }
      case 'dayOfMonth':
        return { ...defaultState, dayOfMonth: schedule.dayOfMonth }
      case 'twiceMonthly': {
        const hasVariableAmounts = schedule.firstAmount !== undefined && schedule.secondAmount !== undefined
        return {
          ...defaultState,
          firstDay: schedule.firstDay,
          secondDay: schedule.secondDay,
          // Convert cents to reais for display
          firstAmount: hasVariableAmounts ? (schedule.firstAmount! / 100).toFixed(2) : '',
          secondAmount: hasVariableAmounts ? (schedule.secondAmount! / 100).toFixed(2) : '',
          variableAmountsEnabled: hasVariableAmounts,
        }
      }
    }
  }

  return defaultState
}

/**
 * Day of week select component for weekly/biweekly frequencies.
 */
function DayOfWeekSelect({
  value,
  onChange,
  disabled,
  error,
}: {
  value: number
  onChange: (value: number) => void
  disabled: boolean
  error?: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="dayOfWeek">Dia do Pagamento</Label>
      <Select
        value={value.toString()}
        onValueChange={(v) => onChange(parseInt(v, 10))}
        disabled={disabled}
      >
        <SelectTrigger id="dayOfWeek" aria-invalid={!!error}>
          <SelectValue placeholder="Selecione o dia" />
        </SelectTrigger>
        <SelectContent>
          {WEEKDAYS.map(({ value, label }) => (
            <SelectItem key={value} value={value.toString()}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

/**
 * Day of month input component for monthly frequency.
 */
function DayOfMonthInput({
  value,
  onChange,
  disabled,
  error,
}: {
  value: number
  onChange: (value: number) => void
  disabled: boolean
  error?: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="dayOfMonth">Dia do Pagamento</Label>
      <Input
        id="dayOfMonth"
        type="number"
        placeholder="1-31"
        value={value || ''}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        min="1"
        max="31"
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? 'dayOfMonth-error' : undefined}
      />
      {error && (
        <p id="dayOfMonth-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Twice monthly input component for twice-monthly frequency.
 */
function TwiceMonthlyInput({
  firstDay,
  secondDay,
  onFirstDayChange,
  onSecondDayChange,
  disabled,
  firstDayError,
  secondDayError,
}: {
  firstDay: number
  secondDay: number
  onFirstDayChange: (value: number) => void
  onSecondDayChange: (value: number) => void
  disabled: boolean
  firstDayError?: string
  secondDayError?: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="firstDay">Primeiro Dia de Pagamento</Label>
        <Input
          id="firstDay"
          type="number"
          placeholder="1-31"
          value={firstDay || ''}
          onChange={(e) => onFirstDayChange(parseInt(e.target.value, 10) || 0)}
          min="1"
          max="31"
          disabled={disabled}
          aria-invalid={!!firstDayError}
          aria-describedby={firstDayError ? 'firstDay-error' : undefined}
        />
        {firstDayError && (
          <p id="firstDay-error" className="text-sm text-destructive">
            {firstDayError}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="secondDay">Segundo Dia de Pagamento</Label>
        <Input
          id="secondDay"
          type="number"
          placeholder="1-31"
          value={secondDay || ''}
          onChange={(e) => onSecondDayChange(parseInt(e.target.value, 10) || 0)}
          min="1"
          max="31"
          disabled={disabled}
          aria-invalid={!!secondDayError}
          aria-describedby={secondDayError ? 'secondDay-error' : undefined}
        />
        {secondDayError && (
          <p id="secondDay-error" className="text-sm text-destructive">
            {secondDayError}
          </p>
        )}
      </div>
    </div>
  )
}

export function ProjectForm({
  project,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProjectFormProps) {
  const initialSchedule = getInitialScheduleState(project)

  const [name, setName] = useState(project?.name ?? '')
  // Convert cents to reais for display/editing
  const [amount, setAmount] = useState(
    project?.amount ? (project.amount / 100).toFixed(2) : ''
  )
  const [frequency, setFrequency] = useState<Frequency>(project?.frequency ?? 'monthly')
  const [certainty, setCertainty] = useState<Certainty>(project?.certainty ?? 'guaranteed')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Payment schedule state
  const [dayOfWeek, setDayOfWeek] = useState(initialSchedule.dayOfWeek)
  const [dayOfMonth, setDayOfMonth] = useState(initialSchedule.dayOfMonth)
  const [firstDay, setFirstDay] = useState(initialSchedule.firstDay)
  const [secondDay, setSecondDay] = useState(initialSchedule.secondDay)

  // Variable amounts state (for twice-monthly)
  const [variableAmountsEnabled, setVariableAmountsEnabled] = useState(initialSchedule.variableAmountsEnabled)
  const [firstAmount, setFirstAmount] = useState(initialSchedule.firstAmount)
  const [secondAmount, setSecondAmount] = useState(initialSchedule.secondAmount)

  // Clear schedule when frequency changes to prevent invalid data combinations
  const handleFrequencyChange = (newFrequency: Frequency) => {
    setFrequency(newFrequency)
    setErrors({})

    // Reset to sensible defaults when frequency changes
    switch (newFrequency) {
      case 'weekly':
      case 'biweekly':
        setDayOfWeek(5) // Friday
        // Reset variable amounts when switching away from twice-monthly
        setVariableAmountsEnabled(false)
        setFirstAmount('')
        setSecondAmount('')
        break
      case 'monthly':
        setDayOfMonth(1)
        // Reset variable amounts when switching away from twice-monthly
        setVariableAmountsEnabled(false)
        setFirstAmount('')
        setSecondAmount('')
        break
      case 'twice-monthly':
        setFirstDay(1)
        setSecondDay(15)
        break
    }
  }

  // Handle variable amounts toggle
  const handleVariableAmountsToggle = (enabled: boolean) => {
    setVariableAmountsEnabled(enabled)
    setErrors({})
    if (enabled) {
      // Pre-populate first amount with the current amount field value
      setFirstAmount(amount)
      setSecondAmount('')
    } else {
      // When disabling, use first amount as the single amount (if it was set)
      if (firstAmount) {
        setAmount(firstAmount)
      }
      setFirstAmount('')
      setSecondAmount('')
    }
  }

  // Build PaymentSchedule based on current frequency
  // Variable amounts are converted from reais to cents
  const buildPaymentSchedule = (): PaymentSchedule => {
    switch (frequency) {
      case 'weekly':
      case 'biweekly':
        return { type: 'dayOfWeek', dayOfWeek }
      case 'twice-monthly': {
        const schedule: PaymentSchedule = { type: 'twiceMonthly', firstDay, secondDay }
        if (variableAmountsEnabled) {
          const parsedFirst = parseFloat(firstAmount) || 0
          const parsedSecond = parseFloat(secondAmount) || 0
          if (parsedFirst > 0 && parsedSecond > 0) {
            return {
              ...schedule,
              // Convert reais to cents
              firstAmount: Math.round(parsedFirst * 100),
              secondAmount: Math.round(parsedSecond * 100),
            }
          }
        }
        return schedule
      }
      case 'monthly':
        return { type: 'dayOfMonth', dayOfMonth }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Calculate amount in cents: for twice-monthly with variable amounts, use the sum of both amounts
    // Otherwise use the regular amount field
    // All amounts are converted from reais to cents (multiply by 100)
    let calculatedAmountInCents: number
    if (frequency === 'twice-monthly' && variableAmountsEnabled) {
      const parsedFirst = parseFloat(firstAmount) || 0
      const parsedSecond = parseFloat(secondAmount) || 0
      calculatedAmountInCents = Math.round((parsedFirst + parsedSecond) * 100)
    } else {
      calculatedAmountInCents = Math.round((parseFloat(amount) || 0) * 100)
    }

    const formData = {
      name: name.trim(),
      amount: calculatedAmountInCents,
      frequency,
      paymentSchedule: buildPaymentSchedule(),
      certainty,
      isActive: project?.isActive ?? true,
    }

    const result = ProjectInputSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const formattedErrors: Record<string, string> = {}

      for (const [key, messages] of Object.entries(fieldErrors)) {
        formattedErrors[key] = messages?.[0] ?? ''
      }

      // Handle nested paymentSchedule errors
      const formErrors = result.error.issues
      for (const error of formErrors) {
        if (error.path[0] === 'paymentSchedule') {
          if (error.path[1] === 'secondDay' || error.message.includes('different')) {
            formattedErrors['secondDay'] = error.message
          } else if (error.path[1] === 'firstDay') {
            formattedErrors['firstDay'] = error.message
          } else if (error.path[1] === 'dayOfWeek') {
            formattedErrors['dayOfWeek'] = error.message
          } else if (error.path[1] === 'dayOfMonth') {
            formattedErrors['dayOfMonth'] = error.message
          } else if (error.path[1] === 'firstAmount' || error.message.includes('First amount')) {
            formattedErrors['firstAmount'] = error.message
          } else if (error.path[1] === 'secondAmount' || error.message.includes('Second amount') || error.message.includes('Both amounts')) {
            formattedErrors['secondAmount'] = error.message
          } else {
            formattedErrors['paymentSchedule'] = error.message
          }
        }
      }

      setErrors(formattedErrors)
      return
    }

    await onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome do Projeto</Label>
        <Input
          id="name"
          type="text"
          placeholder="ex: Salário Mensal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="amount">Valor do Pagamento</Label>
          <CurrencyInput
            id="amount"
            placeholder={frequency === 'twice-monthly' && variableAmountsEnabled ? 'Usando valores variáveis' : undefined}
            value={frequency === 'twice-monthly' && variableAmountsEnabled ? '' : amount}
            onChange={setAmount}
            disabled={isSubmitting || (frequency === 'twice-monthly' && variableAmountsEnabled)}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
          />
          {errors.amount && (
            <p id="amount-error" className="text-sm text-destructive">
              {errors.amount}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="frequency">Frequência</Label>
          <Select
            value={frequency}
            onValueChange={(value) => handleFrequencyChange(value as Frequency)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="frequency" aria-invalid={!!errors.frequency}>
              <SelectValue placeholder="Selecione a frequência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="biweekly">Quinzenal</SelectItem>
              <SelectItem value="twice-monthly">Duas vezes por mês</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
          {errors.frequency && (
            <p className="text-sm text-destructive">{errors.frequency}</p>
          )}
        </div>
      </div>

      {/* Dynamic payment day input based on frequency */}
      {(frequency === 'weekly' || frequency === 'biweekly') && (
        <DayOfWeekSelect
          value={dayOfWeek}
          onChange={setDayOfWeek}
          disabled={isSubmitting}
          error={errors.dayOfWeek}
        />
      )}

      {frequency === 'monthly' && (
        <DayOfMonthInput
          value={dayOfMonth}
          onChange={setDayOfMonth}
          disabled={isSubmitting}
          error={errors.dayOfMonth}
        />
      )}

      {frequency === 'twice-monthly' && (
        <>
          <TwiceMonthlyInput
            firstDay={firstDay}
            secondDay={secondDay}
            onFirstDayChange={setFirstDay}
            onSecondDayChange={setSecondDay}
            disabled={isSubmitting}
            firstDayError={errors.firstDay}
            secondDayError={errors.secondDay}
          />

          {/* Variable amounts toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="variableAmounts"
              checked={variableAmountsEnabled}
              onCheckedChange={handleVariableAmountsToggle}
              disabled={isSubmitting}
            />
            <Label htmlFor="variableAmounts" className="cursor-pointer text-sm font-normal">
              Valores diferentes para cada dia
            </Label>
          </div>

          {/* Variable amount fields */}
          {variableAmountsEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstAmount">Valor do 1º pagamento</Label>
                <CurrencyInput
                  id="firstAmount"
                  value={firstAmount}
                  onChange={setFirstAmount}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.firstAmount}
                  aria-describedby={errors.firstAmount ? 'firstAmount-error' : undefined}
                />
                {errors.firstAmount && (
                  <p id="firstAmount-error" className="text-sm text-destructive">
                    {errors.firstAmount}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="secondAmount">Valor do 2º pagamento</Label>
                <CurrencyInput
                  id="secondAmount"
                  value={secondAmount}
                  onChange={setSecondAmount}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.secondAmount}
                  aria-describedby={errors.secondAmount ? 'secondAmount-error' : undefined}
                />
                {errors.secondAmount && (
                  <p id="secondAmount-error" className="text-sm text-destructive">
                    {errors.secondAmount}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor="certainty">Certeza</Label>
        <Select
          value={certainty}
          onValueChange={(value) => setCertainty(value as Certainty)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="certainty" aria-invalid={!!errors.certainty}>
            <SelectValue placeholder="Selecione a certeza" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="guaranteed">Garantido</SelectItem>
            <SelectItem value="probable">Provável</SelectItem>
            <SelectItem value="uncertain">Incerto</SelectItem>
          </SelectContent>
        </Select>
        {errors.certainty && (
          <p className="text-sm text-destructive">{errors.certainty}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : project ? 'Atualizar' : 'Adicionar Projeto'}
        </Button>
      </div>
    </form>
  )
}
