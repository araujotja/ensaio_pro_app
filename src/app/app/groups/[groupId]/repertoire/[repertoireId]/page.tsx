import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Music, Clock, Calendar, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getRepertoireById } from '@/lib/db/repertoire'
import { getMembershipForGroup } from '@/lib/db/groups'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string; repertoireId: string }>
}): Promise<Metadata> {
  const { repertoireId } = await params
  try {
    const piece = await getRepertoireById(repertoireId)
    return { title: (piece as any).title ?? 'Peça' }
  } catch {
    return { title: 'Repertório' }
  }
}

export default async function RepertoireDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; repertoireId: string }>
}) {
  const { groupId, repertoireId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const membership = await getMembershipForGroup(groupId)
  if (!membership) notFound()

  let piece: Awaited<ReturnType<typeof getRepertoireById>>
  try {
    piece = await getRepertoireById(repertoireId)
  } catch {
    notFound()
  }

  const sections = (piece as any).section ?? []
  const tracks = (piece as any).track ?? []

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app/groups/${groupId}/repertoire`}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao repertório
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{(piece as any).title}</h1>
            {(piece as any).composer && (
              <p className="text-sm text-stone-500 mt-0.5">{(piece as any).composer}</p>
            )}
          </div>
          {(piece as any).music_key && (
            <span className="flex-shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
              {(piece as any).music_key}
            </span>
          )}
        </div>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-3">
        {(piece as any).tempo_bpm && (
          <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
            <Clock className="h-3.5 w-3.5" />
            {(piece as any).tempo_bpm} bpm
          </div>
        )}
        {(piece as any).performance_date && (
          <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
            <Calendar className="h-3.5 w-3.5" />
            {new Date((piece as any).performance_date).toLocaleDateString('pt-BR')}
          </div>
        )}
        {(piece as any).links?.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
            <Music className="h-3.5 w-3.5" />
            {(piece as any).links.length} link(s)
          </div>
        )}
      </div>

      {/* Notes */}
      {(piece as any).notes && (
        <div className="card space-y-1">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-4 w-4 text-stone-400" />
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Notas</p>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
            {(piece as any).notes}
          </p>
        </div>
      )}

      {/* Reference links */}
      {(piece as any).links?.length > 0 && (
        <div className="card space-y-2">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Links de referência
          </p>
          <ul className="space-y-1">
            {((piece as any).links as string[]).map((link, i) => {
              let safe = false
              try {
                const p = new URL(link).protocol
                safe = p === 'https:' || p === 'http:'
              } catch {}
              return safe ? (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-600 hover:underline break-all"
                  >
                    {link}
                  </a>
                </li>
              ) : null
            })}
          </ul>
        </div>
      )}

      {/* Sections */}
      {sections.length > 0 && (
        <div className="card space-y-2">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Seções</p>
          <div className="divide-y divide-stone-100">
            {sections.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2">
                <p className="text-sm font-medium text-stone-800">{s.name}</p>
                {(s.measure_start != null || s.measure_end != null) && (
                  <span className="text-xs text-stone-400">
                    {s.measure_start != null ? `c. ${s.measure_start}` : ''}
                    {s.measure_start != null && s.measure_end != null ? '–' : ''}
                    {s.measure_end != null ? s.measure_end : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracks placeholder */}
      {tracks.length > 0 && (
        <div className="card space-y-2">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Faixas</p>
          <div className="divide-y divide-stone-100">
            {tracks.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2">
                <p className="text-sm text-stone-800">{t.label}</p>
                <span className="text-xs text-stone-400">#{t.ordering}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for new pieces */}
      {sections.length === 0 && tracks.length === 0 && !(piece as any).notes && (
        <div className="card text-center py-8 text-stone-400">
          <Music className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Nenhum detalhe adicional cadastrado.</p>
        </div>
      )}
    </div>
  )
}
