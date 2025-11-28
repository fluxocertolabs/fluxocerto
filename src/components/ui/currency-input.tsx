import { useState, useEffect, useRef, forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  /** Value in reais (e.g., "1234.56") */
  value: string
  /** Called with value in reais as string */
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Convert a reais string value to cents string without floating-point errors.
 * "1234.56" -> "123456"
 * "1234.5" -> "123450"
 * "1234" -> "123400"
 */
function reaisToCentsString(value: string): string {
  if (!value) return ''
  
  // Split on decimal point
  const parts = value.split('.')
  const integerPart = parts[0] || '0'
  let fractionalPart = parts[1] || '00'
  
  // Pad or truncate fractional part to exactly 2 digits
  fractionalPart = fractionalPart.padEnd(2, '0').slice(0, 2)
  
  // Combine as cents (integer string, no floating point)
  const cents = integerPart + fractionalPart
  
  // Remove leading zeros but keep at least one digit
  return cents.replace(/^0+/, '') || '0'
}

/**
 * Format a cents string to Brazilian currency format (1.234,56)
 */
function formatToBRL(centsString: string): string {
  const digits = centsString.replace(/\D/g, '')
  
  if (!digits) return ''
  
  // Pad with zeros if needed (minimum 3 digits for 0,01)
  const paddedDigits = digits.padStart(3, '0')
  
  // Split into reais and cents
  const cents = paddedDigits.slice(-2)
  const reais = paddedDigits.slice(0, -2).replace(/^0+/, '') || '0'
  
  // Add thousand separators
  const formattedReais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `${formattedReais},${cents}`
}

/**
 * Parse a BRL formatted string back to a decimal number string
 */
function parseBRL(formatted: string): string {
  const cleaned = formatted.replace(/R\$\s?/g, '').trim()
  
  if (!cleaned) return ''
  
  // Remove thousand separators and replace comma with dot
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  
  const num = parseFloat(normalized)
  return isNaN(num) ? '' : num.toFixed(2)
}

/**
 * Currency input component with R$ mask and Brazilian format.
 * Displays values in format: R$ 1.234,56
 * Stores values as decimal strings: "1234.56"
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      value,
      onChange,
      placeholder = 'R$ 0,00',
      disabled,
      className,
      id,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
    },
    ref
  ) {
    // Internal display value with formatting
    const [displayValue, setDisplayValue] = useState(() => {
      if (!value) return ''
      const centsString = reaisToCentsString(value)
      return formatToBRL(centsString)
    })
    
    const inputRef = useRef<HTMLInputElement>(null)

    // Sync display value when external value changes
    useEffect(() => {
      if (!value) {
        setDisplayValue('')
        return
      }
      const centsString = reaisToCentsString(value)
      const formatted = formatToBRL(centsString)
      setDisplayValue(formatted)
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      
      // Remove R$ prefix if user somehow typed it
      const cleanedInput = rawValue.replace(/R\$\s?/g, '')
      
      // Extract only digits
      const digits = cleanedInput.replace(/\D/g, '')
      
      if (!digits) {
        setDisplayValue('')
        onChange('')
        return
      }
      
      // Format the display value
      const formatted = formatToBRL(digits)
      
      setDisplayValue(formatted)
      
      // Convert to decimal string for the parent
      const decimalValue = parseBRL(formatted)
      onChange(decimalValue)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easy replacement
      e.target.select()
    }

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          R$
        </span>
        <Input
          ref={(node) => {
            // Handle both refs
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
            if (typeof ref === 'function') {
              ref(node)
            } else if (ref) {
              ref.current = node
            }
          }}
          type="text"
          inputMode="numeric"
          id={id}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder.replace('R$ ', '')}
          disabled={disabled}
          className={cn('pl-10', className)}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
      </div>
    )
  }
)
