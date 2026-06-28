'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log only the digest (server-assigned ID) to avoid leaking stack traces to the browser console
    if (error.digest) {
      console.error('[error boundary] digest:', error.digest)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-stone-900">Algo deu errado</h1>
        <p className="text-sm text-stone-500">
          Ocorreu um erro inesperado. Você pode tentar novamente ou voltar para o início.
        </p>
        {error.digest && (
          <p className="text-xs text-stone-400 font-mono">Código: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button onClick={reset} className="btn-primary">
            Tentar novamente
          </button>
          <Link href="/app" className="btn-secondary">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
