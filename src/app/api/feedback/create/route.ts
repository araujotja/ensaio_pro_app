import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createFeedback } from '@/lib/db/tasks'
import { REVIEWER_ROLES } from '@/lib/constants'

const schema = z.object({
  submission_id: z.uuid({ error: 'submission_id inválido' }),
  type: z.enum(['aprovado', 'ajustar', 'comentario_texto', 'comentario_audio'], { error: 'Tipo inválido' }),
  comment: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // For form-urlencoded (HTML form action POSTs): validate that the request
  // originates from our own app before accepting it.
  const contentType = request.headers.get('content-type') ?? ''
  const isFormPost = contentType.includes('application/x-www-form-urlencoded')

  if (isFormPost) {
    const origin = request.headers.get('origin')
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : null

    // In production: reject cross-origin form POSTs (CSRF defence)
    if (origin && appOrigin && origin !== appOrigin) {
      return NextResponse.json({ error: 'Origem inválida' }, { status: 403 })
    }
  }

  // Parse body
  let body: Record<string, unknown>
  if (isFormPost) {
    const text = await request.text()
    const params = new URLSearchParams(text)
    body = Object.fromEntries(params.entries())
  } else {
    body = await request.json().catch(() => null)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { submission_id, type, comment } = parsed.data

  // Resolve submission → task → group for authorization
  const { data: submission } = await supabase
    .from('submission')
    .select('task_id')
    .eq('id', submission_id)
    .maybeSingle()

  if (!submission) {
    return NextResponse.json({ error: 'Envio não encontrado' }, { status: 404 })
  }

  const { data: task } = await supabase
    .from('task')
    .select('group_id')
    .eq('id', submission.task_id)
    .maybeSingle()

  if (!task) {
    return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('membership')
    .select('role')
    .eq('group_id', task.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || !(REVIEWER_ROLES as readonly string[]).includes(membership.role)) {
    return NextResponse.json({ error: 'Sem permissão para revisar' }, { status: 403 })
  }

  try {
    const feedback = await createFeedback({ submission_id, type, comment })

    const service = createServiceClient()
    await service.from('audit_log').insert({
      user_id: user.id,
      action: 'create_feedback',
      resource_type: 'feedback',
      resource_id: feedback.id,
      metadata: { type, group_id: task.group_id, task_id: submission.task_id },
    })

    // For form POSTs: redirect to the task page derived from DB data — never from Referer
    if (isFormPost) {
      const target = `/app/groups/${task.group_id}/tasks/${submission.task_id}`
      return NextResponse.redirect(new URL(target, request.url), { status: 303 })
    }

    return NextResponse.json({ ok: true, id: feedback.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
