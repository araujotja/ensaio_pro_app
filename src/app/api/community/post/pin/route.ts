import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { LEADER_ROLES } from '@/lib/constants'

const schema = z.object({
  post_id: z.string().uuid({ message: 'post_id inválido' }),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { post_id } = parsed.data

  const { data: post } = await supabase
    .from('community_post')
    .select('group_id, is_pinned')
    .eq('id', post_id)
    .maybeSingle()

  if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })

  const { data: membership } = await supabase
    .from('membership')
    .select('role')
    .eq('group_id', post.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || !(LEADER_ROLES as readonly string[]).includes(membership.role)) {
    return NextResponse.json({ error: 'Apenas líderes podem fixar posts' }, { status: 403 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('community_post')
    .update({ is_pinned: !post.is_pinned })
    .eq('id', post_id)

  if (error) {
    console.error('[community/post/pin]', error.code, error.message)
    return NextResponse.json({ error: 'Erro ao fixar post' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, is_pinned: !post.is_pinned })
}
