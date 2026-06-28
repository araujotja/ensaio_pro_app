import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRepertoireByGroup } from '@/lib/db/repertoire'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')

  if (!groupId) {
    return NextResponse.json({ error: 'groupId obrigatório' }, { status: 400 })
  }

  // Verify membership (RLS also enforces this on the query below)
  const { data: membership } = await supabase
    .from('membership')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 })
  }

  try {
    const repertoire = await getRepertoireByGroup(groupId)
    return NextResponse.json(repertoire)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
