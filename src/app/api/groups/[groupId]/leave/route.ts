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
    .select('id, role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Você não é membro deste grupo' }, { status: 404 })

  // Prevent the last admin_org from leaving (group would be orphaned)
  if (membership.role === 'admin_org') {
    const { count } = await supabase
      .from('membership')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('role', 'admin_org')

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Você é o único administrador. Transfira o papel antes de sair.' },
        { status: 409 },
      )
    }
  }

  const service = createServiceClient()
  const { error } = await service
    .from('membership')
    .delete()
    .eq('id', membership.id)

  if (error) {
    console.error('[groups/leave]', error.code, error.message)
    return NextResponse.json({ error: 'Erro ao sair do grupo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
