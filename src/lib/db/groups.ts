import { createClient } from '@/lib/supabase/server'
import type { AppGroup, AppRole, Nucleus, Category } from '@/types/database'

export async function getOrganizationsByUser() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organization')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  if (error) throw error
  return data
}


export async function getGroupsByUser() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('app_group')
    .select('*')
    .is('deleted_at', null)
  if (error) throw error
  return data as AppGroup[]
}

export async function getGroupById(groupId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('app_group')
    .select('*')
    .eq('id', groupId)
    .single()
  if (error) throw error
  return data as AppGroup
}

export async function createGroup(params: {
  organization_id: string
  name: string
  template: AppGroup['template']
  modo_igreja: boolean
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('app_group')
    .insert(params)
    .select()
    .single()
  if (error) throw error
  return data as AppGroup
}

export async function getMembershipForGroup(groupId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('membership')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (error) return null
  return data
}

export async function getNucleiByGroup(groupId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('nucleus')
    .select('*')
    .eq('group_id', groupId)
    .order('name')
  if (error) throw error
  return data as Nucleus[]
}

export async function getCategoriesByGroup(groupId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('category')
    .select('*')
    .eq('group_id', groupId)
    .order('name')
  if (error) throw error
  return data as Category[]
}

export async function getMembersByGroup(groupId: string) {
  const supabase = await createClient()

  const { data: members, error } = await supabase
    .from('membership')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getMembersByGroup] membership query error:', error.code, error.message)
    throw error
  }

  if (!members || members.length === 0) return []

  const userIds = members.map((m) => m.user_id)
  const nucleusIds = [...new Set(members.map((m) => m.nucleus_id).filter(Boolean))] as string[]

  const [{ data: profiles }, { data: nuclei }] = await Promise.all([
    supabase.from('profile').select('id, full_name, avatar_url').in('id', userIds),
    nucleusIds.length > 0
      ? supabase.from('nucleus').select('id, name').in('id', nucleusIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
  const nucleusMap = new Map((nuclei ?? []).map((n) => [n.id, n]))

  return members.map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) ?? null,
    nucleus: m.nucleus_id ? (nucleusMap.get(m.nucleus_id) ?? null) : null,
  }))
}
