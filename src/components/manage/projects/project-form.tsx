import { useState } from 'react'
import { getISODay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
] as const

/**
 * Convert legacy paymentDay (day-of-month) to day-of-week for weekly/biweekly projects.
 * Maps the day-of-month to the weekday it would fall on in the current month.
 */
function convertLegacyPaymentDay(paymentDay: number): number {
  const today = new Date()
  const targetDate = new Date(today.getFullYear(), today.getMonth(), paymentDay)
  return getISODay(targetDate)
}

/**
 * Extract initial schedule state from a project (handles both new and legacy formats).
 */
function getInitialScheduleState(project?: Project): {
  dayOfWeek: number
  dayOfMonth: number
  firstDay: number
  secondDay: number
} {
  const defaultState = {
    dayOfWeek: 5, // Friday
    dayOfMonth: 1,
    firstDay: 1,
    secondDay: 15,
  }

  if (!project) return defaultState

  const schedule = project.paymentSchedule

  if (schedule) {
    switch (schedule.type) {
      case 'dayOfWeek':
        return { ...defaultState, dayOfWeek: schedule.dayOfWeek }
      case 'dayOfMonth':
        return { ...defaultState, dayOfMonth: schedule.dayOfMonth }
      case 'twiceMonthly':
        return { ...defaultState, firstDay: schedule.firstDay, secondDay: schedule.secondDay }
    }
  }

  // Legacy fallback: convert paymentDay to appropriate schedule
  if (project.paymentDay !== undefined) {
    if (project.frequency === 'weekly' || project.frequency === 'biweekly') {
      return { ...defaultState, dayOfWeek: convertLegacyPaymentDay(project.paymentDay) }
    }
    return { ...defaultState, dayOfMonth: project.paymentDay }
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
      <Label htmlFor="dayOfWeek">Payment Day</Label>
      <Select
        value={value.toString()}
        onValueChange={(v) => onChange(parseInt(v, 10))}
        disabled={disabled}
      >
        <SelectTrigger id="dayOfWeek" aria-invalid={!!error}>
          <SelectValue placeholder="Select day" />
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
      <Label htmlFor="dayOfMonth">Payment Day</Label>
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
        <Label htmlFor="firstDay">First Payment Day</Label>
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
        <Label htmlFor="secondDay">Second Payment Day</Label>
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
  const [amount, setAmount] = useState(project?.amount?.toString() ?? '')
  const [frequency, setFrequency] = useState<Frequency>(project?.frequency ?? 'monthly')
  const [certainty, setCertainty] = useState<Certainty>(project?.certainty ?? 'guaranteed')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Payment schedule state
  const [dayOfWeek, setDayOfWeek] = useState(initialSchedule.dayOfWeek)
  const [dayOfMonth, setDayOfMonth] = useState(initialSchedule.dayOfMonth)
  const [firstDay, setFirstDay] = useState(initialSchedule.firstDay)
  const [secondDay, setSecondDay] = useState(initialSchedule.secondDay)

  // Clear schedule when frequency changes to prevent invalid data combinations
  const handleFrequencyChange = (newFrequency: Frequency) => {
    setFrequency(newFrequency)
    setErrors({})

    // Reset to sensible defaults when frequency changes
    switch (newFrequency) {
      case 'weekly':
      case 'biweekly':
        setDayOfWeek(5) // Friday
        break
      case 'monthly':
        setDayOfMonth(1)
        break
      case 'twice-monthly':
        setFirstDay(1)
        setSecondDay(15)
        break
    }
  }

  // Build PaymentSchedule based on current frequency
  const buildPaymentSchedule = (): PaymentSchedule => {
    switch (frequency) {
      case 'weekly':
      case 'biweekly':
        return { type: 'dayOfWeek', dayOfWeek }
      case 'twice-monthly':
        return { type: 'twiceMonthly', firstDay, secondDay }
      case 'monthly':
        return { type: 'dayOfMonth', dayOfMonth }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      name: name.trim(),
      amount: parseFloat(amount) || 0,
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
        <Label htmlFor="name">Project Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="e.g., Client Retainer"
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
          <Label htmlFor="amount">Payment Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            disabled={isSubmitting}
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
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(value) => handleFrequencyChange(value as Frequency)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="frequency" aria-invalid={!!errors.frequency}>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Biweekly</SelectItem>
              <SelectItem value="twice-monthly">Twice a month</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
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
        <TwiceMonthlyInput
          firstDay={firstDay}
          secondDay={secondDay}
          onFirstDayChange={setFirstDay}
          onSecondDayChange={setSecondDay}
          disabled={isSubmitting}
          firstDayError={errors.firstDay}
          secondDayError={errors.secondDay}
        />
      )}

      <div className="grid gap-2">
        <Label htmlFor="certainty">Certainty</Label>
        <Select
          value={certainty}
          onValueChange={(value) => setCertainty(value as Certainty)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="certainty" aria-invalid={!!errors.certainty}>
            <SelectValue placeholder="Select certainty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="guaranteed">Guaranteed</SelectItem>
            <SelectItem value="probable">Probable</SelectItem>
            <SelectItem value="uncertain">Uncertain</SelectItem>
          </SelectContent>
        </Select>
        {errors.certainty && (
          <p className="text-sm text-destructive">{errors.certainty}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : project ? 'Update' : 'Add Project'}
        </Button>
      </div>
    </form>
  )
}
