import { api } from './client'
import type { AnalyzeResponse, Statement } from '@/types/api'

/** Mirrors ALLOWED_EXTENSIONS and MAX_CONTENT_LENGTH in the backend config. */
export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'] as const
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export interface UploadValidationResult {
  ok: boolean
  error?: string
}

/** Client-side pre-check so obvious mistakes never cost a round trip. The
 *  backend re-validates everything; this is convenience, not enforcement. */
export function validateFile(file: File): UploadValidationResult {
  const name = file.name.toLowerCase()
  const hasAllowedExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))

  if (!hasAllowedExt) {
    return { ok: false, error: 'Unsupported file type. Upload a .csv or .xlsx file.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'That file is larger than the 5 MB limit.' }
  }
  if (file.size === 0) {
    return { ok: false, error: 'That file is empty.' }
  }
  return { ok: true }
}

/**
 * POST /api/analyze (multipart). `onProgress` reports genuine XHR upload bytes —
 * it stops at 100% when the bytes are sent, after which the server is parsing
 * and no progress is reported (we show an indeterminate "analyzing" state
 * rather than inventing a percentage).
 */
export async function uploadStatement(
  file: File,
  options: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post<AnalyzeResponse>('/api/analyze', form, {
    signal: options.signal,
    onUploadProgress: (event) => {
      if (!options.onProgress || !event.total) return
      options.onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
  return data
}

/** GET /api/statements */
export async function listStatements(): Promise<Statement[]> {
  const { data } = await api.get<{ statements: Statement[] }>('/api/statements')
  return data.statements
}

/** DELETE /api/statements/:id */
export async function deleteStatement(id: number): Promise<void> {
  await api.delete(`/api/statements/${id}`)
}

/**
 * GET /api/download/:token — streams an .xlsx. Fetched as a blob through the
 * axios instance so the Authorization header is attached; a plain anchor href
 * would be unauthenticated.
 */
export async function downloadSummary(token: string, filename = 'summary.xlsx'): Promise<void> {
  const response = await api.get<Blob>(`/api/download/${token}`, { responseType: 'blob' })

  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
