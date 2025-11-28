import { useState } from 'react'
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
import { CreditCardInputSchema, type CreditCard, type CreditCardInput, type Profile } from '@/types'

interface CreditCardFormProps {
  card?: CreditCard
  profiles: Profile[]
  onSubmit: (data: CreditCardInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function CreditCardForm({
  card,
  profiles,
  onSubmit,
  onCancel,
  isSubmitting,
}: CreditCardFormProps) {
  const [name, setName] = useState(card?.name ?? '')
  // Convert cents to reais for display/editing
  const [statementBalance, setStatementBalance] = useState(
    card?.statementBalance ? (card.statementBalance / 100).toFixed(2) : ''
  )
  const [dueDay, setDueDay] = useState(card?.dueDay?.toString() ?? '')
  const [ownerId, setOwnerId] = useState<string | null>(card?.owner?.id ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      name: name.trim(),
      // Convert reais to cents for storage
      statementBalance: Math.round((parseFloat(statementBalance) || 0) * 100),
      dueDay: parseInt(dueDay, 10) || 0,
      ownerId,
    }

    const result = CreditCardInputSchema.safeParse(formData)
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
        <Label htmlFor="name">Nome do Cartão</Label>
        <Input
          id="name"
          type="text"
          placeholder="ex: Nubank Platinum"
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

      <div className="grid gap-2">
        <Label htmlFor="owner">Proprietário</Label>
        <Select
          value={ownerId ?? 'unassigned'}
          onValueChange={(value) => setOwnerId(value === 'unassigned' ? null : value)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="owner">
            <SelectValue placeholder="Selecione o proprietário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Não atribuído</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="statementBalance">Saldo da Fatura</Label>
          <CurrencyInput
            id="statementBalance"
            value={statementBalance}
            onChange={setStatementBalance}
            disabled={isSubmitting}
            aria-invalid={!!errors.statementBalance}
            aria-describedby={errors.statementBalance ? 'statementBalance-error' : undefined}
          />
          {errors.statementBalance && (
            <p id="statementBalance-error" className="text-sm text-destructive">
              {errors.statementBalance}
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
          {isSubmitting ? 'Salvando...' : card ? 'Atualizar' : 'Adicionar Cartão'}
        </Button>
      </div>
    </form>
  )
}

