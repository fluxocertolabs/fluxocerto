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
  className?: string
}

/**
 * Format a number string to Brazilian currency format (1.234,56)
 */
function formatToBRL(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  
  const paddedDigits = digits.padStart(3, '0')
  const cents = paddedDigits.slice(-2)
  const reais = paddedDigits.slice(0, -2).replace(/^0+/, '') || '0'
  const formattedReais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `${formattedReais},${cents}`
}

/**
 * Parse a BRL formatted string back to cents
 */
function parseBRLToCents(formatted: string): number {
  const cleaned = formatted.replace(/R\$\s?/g, '').trim()
  if (!cleaned) return 0
  
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? 0 : Math.round(num * 100)
}

export function InlineEditInput({
  value,
  onSave,
  formatDisplay,
  min = 0,
  className,
}: InlineEditInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  // Display value with BRL formatting
  const [displayValue, setDisplayValue] = useState(() => {
    const centsString = value.toString()
    return formatToBRL(centsString)
  })
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Update displayValue when external value changes
  useEffect(() => {
    if (!isEditing) {
      const centsString = value.toString()
      setDisplayValue(formatToBRL(centsString))
    }
  }, [value, isEditing])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const cleanedInput = rawValue.replace(/R\$\s?/g, '')
    const digits = cleanedInput.replace(/\D/g, '')
    
    if (!digits) {
      setDisplayValue('')
      return
    }
    
    setDisplayValue(formatToBRL(digits))
  }

  const handleSave = async () => {
    const valueInCents = parseBRLToCents(displayValue)
    
    if (valueInCents < min * 100) {
      // Revert to original value on invalid input
      const centsString = value.toString()
      setDisplayValue(formatToBRL(centsString))
      setIsEditing(false)
      return
    }

    if (valueInCents === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(valueInCents)
      setIsEditing(false)
    } catch {
      // Revert on error
      const centsString = value.toString()
      setDisplayValue(formatToBRL(centsString))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    const centsString = value.toString()
    setDisplayValue(formatToBRL(centsString))
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
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
        R$
      </span>
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className={cn('w-32 h-8 pl-8 text-right', className)}
        aria-label="Enter new value"
      />
    </div>
  )
}
