/**
 * Projection period selector dropdown
 * Allows users to select projection periods (7/14/30/60/90 days)
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProjectionDays } from '@/types'

interface ProjectionSelectorProps {
  /** Currently selected projection period */
  value: ProjectionDays
  /** Callback when selection changes */
  onChange: (days: ProjectionDays) => void
  /** Whether the selector is disabled */
  disabled?: boolean
}

const options: { value: ProjectionDays; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
]

export function ProjectionSelector({
  value,
  onChange,
  disabled = false,
}: ProjectionSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="projection-selector"
        className="text-sm text-muted-foreground whitespace-nowrap"
      >
        Projection:
      </label>
      <Select
        value={value.toString()}
        onValueChange={(v) => onChange(parseInt(v, 10) as ProjectionDays)}
        disabled={disabled}
      >
        <SelectTrigger id="projection-selector" className="w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

