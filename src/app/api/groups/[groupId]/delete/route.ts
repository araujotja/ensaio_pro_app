import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: membership } = await supabase
    .from('membership')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || !['admin_org', 'admin_grupo'].includes(membership.role)) {
    return NextResponse.json({ error: 'Apenas administradores podem excluir o grupo' }, { status: 403 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('app_group')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', groupId)

  if (error) {
    console.error('[groups/delete]', error.code, error.message)
    return NextResponse.json({ error: 'Erro ao excluir grupo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
