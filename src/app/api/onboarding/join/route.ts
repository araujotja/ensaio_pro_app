import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types/database'

const schema = z.object({
  token: z.string().min(1, { message: 'Token obrigatório' }),
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
    return NextResponse.json(
      { error: 'Token inválido. Peça ao administrador um novo link de convite.' },
      { status: 400 },
    )
  }

  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex')
  const service = createServiceClient()

  const { data: invitation, error: invErr } = await service
    .from('invitation')
    .select('id, group_id, role, email, expires_at, consumed_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (invErr || !invitation) {
    return NextResponse.json(
      { error: 'Convite inválido. Peça ao administrador um novo link de convite.' },
      { status: 403 },
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Este convite expirou. Peça ao administrador um novo link.' },
      { status: 403 },
    )
  }

  if (invitation.consumed_at) {
    return NextResponse.json({ error: 'Este convite já foi utilizado.' }, { status: 403 })
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'Este convite foi enviado para outro e-mail.' },
      { status: 403 },
    )
  }

  const groupId: string = invitation.group_id
  const role: AppRole = invitation.role as AppRole

  // Idempotent: already a member
  const { data: existing } = await service
    .from('membership')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await service
      .from('invitation')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', invitation.id)
    return NextResponse.json({ ok: true, groupId })
  }

  // Ensure profile exists
  const { data: userRecord } = await service.auth.admin.getUserById(user.id)
  const { error: profileError } = await service.from('profile').upsert({
    id: user.id,
    full_name: userRecord?.user?.user_metadata?.full_name ?? '',
    is_minor: false,
    parental_consent: false,
  })

  if (profileError) {
    console.error('[join] profile upsert error:', profileError)
    return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
  }

  // role and group_id come from the DB row — never from the request body
  const { error: memberError } = await service.from('membership').insert({
    user_id: user.id,
    group_id: groupId,
    role,
    is_iniciante: role === 'iniciante',
    is_lider_naipe: role === 'lider_naipe',
    is_spalla: role === 'spalla',
  })

  if (memberError) {
    console.error('[join] membership insert error:', memberError)
    return NextResponse.json({ error: 'Erro ao entrar no grupo.' }, { status: 500 })
  }

  await service
    .from('invitation')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.json({ ok: true, groupId })
}
