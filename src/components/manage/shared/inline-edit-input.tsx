import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InlineEditInputProps {
  value: number
  onSave: (value: number) => Promise<void>
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
  const [editValue, setEditValue] = useState(value.toString())
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
      setEditValue(value.toString())
    }
  }, [value, isEditing])

  const handleSave = async () => {
    const numValue = parseFloat(editValue)
    if (isNaN(numValue) || numValue < min) {
      // Revert to original value on invalid input
      setEditValue(value.toString())
      setIsEditing(false)
      return
    }

    if (numValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(numValue)
      setIsEditing(false)
    } catch {
      // Revert on error
      setEditValue(value.toString())
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value.toString())
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

