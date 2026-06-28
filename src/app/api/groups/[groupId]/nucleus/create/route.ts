import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { LEADER_ROLES } from '@/lib/constants'

const schema = z.object({
  name: z.string().min(1, { message: 'Nome obrigatório' }).max(60, { message: 'Máximo 60 caracteres' }),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { data: membership } = await supabase
    .from('membership')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || !(LEADER_ROLES as readonly string[]).includes(membership.role)) {
    return NextResponse.json({ error: 'Apenas líderes podem criar naipes' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data: nucleus, error } = await service
    .from('nucleus')
    .insert({ group_id: groupId, name: parsed.data.name })
    .select('id, name')
    .single()

  if (error) {
    console.error('[nucleus/create]', error.code, error.message)
    return NextResponse.json({ error: 'Erro ao criar naipe' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: nucleus.id, name: nucleus.name })
}
