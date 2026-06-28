import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCommunityPosts } from '@/lib/db/community'
import { getNucleiByGroup } from '@/lib/db/groups'
import { LEADER_ROLES } from '@/lib/constants'
import CommunityClient from './CommunityClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Comunidade' }

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [posts, nuclei] = await Promise.all([
    getCommunityPosts(groupId).catch(() => []),
    getNucleiByGroup(groupId).catch(() => []),
  ])

  const { data: membership } = await supabase
    .from('membership')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  const isLeader = !!(membership && (LEADER_ROLES as readonly string[]).includes(membership.role))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-stone-900">Comunidade</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {posts.length} publicaç{posts.length === 1 ? 'ão' : 'ões'}
        </p>
      </div>

      <CommunityClient
        posts={posts}
        nuclei={nuclei}
        groupId={groupId}
        userId={user.id}
        isLeader={isLeader}
      />
    </div>
  )
}
