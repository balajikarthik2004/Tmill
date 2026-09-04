import { useEffect, useRef, useState } from 'react'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | undefined
  status: AsyncStatus
  error: Error | undefined
  isLoading: boolean
  isError: boolean
}

/**
 * Runs an async fetcher whenever `deps` change, tracking loading/error state.
 * Guards against setting state after unmount or after a newer call has started.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: React.DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [status, setStatus] = useState<AsyncStatus>('loading')
  const [error, setError] = useState<Error>()
  const callId = useRef(0)

  useEffect(() => {
    const currentCall = ++callId.current
    setStatus('loading')
    setError(undefined)

    fetcher()
      .then((result) => {
        if (callId.current !== currentCall) return
        setData(result)
        setStatus('success')
      })
      .catch((err: unknown) => {
        if (callId.current !== currentCall) return
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setStatus('error')
      })

    return () => {
      callId.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, status, error, isLoading: status === 'loading', isError: status === 'error' }
}
