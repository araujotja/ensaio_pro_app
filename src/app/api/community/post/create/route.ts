import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const schema = z.object({
  group_id: z.string().uuid({ message: 'group_id inválido' }),
  content: z.string().min(1, { message: 'Conteúdo obrigatório' }).max(2000, { message: 'Máximo 2000 caracteres' }),
  nucleus_id: z.string().uuid().optional().nullable(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { group_id, content, nucleus_id } = parsed.data

  const { data: membership } = await supabase
    .from('membership')
    .select('id')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const service = createServiceClient()
  const { data: post, error } = await service
    .from('community_post')
    .insert({ group_id, user_id: user.id, content, nucleus_id: nucleus_id ?? null })
    .select('id')
    .single()

  if (error) {
    console.error('[community/post/create]', error.code, error.message)
    return NextResponse.json({ error: 'Erro ao publicar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: post.id })
}
