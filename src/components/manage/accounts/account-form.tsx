import { useState } from 'react'
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
import { BankAccountInputSchema, type BankAccount, type BankAccountInput } from '@/types'

interface AccountFormProps {
  account?: BankAccount
  onSubmit: (data: BankAccountInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

type AccountType = 'checking' | 'savings' | 'investment'

export function AccountForm({
  account,
  onSubmit,
  onCancel,
  isSubmitting,
}: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking')
  // Convert cents to reais for display/editing
  const [balance, setBalance] = useState(
    account?.balance ? (account.balance / 100).toFixed(2) : ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      name: name.trim(),
      type,
      // Convert reais to cents for storage
      balance: Math.round((parseFloat(balance) || 0) * 100),
    }

    const result = BankAccountInputSchema.safeParse(formData)
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
        <Label htmlFor="name">Nome da Conta</Label>
        <Input
          id="name"
          type="text"
          placeholder="ex: Conta Corrente Principal"
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
        <Label htmlFor="type">Tipo de Conta</Label>
        <Select
          value={type}
          onValueChange={(value) => setType(value as AccountType)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="type" aria-invalid={!!errors.type}>
            <SelectValue placeholder="Selecione o tipo de conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checking">Conta Corrente</SelectItem>
            <SelectItem value="savings">Poupança</SelectItem>
            <SelectItem value="investment">Investimento</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="balance">Saldo Atual</Label>
        <Input
          id="balance"
          type="number"
          placeholder="0,00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          min="0"
          step="0.01"
          disabled={isSubmitting}
          aria-invalid={!!errors.balance}
          aria-describedby={errors.balance ? 'balance-error' : undefined}
        />
        {errors.balance && (
          <p id="balance-error" className="text-sm text-destructive">
            {errors.balance}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : account ? 'Atualizar' : 'Adicionar Conta'}
        </Button>
      </div>
    </form>
  )
}

