/**
 * Dialog for saving the current projection as a snapshot.
 * Pre-fills name with current date in Portuguese format.
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SnapshotInputSchema } from '@/types/snapshot'

interface SaveSnapshotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => Promise<{ success: boolean; error?: string }>
  isLoading?: boolean
}

/**
 * Generate default snapshot name with current date in Portuguese format.
 * Example: "3 de dezembro de 2025"
 */
function getDefaultSnapshotName(): string {
  return format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function SaveSnapshotDialog({
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: SaveSnapshotDialogProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(getDefaultSnapshotName())
      setError(null)
    }
  }, [open])

  const handleSave = async () => {
    // Validate with Zod schema
    const result = SnapshotInputSchema.safeParse({ name: name.trim() })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Nome inválido')
      return
    }

    setIsSaving(true)
    setError(null)

    const saveResult = await onSave(name.trim())

    setIsSaving(false)

    if (saveResult.success) {
      onOpenChange(false)
    } else {
      setError(saveResult.error ?? 'Erro ao salvar snapshot')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving && !isLoading) {
      e.preventDefault()
      handleSave()
    }
  }

  const loading = isSaving || isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Snapshot</DialogTitle>
          <DialogDescription>
            Salve o estado atual da sua projeção para consultar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="snapshot-name">Nome do snapshot</Label>
            <Input
              id="snapshot-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Dezembro 2025"
              disabled={loading}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

