import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroupById, getNucleiByGroup, getMembersByGroup } from '@/lib/db/groups'
import { LEADER_ROLES } from '@/lib/constants'
import SettingsClient from './SettingsClient'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Configurações' }
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [group, nuclei, members] = await Promise.all([
    getGroupById(groupId),
    getNucleiByGroup(groupId).catch(() => []),
    getMembersByGroup(groupId).catch(() => []),
  ])

  const { data: membership } = await supabase
    .from('membership')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  const role = membership?.role ?? ''
  const isLeader = (LEADER_ROLES as readonly string[]).includes(role)
  const isAdmin = ['admin_org', 'admin_grupo'].includes(role)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-stone-900">Configurações</h1>
        <p className="text-sm text-stone-500 mt-0.5">{group.name}</p>
      </div>

      <SettingsClient
        group={group}
        nuclei={nuclei}
        memberCount={members.length}
        isLeader={isLeader}
        isAdmin={isAdmin}
        userId={user.id}
      />
    </div>
  )
}
