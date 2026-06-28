import { randomBytes, createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { LEADER_ROLES } from '@/lib/constants'

const INVITE_TTL_MS = 24 * 60 * 60 * 1000   // 24 hours
const INVITE_RATE_LIMIT = 10                   // max invites per hour per user
const INVITE_WINDOW_MS  = 60 * 60 * 1000      // 1 hour

const schema = z.object({
  group_id: z.string().uuid({ message: 'group_id inválido' }),
  email: z.string().email({ message: 'E-mail inválido' }),
  role: z.enum([
    'admin_org', 'admin_grupo', 'maestro', 'lider_louvor', 'lider_naipe',
    'spalla', 'mentor', 'musico', 'iniciante', 'tecnica_producao', 'convidado',
  ], { error: 'Papel inválido' }),
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

  const { group_id, email, role } = parsed.data
  const service = createServiceClient()

  // Only core leaders of THIS group can invite
  const { data: membership } = await supabase
    .from('membership')
    .select('role')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || !(LEADER_ROLES as readonly string[]).includes(membership.role)) {
    return NextResponse.json({ error: 'Apenas líderes podem convidar músicos' }, { status: 403 })
  }

  // DB-based rate limit: max INVITE_RATE_LIMIT invitations per hour (works across serverless instances)
  const windowStart = new Date(Date.now() - INVITE_WINDOW_MS).toISOString()
  const { count: recentInvites } = await service
    .from('invitation')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', windowStart)

  if ((recentInvites ?? 0) >= INVITE_RATE_LIMIT) {
    return NextResponse.json(
      { error: `Limite de ${INVITE_RATE_LIMIT} convites por hora atingido. Tente novamente mais tarde.` },
      { status: 429 },
    )
  }

  // Validate APP_URL before generating token
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[invite] NEXT_PUBLIC_APP_URL is not set — invite links will be broken')
      return NextResponse.json(
        { error: 'Configuração de URL do servidor ausente. Contate o suporte.' },
        { status: 500 },
      )
    }
  }
  const baseUrl = appUrl ?? 'http://localhost:3000'

  // Generate unguessable token; store only its SHA-256 hash
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString()

  const { error: inviteInsertError } = await service.from('invitation').insert({
    group_id,
    role,
    email,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: user.id,
  })

  if (inviteInsertError) {
    console.error('[invite] insert error:', inviteInsertError)
    return NextResponse.json({ error: 'Erro ao criar convite' }, { status: 500 })
  }

  // Log invite send for audit trail (Block 4)
  await service.from('audit_log').insert({
    user_id: user.id,
    action: 'send_invite',
    resource_type: 'invitation',
    resource_id: group_id,
    metadata: { email, role },
  })

  const redirectTo = `${baseUrl}/onboarding?group=${group_id}&role=${role}&token=${token}`

  // Try to send a Supabase invite email (works for new accounts only)
  const { error: supabaseInviteError } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })

  if (!supabaseInviteError) {
    return NextResponse.json({ ok: true, invite_url: redirectTo, email_sent: true })
  }

  // "Already registered" — user has an account; invitation row is still valid
  const isAlreadyRegistered =
    supabaseInviteError.message?.toLowerCase().includes('already been registered') ||
    supabaseInviteError.message?.toLowerCase().includes('already registered') ||
    (supabaseInviteError as { status?: number }).status === 422

  if (isAlreadyRegistered) {
    return NextResponse.json({
      ok: true,
      invite_url: redirectTo,
      email_sent: false,
      existing_user: true,
    })
  }

  // Any other error — rollback the invitation row so the token doesn't linger
  await service.from('invitation').delete().eq('token_hash', tokenHash)
  console.error('[invite] inviteUserByEmail error:', supabaseInviteError)
  return NextResponse.json({ error: supabaseInviteError.message }, { status: 500 })
}
