import { useCallback, useRef, useState, type DragEvent } from 'react'
import { FileSpreadsheet, UploadCloud } from 'lucide-react'
import { ACCEPTED_EXTENSIONS } from '@/services/statementService'
import { cn } from '@/utils/cn'

export interface DropzoneProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function Dropzone({ onFileSelected, disabled = false }: DropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // dragenter/dragleave fire for child elements too; count depth so the
  // highlight doesn't flicker as the pointer crosses the inner icon.
  const dragDepth = useRef(0)

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (disabled) return

    const file = event.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        if (!disabled) setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current -= 1
        if (dragDepth.current <= 0) setDragging(false)
      }}
      onDrop={handleDrop}
      className={cn(
        'rounded-[--radius-card] border-2 border-dashed p-8 text-center transition-colors duration-200 sm:p-12',
        dragging
          ? 'border-brand-500 bg-brand-50'
          : 'border-[color:var(--color-grid)] bg-surface',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelected(file)
          // Reset so picking the same file twice still fires a change event.
          event.target.value = ''
        }}
      />

      <div
        className={cn(
          'mx-auto flex size-12 items-center justify-center rounded-full transition-colors',
          dragging ? 'bg-brand-100 text-brand-700' : 'bg-canvas text-ink-muted',
        )}
        aria-hidden="true"
      >
        {dragging ? (
          <FileSpreadsheet className="size-5" />
        ) : (
          <UploadCloud className="size-5" />
        )}
      </div>

      <p className="text-ink-primary mt-4 text-sm font-medium">
        {dragging ? 'Drop your statement to upload' : 'Drag and drop your statement here'}
      </p>
      <p className="text-ink-secondary mt-1 text-sm">
        or{' '}
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline disabled:no-underline"
        >
          browse your files
        </button>
      </p>
      <p className="text-ink-muted mt-4 text-xs">
        .csv or .xlsx · up to 5 MB · must include an Amount column
      </p>
    </div>
  )
}
