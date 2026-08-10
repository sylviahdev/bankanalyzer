import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: ReactNode
  error?: string | null
  leadingIcon?: ReactNode
  trailingSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, trailingSlot, className, id, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="text-ink-primary mb-1.5 block text-sm font-medium">
          {label}
        </label>
      ) : null}

      <div className="relative">
        {leadingIcon ? (
          <span
            className="text-ink-muted pointer-events-none absolute inset-y-0 left-3 flex items-center"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'bg-surface text-ink-primary placeholder:text-ink-muted h-10 w-full rounded-lg',
            'ring-hairline ring-1 ring-inset transition-shadow duration-150',
            'focus:ring-brand-500 focus:outline-none focus:ring-2',
            'disabled:bg-canvas disabled:cursor-not-allowed',
            leadingIcon ? 'pl-9' : 'pl-3',
            trailingSlot ? 'pr-11' : 'pr-3',
            error && 'ring-negative focus:ring-negative ring-2',
            className,
          )}
          {...rest}
        />

        {trailingSlot ? (
          <span className="absolute inset-y-0 right-1 flex items-center">{trailingSlot}</span>
        ) : null}
      </div>

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-negative mt-1.5 text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-ink-secondary mt-1.5 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
