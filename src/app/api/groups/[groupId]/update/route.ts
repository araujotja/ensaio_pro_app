import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { LEADER_ROLES } from '@/lib/constants'

const GROUP_TEMPLATES = [
  'coral', 'orquestra', 'coral_orquestra', 'banda', 'escola_projeto',
  'louvor', 'louvor_coral', 'louvor_orquestra', 'livre',
] as const

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  template: z.enum(GROUP_TEMPLATES).optional(),
  modo_igreja: z.boolean().optional(),
})

export async function PATCH(
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
    return NextResponse.json({ error: 'Apenas líderes podem editar o grupo' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.template !== undefined) updates.template = parsed.data.template
  if (parsed.data.modo_igreja !== undefined) updates.modo_igreja = parsed.data.modo_igreja

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  updates.updated_at = new Date().toISOString()

  const service = createServiceClient()
  const { error } = await service
    .from('app_group')
    .update(updates)
    .eq('id', groupId)

  if (error) {
    console.error('[groups/update]', error.code, error.message)
    return NextResponse.json({ error: 'Erro ao atualizar grupo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
