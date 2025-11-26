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
import { ProjectInputSchema, type Project, type ProjectInput } from '@/types'

interface ProjectFormProps {
  project?: Project
  onSubmit: (data: ProjectInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

type Frequency = 'weekly' | 'biweekly' | 'monthly'
type Certainty = 'guaranteed' | 'probable' | 'uncertain'

export function ProjectForm({
  project,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? '')
  const [amount, setAmount] = useState(project?.amount?.toString() ?? '')
  const [paymentDay, setPaymentDay] = useState(project?.paymentDay?.toString() ?? '')
  const [frequency, setFrequency] = useState<Frequency>(project?.frequency ?? 'monthly')
  const [certainty, setCertainty] = useState<Certainty>(project?.certainty ?? 'guaranteed')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const formData = {
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      paymentDay: parseInt(paymentDay, 10) || 0,
      frequency,
      certainty,
      isActive: project?.isActive ?? true,
    }

    const result = ProjectInputSchema.safeParse(formData)
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
          <Label htmlFor="paymentDay">Payment Day</Label>
          <Input
            id="paymentDay"
            type="number"
            placeholder="1-31"
            value={paymentDay}
            onChange={(e) => setPaymentDay(e.target.value)}
            min="1"
            max="31"
            disabled={isSubmitting}
            aria-invalid={!!errors.paymentDay}
            aria-describedby={errors.paymentDay ? 'paymentDay-error' : undefined}
          />
          {errors.paymentDay && (
            <p id="paymentDay-error" className="text-sm text-destructive">
              {errors.paymentDay}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(value) => setFrequency(value as Frequency)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="frequency" aria-invalid={!!errors.frequency}>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Biweekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          {errors.frequency && (
            <p className="text-sm text-destructive">{errors.frequency}</p>
          )}
        </div>

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

