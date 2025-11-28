import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FixedExpenseInputSchema, type FixedExpense, type FixedExpenseInput } from '@/types'

interface ExpenseFormProps {
  expense?: FixedExpense
  onSubmit: (data: FixedExpenseInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function ExpenseForm({
  expense,
  onSubmit,
  onCancel,
  isSubmitting,
}: ExpenseFormProps) {
  const [name, setName] = useState(expense?.name ?? '')
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [dueDay, setDueDay] = useState(expense?.dueDay?.toString() ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      type: 'fixed' as const,
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      dueDay: parseInt(dueDay, 10) || 0,
      isActive: expense?.isActive ?? true,
    }

    const result = FixedExpenseInputSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])
        )
      )
      return
    }

    await onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome da Despesa</Label>
        <Input
          id="name"
          type="text"
          placeholder="ex: Aluguel"
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
          <Label htmlFor="dueDay">Dia de Vencimento</Label>
          <Input
            id="dueDay"
            type="number"
            placeholder="1-31"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            min="1"
            max="31"
            disabled={isSubmitting}
            aria-invalid={!!errors.dueDay}
            aria-describedby={errors.dueDay ? 'dueDay-error' : undefined}
          />
          {errors.dueDay && (
            <p id="dueDay-error" className="text-sm text-destructive">
              {errors.dueDay}
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

