import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InlineEditInputProps {
  /** Value in cents */
  value: number
  /** Called with value in cents */
  onSave: (value: number) => Promise<void>
  /** Format function receives value in cents */
  formatDisplay: (value: number) => string
  min?: number
  step?: number
  className?: string
}

export function InlineEditInput({
  value,
  onSave,
  formatDisplay,
  min = 0,
  step = 0.01,
  className,
}: InlineEditInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  // Convert cents to reais for editing
  const [editValue, setEditValue] = useState((value / 100).toFixed(2))
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Update editValue when external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue((value / 100).toFixed(2))
    }
  }, [value, isEditing])

  const handleSave = async () => {
    const numValueInReais = parseFloat(editValue)
    if (isNaN(numValueInReais) || numValueInReais < min) {
      // Revert to original value on invalid input
      setEditValue((value / 100).toFixed(2))
      setIsEditing(false)
      return
    }

    // Convert reais to cents for comparison and saving
    const numValueInCents = Math.round(numValueInReais * 100)
    if (numValueInCents === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(numValueInCents)
      setIsEditing(false)
    } catch {
      // Revert on error
      setEditValue((value / 100).toFixed(2))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue((value / 100).toFixed(2))
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsEditing(true)
          }
        }}
        className={cn(
          'cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          className
        )}
        aria-label={`Edit value: ${formatDisplay(value)}`}
      >
        {formatDisplay(value)}
      </button>
    )
  }

  return (
    <Input
      ref={inputRef}
      type="number"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      min={min}
      step={step}
      disabled={isSaving}
      className={cn('w-28 h-8 text-right', className)}
      aria-label="Enter new value"
    />
  )
}

