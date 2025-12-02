/**
 * InlineEditInput Component Tests
 *
 * Tests for the inline currency editor component.
 * Covers rendering, masking behavior, save/cancel actions, and error handling.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineEditInput } from './inline-edit-input'
import { formatCurrencyWithCents } from '@/lib/format'

// =============================================================================
// TEST SETUP
// =============================================================================

const defaultProps = {
  value: 100000, // R$ 1.000,00
  onSave: vi.fn().mockResolvedValue(undefined),
  formatDisplay: formatCurrencyWithCents,
}

function renderComponent(props = {}) {
  return render(<InlineEditInput {...defaultProps} {...props} />)
}

// =============================================================================
// RENDERING TESTS
// =============================================================================

describe('InlineEditInput - Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders display value when not editing', () => {
    renderComponent()

    // Should show formatted value as button
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText(/1\.000,00/)).toBeInTheDocument()
  })

  it('renders with zero value', () => {
    renderComponent({ value: 0 })

    expect(screen.getByText(/0,00/)).toBeInTheDocument()
  })

  it('renders with large value', () => {
    renderComponent({ value: 123456789 }) // R$ 1.234.567,89

    expect(screen.getByText(/1\.234\.567,89/)).toBeInTheDocument()
  })

  it('renders with custom formatDisplay function', () => {
    const customFormat = (cents: number) => `Custom: ${cents}`
    renderComponent({ formatDisplay: customFormat })

    expect(screen.getByText('Custom: 100000')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    renderComponent()

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('Edit value'))
  })
})

// =============================================================================
// EDIT MODE TESTS
// =============================================================================

describe('InlineEditInput - Edit Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enters edit mode on click', async () => {
    renderComponent()

    const button = screen.getByRole('button')
    await userEvent.click(button)

    // Should show input field
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    // Should show R$ prefix
    expect(screen.getByText('R$')).toBeInTheDocument()
  })

  it('enters edit mode on Enter key', async () => {
    renderComponent()

    const button = screen.getByRole('button')
    fireEvent.keyDown(button, { key: 'Enter' })

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('enters edit mode on Space key', async () => {
    renderComponent()

    const button = screen.getByRole('button')
    fireEvent.keyDown(button, { key: ' ' })

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('focuses input when entering edit mode', async () => {
    renderComponent()

    await userEvent.click(screen.getByRole('button'))

    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
  })

  it('shows initial value in edit mode', async () => {
    renderComponent({ value: 123456 }) // R$ 1.234,56

    await userEvent.click(screen.getByRole('button'))

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('1.234,56')
  })
})

// =============================================================================
// INPUT MASKING TESTS
// =============================================================================

describe('InlineEditInput - Input Masking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats input as BRL currency', async () => {
    renderComponent({ value: 0 })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    // Clear and type new value
    await userEvent.clear(input)
    await userEvent.type(input, '100')

    // Should format as R$ 1,00
    expect(input).toHaveValue('1,00')
  })

  it('handles typing sequence correctly', async () => {
    renderComponent({ value: 0 })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)

    // Type "1" -> "0,01"
    await userEvent.type(input, '1')
    expect(input).toHaveValue('0,01')

    // Type "2" -> "0,12"
    await userEvent.type(input, '2')
    expect(input).toHaveValue('0,12')

    // Type "3" -> "1,23"
    await userEvent.type(input, '3')
    expect(input).toHaveValue('1,23')
  })

  it('formats thousands with dot separator', async () => {
    renderComponent({ value: 0 })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '123456')

    // Should format as 1.234,56
    expect(input).toHaveValue('1.234,56')
  })

  it('strips non-numeric characters', async () => {
    renderComponent({ value: 0 })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, 'abc123def')

    // Should only keep digits and format
    expect(input).toHaveValue('1,23')
  })

  it('handles empty input', async () => {
    renderComponent()

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)

    expect(input).toHaveValue('')
  })
})

// =============================================================================
// SAVE ACTION TESTS
// =============================================================================

describe('InlineEditInput - Save Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves on Enter key', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderComponent({ value: 100000, onSave })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '200000') // R$ 2.000,00

    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(200000)
    })
  })

  it('saves on blur', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderComponent({ value: 100000, onSave })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '150000') // R$ 1.500,00

    fireEvent.blur(input)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(150000)
    })
  })

  it('does not call onSave if value unchanged', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderComponent({ value: 100000, onSave })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    // Value is already 1.000,00 - don't change it
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  it('exits edit mode after successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderComponent({ value: 100000, onSave })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '200000')

    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})

// =============================================================================
// CANCEL ACTION TESTS
// =============================================================================

describe('InlineEditInput - Cancel Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cancels on Escape key', async () => {
    const onSave = vi.fn()
    renderComponent({ value: 100000, onSave })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '999999')

    fireEvent.keyDown(input, { key: 'Escape' })

    // Should not save
    expect(onSave).not.toHaveBeenCalled()

    // Should exit edit mode
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('reverts to original value on cancel', async () => {
    renderComponent({ value: 100000 }) // R$ 1.000,00

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '999999')

    fireEvent.keyDown(input, { key: 'Escape' })

    // Should show original value
    expect(screen.getByText(/1\.000,00/)).toBeInTheDocument()
  })
})

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('InlineEditInput - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reverts to original value on save error', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'))
    renderComponent({ value: 100000, onSave })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '200000')

    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      // Should revert to original value
      expect(screen.getByRole('textbox')).toHaveValue('1.000,00')
    })
  })

  it('reverts on min value violation', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderComponent({ value: 100000, onSave, min: 100 }) // min R$ 100,00

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '5000') // R$ 50,00 - below min

    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      // Should not save and should exit edit mode
      expect(onSave).not.toHaveBeenCalled()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })
})

// =============================================================================
// VALUE UPDATE TESTS
// =============================================================================

describe('InlineEditInput - External Value Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates display when value prop changes', () => {
    const { rerender } = render(
      <InlineEditInput {...defaultProps} value={100000} />
    )

    expect(screen.getByText(/1\.000,00/)).toBeInTheDocument()

    rerender(<InlineEditInput {...defaultProps} value={200000} />)

    expect(screen.getByText(/2\.000,00/)).toBeInTheDocument()
  })

  it('does not update input during editing when value prop changes', async () => {
    const { rerender } = render(
      <InlineEditInput {...defaultProps} value={100000} />
    )

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    // User is editing
    await userEvent.clear(input)
    await userEvent.type(input, '150000')

    // External value changes
    rerender(<InlineEditInput {...defaultProps} value={200000} />)

    // Input should still show user's input, not the new prop value
    expect(input).toHaveValue('1.500,00')
  })
})

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

describe('InlineEditInput - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has accessible input label in edit mode', async () => {
    renderComponent()

    await userEvent.click(screen.getByRole('button'))

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-label', 'Enter new value')
  })

  it('uses numeric input mode', async () => {
    renderComponent()

    await userEvent.click(screen.getByRole('button'))

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('inputMode', 'numeric')
  })

  it('disables input while saving', async () => {
    // Create a promise that we can control
    let resolvePromise: () => void
    const savePromise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })
    const onSave = vi.fn().mockReturnValue(savePromise)
    
    renderComponent({ value: 100000, onSave })

    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')

    await userEvent.clear(input)
    await userEvent.type(input, '200000')

    fireEvent.keyDown(input, { key: 'Enter' })

    // Input should be disabled while saving
    await waitFor(() => {
      expect(input).toBeDisabled()
    })

    // Resolve the save
    resolvePromise!()

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })
})

