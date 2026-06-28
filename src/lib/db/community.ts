import { createClient } from '@/lib/supabase/server'

export interface CommunityReply {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profile: { id: string; full_name: string } | null
}

export interface CommunityPost {
  id: string
  group_id: string
  user_id: string
  nucleus_id: string | null
  content: string
  is_pinned: boolean
  created_at: string
  profile: { id: string; full_name: string } | null
  replies: CommunityReply[]
}

export async function getCommunityPosts(groupId: string): Promise<CommunityPost[]> {
  const supabase = await createClient()

  const { data: posts, error } = await supabase
    .from('community_post')
    .select('id, group_id, user_id, nucleus_id, content, is_pinned, created_at, community_reply(id, post_id, user_id, content, created_at)')
    .eq('group_id', groupId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  if (!posts || posts.length === 0) return []

  const userIds = new Set<string>()
  for (const p of posts) {
    userIds.add(p.user_id)
    for (const r of (p.community_reply ?? [])) {
      userIds.add(r.user_id)
    }
  }

  const { data: profiles } = await supabase
    .from('profile')
    .select('id, full_name')
    .in('id', [...userIds])

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  return posts.map((p) => ({
    ...p,
    is_pinned: p.is_pinned ?? false,
    profile: profileMap.get(p.user_id) ?? null,
    replies: ((p.community_reply ?? []) as Omit<CommunityReply, 'profile'>[]).map((r) => ({
      ...r,
      profile: profileMap.get(r.user_id) ?? null,
    })),
  }))
}
