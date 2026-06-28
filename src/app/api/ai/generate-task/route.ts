import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateTask } from '@/lib/ai'

const bodySchema = z.object({
  description: z.string().min(1),
  groupContext: z.string(),
  repertoireTitle: z.string(),
})

const AI_RATE_LIMIT  = 10         // max AI calls per user
const AI_WINDOW_MS   = 60_000     // per minute

// DB-based rate limit: counts audit_log entries for this user in the time window.
// Works correctly across Vercel serverless instances.
async function checkAiRateLimit(service: ReturnType<typeof createServiceClient>, userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - AI_WINDOW_MS).toISOString()
  const { count } = await service
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'ai_generate_task')
    .gte('created_at', windowStart)

  return (count ?? 0) < AI_RATE_LIMIT
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const service = createServiceClient()

  const allowed = await checkAiRateLimit(service, user.id)
  if (!allowed) {
    return NextResponse.json(
      { error: `Limite de ${AI_RATE_LIMIT} gerações por minuto atingido. Aguarde 1 minuto.` },
      { status: 429 },
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Log before calling AI so the rate limit counts even if AI times out
  await service.from('audit_log').insert({
    user_id: user.id,
    action: 'ai_generate_task',
    resource_type: 'task',
    resource_id: null,
    metadata: { description: parsed.data.description.slice(0, 100) },
  })

  try {
    const result = await generateTask(parsed.data)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar tarefa com IA' }, { status: 500 })
  }
}
