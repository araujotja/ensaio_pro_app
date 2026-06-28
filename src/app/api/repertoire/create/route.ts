import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { repertoireSchema } from '@/lib/validations'
import { createRepertoire } from '@/lib/db/repertoire'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = repertoireSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Verify the user is a member of the target group before writing
  const { data: membership } = await supabase
    .from('membership')
    .select('id')
    .eq('group_id', parsed.data.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 })
  }

  try {
    const repertoire = await createRepertoire(parsed.data)

    const service = createServiceClient()
    await service.from('audit_log').insert({
      user_id: user.id,
      action: 'create_repertoire',
      resource_type: 'repertoire',
      resource_id: repertoire.id,
      metadata: { group_id: parsed.data.group_id, title: parsed.data.title },
    })

    return NextResponse.json({ ok: true, id: repertoire.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
