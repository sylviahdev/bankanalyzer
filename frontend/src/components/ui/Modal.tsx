import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** Marks the dialog as destructive: red accent on the icon slot. */
  tone?: 'default' | 'danger'
  icon?: ReactNode
  /** Blocks backdrop/Escape dismissal while a request is in flight. */
  busy?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = 'default',
  icon,
  busy = false,
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog so the keyboard lands somewhere sensible.
    const firstField = panelRef.current?.querySelector<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])',
    )
    firstField?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      // Focus trap: cycle within the dialog rather than escaping to the page.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [open, onClose, busy])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="animate-fade absolute inset-0 bg-black/45"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="bg-surface animate-rise relative w-full max-w-md rounded-[--radius-card] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
          className="text-ink-muted hover:text-ink-primary hover:bg-canvas absolute top-4 right-4 rounded-lg p-2 transition-colors disabled:opacity-40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        {icon ? (
          <div
            className={cn(
              'mb-4 flex size-10 items-center justify-center rounded-full',
              tone === 'danger' ? 'bg-[#fdeceb] text-[#a32c2c]' : 'bg-brand-50 text-brand-700',
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}

        <h2 id={titleId} className="text-ink-primary pr-8 text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <div id={descriptionId} className="text-ink-secondary mt-2 text-sm">
            {description}
          </div>
        ) : null}

        {children ? <div className="mt-5">{children}</div> : null}
        {footer ? <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </div>
  )
}
