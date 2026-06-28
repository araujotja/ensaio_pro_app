import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { taskSchema } from '@/lib/validations'
import { createTask } from '@/lib/db/tasks'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = taskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Verify the user is a member of the target group
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
    const task = await createTask(parsed.data)

    const service = createServiceClient()
    await service.from('audit_log').insert({
      user_id: user.id,
      action: 'create_task',
      resource_type: 'task',
      resource_id: task.id,
      metadata: { group_id: parsed.data.group_id, repertoire_id: parsed.data.repertoire_id },
    })

    return NextResponse.json({ ok: true, id: task.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
