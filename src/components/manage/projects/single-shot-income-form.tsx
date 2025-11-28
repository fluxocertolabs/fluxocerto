import { useState } from 'react'
import { format, startOfDay, parse } from 'date-fns'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SingleShotIncomeInputSchema, type SingleShotIncome } from '@/types'

interface SingleShotIncomeFormProps {
  income?: SingleShotIncome
  onSubmit: (data: { name: string; amount: number; date: Date; certainty: 'guaranteed' | 'probable' | 'uncertain' }) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

const CERTAINTY_OPTIONS = [
  { value: 'guaranteed', label: 'Garantida' },
  { value: 'probable', label: 'Provável' },
  { value: 'uncertain', label: 'Incerta' },
] as const

export function SingleShotIncomeForm({
  income,
  onSubmit,
  onCancel,
  isSubmitting,
}: SingleShotIncomeFormProps) {
  const [name, setName] = useState(income?.name ?? '')
  // Convert cents to reais for display/editing
  const [amount, setAmount] = useState(
    income?.amount ? (income.amount / 100).toFixed(2) : ''
  )
  const [date, setDate] = useState(
    income ? format(income.date, 'yyyy-MM-dd') : ''
  )
  const [certainty, setCertainty] = useState<'guaranteed' | 'probable' | 'uncertain'>(
    income?.certainty ?? 'probable'
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      type: 'single_shot' as const,
      name: name.trim(),
      // Convert reais to cents for storage
      amount: Math.round((parseFloat(amount) || 0) * 100),
      // Parse date consistently using date-fns to avoid timezone issues
      date: date ? parse(date, 'yyyy-MM-dd', startOfDay(new Date())) : startOfDay(new Date()),
      certainty,
    }

    const result = SingleShotIncomeInputSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])
        )
      )
      return
    }

    await onSubmit({
      name: result.data.name,
      amount: result.data.amount,
      date: result.data.date,
      certainty: result.data.certainty,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome da Receita</Label>
        <Input
          id="name"
          type="text"
          placeholder="ex: Restituição IR 2025"
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
          <Label htmlFor="amount">Valor</Label>
          <CurrencyInput
            id="amount"
            value={amount}
            onChange={setAmount}
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
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isSubmitting}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'date-error' : undefined}
          />
          {errors.date && (
            <p id="date-error" className="text-sm text-destructive">
              {errors.date}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="certainty">Certeza</Label>
        <Select
          value={certainty}
          onValueChange={(value) => setCertainty(value as typeof certainty)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="certainty" aria-invalid={!!errors.certainty}>
            <SelectValue placeholder="Selecione a certeza" />
          </SelectTrigger>
          <SelectContent>
            {CERTAINTY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.certainty && (
          <p id="certainty-error" className="text-sm text-destructive">
            {errors.certainty}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Receitas garantidas aparecem em ambos os cenários. Prováveis e incertas apenas no otimista.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : income ? 'Atualizar' : 'Adicionar Receita'}
        </Button>
      </div>
    </form>
  )
}

