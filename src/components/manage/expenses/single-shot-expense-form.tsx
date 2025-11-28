import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SingleShotExpenseInputSchema, type SingleShotExpense } from '@/types'

interface SingleShotExpenseFormProps {
  expense?: SingleShotExpense
  onSubmit: (data: { name: string; amount: number; date: Date }) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function SingleShotExpenseForm({
  expense,
  onSubmit,
  onCancel,
  isSubmitting,
}: SingleShotExpenseFormProps) {
  const [name, setName] = useState(expense?.name ?? '')
  // Convert cents to reais for display/editing
  const [amount, setAmount] = useState(
    expense?.amount ? (expense.amount / 100).toFixed(2) : ''
  )
  const [date, setDate] = useState(
    expense ? format(expense.date, 'yyyy-MM-dd') : ''
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
      date: date ? new Date(`${date}T00:00:00`) : new Date(),
    }

    const result = SingleShotExpenseInputSchema.safeParse(formData)
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
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome da Despesa</Label>
        <Input
          id="name"
          type="text"
          placeholder="ex: IPVA 2025"
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
          <Input
            id="amount"
            type="number"
            placeholder="0,00"
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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : expense ? 'Atualizar' : 'Adicionar Despesa'}
        </Button>
      </div>
    </form>
  )
}

