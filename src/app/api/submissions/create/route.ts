import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createSubmission } from '@/lib/db/tasks'

const schema = z.object({
  task_id: z.uuid({ error: 'task_id inválido' }),
  type: z.enum(['link', 'texto'], { error: 'Tipo inválido' }),
  link_url: z
    .url({ error: 'URL inválida' })
    .refine(
      (u) => { try { const p = new URL(u).protocol; return p === 'https:' || p === 'http:'; } catch { return false; } },
      { error: 'Apenas URLs http(s) são permitidas' },
    )
    .optional(),
  text_content: z.string().min(1, { error: 'Texto vazio' }).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { task_id, type, link_url, text_content } = parsed.data

  // Verify the task exists and user is a member of its group (RLS enforces this)
  const { data: task } = await supabase
    .from('task')
    .select('group_id')
    .eq('id', task_id)
    .maybeSingle()

  if (!task) {
    return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('membership')
    .select('id')
    .eq('group_id', task.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const submission = await createSubmission({ task_id, type, link_url, text_content })
    return NextResponse.json({ ok: true, id: submission.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
