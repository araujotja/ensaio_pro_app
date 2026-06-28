import { Crown, Music, ClipboardList } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Área de Líderes' }

export default async function LeadersPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Área de Líderes</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center py-8 opacity-60">
          <Crown className="mx-auto h-8 w-8 text-stone-400 mb-2" />
          <p className="font-medium text-stone-700">Spalla</p>
          <p className="text-xs text-stone-400 mt-1">Em construção</p>
        </div>
        <div className="card text-center py-8 opacity-60">
          <Music className="mx-auto h-8 w-8 text-stone-400 mb-2" />
          <p className="font-medium text-stone-700">Líderes de Naipe</p>
          <p className="text-xs text-stone-400 mt-1">Em construção</p>
        </div>
        <div className="card text-center py-8 opacity-60">
          <ClipboardList className="mx-auto h-8 w-8 text-stone-400 mb-2" />
          <p className="font-medium text-stone-700">Checklist</p>
          <p className="text-xs text-stone-400 mt-1">Em construção</p>
        </div>
      </div>
    </div>
  )
}
