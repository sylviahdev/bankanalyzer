import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  /** Solid white on a dark surface. */
  | 'inverse'
  /** Outlined white on a dark surface. */
  | 'inverseOutline'
type Size = 'sm' | 'md' | 'lg'

/*
 * Colours live here rather than being overridden through `className`: two
 * competing utilities (e.g. `text-white` from a variant and `text-brand-800`
 * from a caller) resolve by stylesheet order, not by prop order, so the
 * override silently loses. Anything that needs different colours gets a variant.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm shadow-brand-900/10',
  secondary:
    'bg-surface text-ink-primary ring-1 ring-hairline hover:bg-canvas active:bg-canvas',
  ghost: 'text-ink-secondary hover:bg-canvas hover:text-ink-primary',
  danger: 'bg-negative text-white hover:brightness-95 active:brightness-90',
  inverse: 'bg-white text-brand-800 hover:bg-white/90 active:bg-white/80 shadow-sm',
  inverseOutline:
    'bg-transparent text-white ring-1 ring-white/35 hover:bg-white/10 active:bg-white/15',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      // Keep the button focusable while busy so the spinner stays announced.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
