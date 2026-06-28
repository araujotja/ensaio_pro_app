import { redirect } from 'next/navigation'
import { Crown, Music, ClipboardList, CheckCircle2, Circle } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getGroupById, getNucleiByGroup } from '@/lib/db/groups'
import { getGroupReadiness } from '@/lib/db/tasks'
import { REVIEWER_ROLES } from '@/lib/constants'
import SpallaNotes from './SpallaNotes'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Área de Líderes' }

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

export default async function LeadersPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify user is a reviewer/leader
  const { data: membership } = await supabase
    .from('membership')
    .select('role, is_spalla')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  const userRole = membership?.role ?? ''
  if (!(REVIEWER_ROLES as readonly string[]).includes(userRole)) {
    redirect(`/app/groups/${groupId}/dashboard`)
  }

  const isSpalla = membership?.is_spalla || userRole === 'spalla'
  const isMaestroOrAdmin = ['admin_org', 'admin_grupo', 'maestro'].includes(userRole)
  const canEditSpallaNotes = isSpalla || isMaestroOrAdmin

  const service = createServiceClient()

  // Fetch all data in parallel
  const [group, nuclei, readiness] = await Promise.all([
    getGroupById(groupId),
    getNucleiByGroup(groupId).catch(() => []),
    getGroupReadiness(groupId).catch(() => ({ overall: 0, byNucleus: {} })),
  ])

  // Members with is_spalla=true or role=spalla
  const { data: allMembers } = await supabase
    .from('membership')
    .select('id, user_id, role, is_spalla, is_lider_naipe, nucleus_id')
    .eq('group_id', groupId)

  const spallaMembers = (allMembers ?? []).filter((m) => m.is_spalla || m.role === 'spalla')
  const naipeLeaders = (allMembers ?? []).filter((m) => m.is_lider_naipe || m.role === 'lider_naipe')

  // Fetch profiles for spalla + naipe leaders
  const profileIds = [...new Set([...spallaMembers, ...naipeLeaders].map((m) => m.user_id))]
  const { data: profiles } = profileIds.length > 0
    ? await supabase.from('profile').select('id, full_name').in('id', profileIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  // Spalla notes (development_track)
  const { data: spallaTrack } = spallaMembers.length > 0
    ? await service
        .from('development_track')
        .select('notes')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  // Pending tasks per nucleus
  const nucleusMap = new Map(nuclei.map((n) => [n.id, n]))

  const pendingByNucleus: Record<string, number> = {}
  if (nuclei.length > 0) {
    const { data: pendingTasks } = await supabase
      .from('task')
      .select('target_id')
      .eq('group_id', groupId)
      .eq('scope', 'nucleo')
      .in('status', ['pendente', 'reaberto'])

    for (const t of pendingTasks ?? []) {
      if (t.target_id) {
        pendingByNucleus[t.target_id] = (pendingByNucleus[t.target_id] ?? 0) + 1
      }
    }
  }

  // Checklist data
  const { count: taskCount } = await supabase
    .from('task')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  const { data: repertoires } = await supabase
    .from('repertoire')
    .select('id')
    .eq('group_id', groupId)

  const repertoireIds = (repertoires ?? []).map((r) => r.id)
  let hasParts = false
  if (repertoireIds.length > 0) {
    const { count: partCount } = await supabase
      .from('repertoire_part')
      .select('id', { count: 'exact', head: true })
      .in('repertoire_id', repertoireIds)
    hasParts = (partCount ?? 0) > 0
  }

  const overallPct = Math.round(readiness.overall * 100)

  const checklist = [
    {
      label: 'Partitura / áudio distribuído',
      done: hasParts,
      hint: hasParts ? undefined : 'Adicione partituras na aba Repertório',
    },
    {
      label: 'Tarefas criadas para os músicos',
      done: (taskCount ?? 0) > 0,
      hint: (taskCount ?? 0) > 0 ? `${taskCount} tarefa${taskCount === 1 ? '' : 's'}` : 'Nenhuma tarefa criada ainda',
    },
    {
      label: 'Prontidão geral acima de 80%',
      done: overallPct >= 80,
      hint: `${overallPct}% atual`,
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-stone-900">Área de Líderes</h1>
        <p className="text-sm text-stone-500 mt-0.5">{group.name}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Painel do Spalla ── */}
        <div className="card space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-stone-800">Painel do Spalla</h2>
          </div>

          {spallaMembers.length === 0 ? (
            <p className="text-sm text-stone-400">Nenhum spalla registrado neste grupo.</p>
          ) : (
            <div className="space-y-4">
              {spallaMembers.map((m) => {
                const profile = profileMap.get(m.user_id)
                const isMe = m.user_id === user.id
                return (
                  <div key={m.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-amber-700">
                          {initials(profile?.full_name)}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-stone-800">
                          {profile?.full_name ?? 'Spalla'}
                        </span>
                        {isMe && (
                          <span className="ml-2 text-xs text-stone-400">(você)</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                        Decisões musicais
                      </p>
                      <SpallaNotes
                        groupId={groupId}
                        initialNotes={isMe ? (spallaTrack?.notes ?? '') : ''}
                        canEdit={isMe || isMaestroOrAdmin}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Checklist pré-ensaio ── */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-stone-800">Checklist pré-ensaio</h2>
          </div>

          <ul className="space-y-3">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-start gap-2.5">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-stone-300 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-medium ${item.done ? 'text-stone-700' : 'text-stone-500'}`}>
                    {item.label}
                  </p>
                  {item.hint && (
                    <p className="text-xs text-stone-400 mt-0.5">{item.hint}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-stone-500">Prontidão geral</span>
              <span className={`font-semibold ${overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {overallPct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-stone-100">
              <div
                className={`h-2 rounded-full transition-all ${overallPct >= 80 ? 'bg-green-500' : overallPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Líderes de Naipe ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-semibold text-stone-800">Líderes de Naipe</h2>
        </div>

        {naipeLeaders.length === 0 ? (
          <p className="text-sm text-stone-400">
            Nenhum líder de naipe registrado. Marque o campo &ldquo;is_lider_naipe&rdquo; ao convidar músicos.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {naipeLeaders.map((m) => {
              const profile = profileMap.get(m.user_id)
              const nucleus = m.nucleus_id ? nucleusMap.get(m.nucleus_id) : null
              const nid = m.nucleus_id as string | null
              const pending = nid ? (pendingByNucleus[nid] ?? 0) : 0
              const nucleusReadiness = nid
                ? Math.round(((readiness.byNucleus as Record<string, number>)[nid] ?? 0) * 100)
                : null

              return (
                <div key={m.id} className="rounded-lg border border-stone-200 p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-700">{initials(profile?.full_name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">
                        {profile?.full_name ?? 'Líder'}
                      </p>
                      <p className="text-xs text-stone-400">{nucleus?.name ?? 'Sem naipe'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    {pending > 0 ? (
                      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 font-medium">
                        {pending} tarefa{pending !== 1 ? 's' : ''} pendente{pending !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-medium">
                        Em dia
                      </span>
                    )}

                    {nucleusReadiness !== null && (
                      <span className="text-stone-400">
                        Prontidão: {nucleusReadiness}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
