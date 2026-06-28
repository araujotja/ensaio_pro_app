import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const schema = z.object({
  notes: z.string().max(4000, { message: 'Máximo 4000 caracteres' }),
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
    .select('is_spalla, role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  // Spalla flag or leader role can update notes
  const canEdit =
    membership?.is_spalla ||
    ['admin_org', 'admin_grupo', 'maestro'].includes(membership?.role ?? '')

  if (!canEdit) {
    return NextResponse.json({ error: 'Apenas o spalla ou maestro pode editar estas notas' }, { status: 403 })
  }

  const service = createServiceClient()

  const { data: existing } = await service
    .from('development_track')
    .select('id')
    .eq('user_id', user.id)
    .eq('group_id', groupId)
    .maybeSingle()

  if (existing) {
    await service
      .from('development_track')
      .update({ notes: parsed.data.notes, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await service
      .from('development_track')
      .insert({ user_id: user.id, group_id: groupId, notes: parsed.data.notes })
  }

  return NextResponse.json({ ok: true })
}
