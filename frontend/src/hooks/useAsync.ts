import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/services'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Re-runs the request, keeping the previous data visible while it loads. */
  reload: () => void
}

/**
 * Runs an async loader and exposes the loading/error/data triad every
 * API-dependent screen needs. The loader receives an AbortSignal so an
 * in-flight request is cancelled when inputs change or the component unmounts.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setLoading(true)
    setError(null)

    loaderRef
      .current(controller.signal)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((cause: unknown) => {
        // A cancelled request is not a failure the user should see.
        if (controller.signal.aborted || !active) return
        setError(errorMessage(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload }
}
