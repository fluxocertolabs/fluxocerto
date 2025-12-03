import { useState, useMemo } from 'react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import type { FutureStatement, FutureStatementInput } from '@/types'
import { getAvailableMonthOptions, isCurrentMonth } from '@/types'

interface FutureStatementFormProps {
  creditCardId: string
  existingStatements: FutureStatement[]
  editingStatement?: FutureStatement
  onSubmit: (input: FutureStatementInput) => Promise<void>
  onCancel: () => void
}

export function FutureStatementForm({
  creditCardId,
  existingStatements,
  editingStatement,
  onSubmit,
  onCancel,
}: FutureStatementFormProps) {
  const monthOptions = useMemo(() => getAvailableMonthOptions(), [])
  
  // Find the first available month that doesn't have a statement
  const defaultMonth = useMemo(() => {
    if (editingStatement) {
      return `${editingStatement.targetMonth}-${editingStatement.targetYear}`
    }
    
    for (const option of monthOptions) {
      const hasStatement = existingStatements.some(
        (s) =>
          s.targetMonth === option.value.month &&
          s.targetYear === option.value.year
      )
      if (!hasStatement) {
        return `${option.value.month}-${option.value.year}`
      }
    }
    
    // Fallback to first month if all are taken
    return `${monthOptions[0].value.month}-${monthOptions[0].value.year}`
  }, [monthOptions, existingStatements, editingStatement])

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [amount, setAmount] = useState(
    editingStatement ? (editingStatement.amount / 100).toFixed(2) : ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCurrentMonthWarning, setShowCurrentMonthWarning] = useState(false)

  const parsedMonth = useMemo(() => {
    const [month, year] = selectedMonth.split('-').map(Number)
    return { month, year }
  }, [selectedMonth])

  const isEditingCurrentMonth = isCurrentMonth(parsedMonth.month, parsedMonth.year)

  // Filter out months that already have statements (except the one being edited)
  const availableOptions = useMemo(() => {
    return monthOptions.filter((option) => {
      // Allow the current editing month
      if (
        editingStatement &&
        option.value.month === editingStatement.targetMonth &&
        option.value.year === editingStatement.targetYear
      ) {
        return true
      }
      
      // Filter out months that already have statements
      return !existingStatements.some(
        (s) =>
          s.targetMonth === option.value.month &&
          s.targetYear === option.value.year
      )
    })
  }, [monthOptions, existingStatements, editingStatement])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Normalize Brazilian decimal separator (comma) to dot for parsing
    const normalizedAmount = amount.replace(',', '.')
    const amountInCents = Math.round(parseFloat(normalizedAmount) * 100)
    if (isNaN(amountInCents) || amountInCents < 0) {
      return
    }

    // Show warning for current month
    if (isEditingCurrentMonth && !editingStatement) {
      setShowCurrentMonthWarning(true)
      return
    }

    await submitForm(amountInCents)
  }

  const submitForm = async (amountInCents: number) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        creditCardId,
        targetMonth: parsedMonth.month,
        targetYear: parsedMonth.year,
        amount: amountInCents,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmCurrentMonth = async () => {
    setShowCurrentMonthWarning(false)
    // Normalize Brazilian decimal separator (comma) to dot for parsing
    const normalizedAmount = amount.replace(',', '.')
    const amountInCents = Math.round(parseFloat(normalizedAmount) * 100)
    if (isNaN(amountInCents) || amountInCents < 0) {
      return
    }
    await submitForm(amountInCents)
  }

  const normalizedAmountForValidation = amount.replace(',', '.')
  const amountValue = parseFloat(normalizedAmountForValidation)
  const isValidAmount = !isNaN(amountValue) && amountValue >= 0

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="month">Mês</Label>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            disabled={!!editingStatement}
          >
            <SelectTrigger id="month">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem
                  key={`${option.value.month}-${option.value.year}`}
                  value={`${option.value.month}-${option.value.year}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor da Fatura</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R$
            </span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="pl-10"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor previsto para a fatura deste mês
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !isValidAmount}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingStatement ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={showCurrentMonthWarning}
        onOpenChange={setShowCurrentMonthWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sobrescrever fatura atual?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está adicionando uma fatura para o mês atual. Isso substituirá
              o valor da fatura atual do cartão. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCurrentMonth}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

