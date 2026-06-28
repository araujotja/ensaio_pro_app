import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const schema = z.object({
  post_id: z.string().uuid({ message: 'post_id inválido' }),
  content: z.string().min(1, { message: 'Conteúdo obrigatório' }).max(1000, { message: 'Máximo 1000 caracteres' }),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { post_id, content } = parsed.data

  // Resolve post → group to verify membership
  const { data: post } = await supabase
    .from('community_post')
    .select('group_id')
    .eq('id', post_id)
    .maybeSingle()

  if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })

  const { data: membership } = await supabase
    .from('membership')
    .select('id')
    .eq('group_id', post.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const service = createServiceClient()
  const { data: reply, error } = await service
    .from('community_reply')
    .insert({ post_id, user_id: user.id, content })
    .select('id')
    .single()

  if (error) {
    console.error('[community/reply/create]', error.code, error.message)
    return NextResponse.json({ error: 'Erro ao responder' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: reply.id })
}
