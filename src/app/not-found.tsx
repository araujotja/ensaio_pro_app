import Link from 'next/link'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-stone-100 p-4">
            <SearchX className="h-8 w-8 text-stone-400" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-stone-900">Página não encontrada</h1>
        <p className="text-sm text-stone-500">
          O endereço que você tentou acessar não existe ou foi removido.
        </p>
        <div className="pt-2">
          <Link href="/app" className="btn-primary">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
