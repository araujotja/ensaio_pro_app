import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGroupById } from '@/lib/db/groups'
import { getRepertoireByGroup } from '@/lib/db/repertoire'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>
}): Promise<Metadata> {
  return { title: 'Repertório' }
}

export default async function RepertoirePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [group, pieces] = await Promise.all([
    getGroupById(groupId),
    getRepertoireByGroup(groupId),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Repertório</h1>
          <p className="text-sm text-stone-500 mt-0.5">{group.name}</p>
        </div>
        <Link href={`/app/groups/${groupId}/repertoire/new`} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nova peça
        </Link>
      </div>

      {pieces.length === 0 ? (
        <div className="card text-center py-12">
          <Music className="mx-auto h-10 w-10 text-stone-300 mb-3" />
          <p className="text-stone-500 mb-4">Nenhuma peça no repertório ainda.</p>
          <Link href={`/app/groups/${groupId}/repertoire/new`} className="btn-primary">
            <Plus className="h-4 w-4" />
            Adicionar primeira peça
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {pieces.map((piece) => (
            <Link
              key={piece.id}
              href={`/app/groups/${groupId}/repertoire/${piece.id}`}
              className="card hover:border-amber-200 hover:shadow-md transition-all block"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold text-stone-900 truncate">{piece.title}</h2>
                  {piece.composer && (
                    <p className="text-sm text-stone-500 mt-0.5">{piece.composer}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {piece.music_key && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {piece.music_key}
                    </span>
                  )}
                  {piece.tempo_bpm && (
                    <span className="text-xs text-stone-400">{piece.tempo_bpm} bpm</span>
                  )}
                </div>
              </div>
              {piece.performance_date && (
                <p className="mt-2 text-xs text-stone-400">
                  Apresentação:{' '}
                  {new Date(piece.performance_date).toLocaleDateString('pt-BR')}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
