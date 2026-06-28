import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Repertoire, Section, RepertoirePart, Track } from '@/types/database'

const TTL = Number(process.env.SIGNED_URL_TTL_SECONDS ?? 180)

export async function getRepertoireByGroup(groupId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repertoire')
    .select('*')
    .eq('group_id', groupId)
    .order('title')
  if (error) throw error
  return data as Repertoire[]
}

export async function getRepertoireById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repertoire')
    .select('*, section(*), repertoire_part(*), track(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createRepertoire(params: {
  group_id: string
  title: string
  composer?: string
  music_key?: string
  tempo_bpm?: number
  performance_date?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repertoire')
    .insert({ ...params, links: [] })
    .select()
    .single()
  if (error) throw error
  return data as Repertoire
}

export async function getSectionsByRepertoire(repertoireId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('section')
    .select('*')
    .eq('repertoire_id', repertoireId)
    .order('measure_start', { ascending: true })
  if (error) throw error
  return data as Section[]
}

export async function getPartsForUser(repertoireId: string) {
  const supabase = await createClient()
  // RLS enforces nucleus-level access; just fetch and let policies filter
  const { data, error } = await supabase
    .from('repertoire_part')
    .select('*')
    .eq('repertoire_id', repertoireId)
  if (error) throw error
  return data as RepertoirePart[]
}

export async function getSignedUrlForPart(storagePath: string, userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('repertoire-files')
    .createSignedUrl(storagePath, TTL)
  if (error) throw error

  const service = createServiceClient()
  await service.from('access_log').insert({
    user_id: userId,
    resource_type: 'repertoire_part',
    resource_id: storagePath,
  })

  return data.signedUrl
}

export async function getTracksByRepertoire(repertoireId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('track')
    .select('*')
    .eq('repertoire_id', repertoireId)
    .order('ordering')
  if (error) throw error
  return data as Track[]
}

export async function getSignedUrlForTrack(storagePath: string, userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('repertoire-tracks')
    .createSignedUrl(storagePath, TTL)
  if (error) throw error

  const service = createServiceClient()
  await service.from('access_log').insert({
    user_id: userId,
    resource_type: 'track',
    resource_id: storagePath,
  })

  return data.signedUrl
}
