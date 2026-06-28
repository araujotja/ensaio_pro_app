import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGroupById, getMembersByGroup } from '@/lib/db/groups'
import type { AppRole } from '@/types/database'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Músicos' }
}

const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  admin_org: 'Admin Org',
  admin_grupo: 'Admin Grupo',
  maestro: 'Maestro',
  lider_louvor: 'Líder de Louvor',
  lider_naipe: 'Líder de Naipe',
  spalla: 'Spalla',
  mentor: 'Mentor',
  musico: 'Músico',
  iniciante: 'Iniciante',
  tecnica_producao: 'Técnica / Produção',
  convidado: 'Convidado',
}

const ROLE_COLORS: Partial<Record<AppRole, string>> = {
  admin_org: 'bg-red-100 text-red-700',
  admin_grupo: 'bg-red-100 text-red-700',
  maestro: 'bg-purple-100 text-purple-700',
  lider_louvor: 'bg-purple-100 text-purple-700',
  lider_naipe: 'bg-blue-100 text-blue-700',
  spalla: 'bg-blue-100 text-blue-700',
  mentor: 'bg-teal-100 text-teal-700',
  musico: 'bg-stone-100 text-stone-600',
  iniciante: 'bg-stone-100 text-stone-500',
  tecnica_producao: 'bg-orange-100 text-orange-700',
  convidado: 'bg-stone-100 text-stone-400',
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default async function MusiciansPage({
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

  let groupName = ''
  let members: Awaited<ReturnType<typeof getMembersByGroup>> = []
  let fetchError = false

  try {
    const [group, memberList] = await Promise.all([
      getGroupById(groupId),
      getMembersByGroup(groupId),
    ])
    groupName = group.name
    members = memberList
  } catch (err) {
    console.error('[MusiciansPage] fetch error:', err)
    fetchError = true
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Músicos</h1>
          {groupName && <p className="text-sm text-stone-500 mt-0.5">{groupName}</p>}
        </div>
        <Link href={`/app/groups/${groupId}/musicians/invite`} className="btn-primary">
          <UserPlus className="h-4 w-4" />
          Convidar músico
        </Link>
      </div>

      {fetchError ? (
        <div className="card text-center py-12">
          <p className="text-stone-500 text-sm">
            Não foi possível carregar a lista. Verifique o console para detalhes.
          </p>
        </div>
      ) : members.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="mx-auto h-10 w-10 text-stone-300 mb-3" />
          <p className="font-medium text-stone-700">Nenhum músico no grupo ainda</p>
          <p className="text-sm text-stone-500 mt-1">
            Use o botão &ldquo;Convidar músico&rdquo; acima para adicionar membros.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => {
            const profile = (m as any).profile
            const nucleus = (m as any).nucleus
            const name: string | null = profile?.full_name ?? null
            const roleLabel = ROLE_LABELS[m.role as AppRole] ?? m.role
            const roleColor =
              ROLE_COLORS[m.role as AppRole] ?? 'bg-stone-100 text-stone-600'

            return (
              <div
                key={m.id}
                className="card flex items-center gap-4 py-3 hover:border-stone-300 transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-700">
                    {initials(name)}
                  </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900 truncate">
                    {name ?? <span className="text-stone-400 font-normal">Sem nome</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColor}`}
                    >
                      {roleLabel}
                    </span>
                    {nucleus?.name && (
                      <span className="text-xs text-stone-400">{nucleus.name}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Count footer */}
      {members.length > 0 && (
        <p className="text-xs text-stone-400 text-right">
          {members.length} membro{members.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
