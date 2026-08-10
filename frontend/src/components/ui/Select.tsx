import { useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  options: SelectOption[]
  /** Renders the label above the control, or visually hides it for dense filter bars. */
  hideLabel?: boolean
}

export function Select({
  label,
  options,
  hideLabel = false,
  className,
  id,
  ...rest
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={selectId}
          className={cn(
            'text-ink-primary mb-1.5 block text-sm font-medium',
            hideLabel && 'sr-only',
          )}
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'bg-surface text-ink-primary h-10 w-full appearance-none rounded-lg pr-9 pl-3 text-sm',
            'ring-hairline ring-1 ring-inset transition-shadow duration-150',
            'focus:ring-brand-500 focus:outline-none focus:ring-2',
            className,
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="text-ink-muted pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
