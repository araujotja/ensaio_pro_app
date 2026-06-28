import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  orgName: z.string().min(2),
  groupName: z.string().min(1),
  template: z.enum([
    'coral', 'orquestra', 'coral_orquestra', 'banda', 'escola_projeto',
    'louvor', 'louvor_coral', 'louvor_orquestra', 'livre',
  ]),
  modoIgreja: z.boolean(),
})

async function checkSetupRateLimit(service: ReturnType<typeof createServiceClient>, userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await service
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'onboarding_setup')
    .gte('created_at', windowStart)

  return (count ?? 0) < 3
}

export async function POST(request: NextRequest) {
  // Guard: service role key must be set
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[setup] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuração do servidor incompleta (chave de serviço ausente)' }, { status: 500 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    console.error('[setup] validation failed:', parsed.error.issues)
    return NextResponse.json(
      { error: `Dados inválidos: ${parsed.error.issues.map((i) => i.message).join(', ')}` },
      { status: 400 },
    )
  }

  const { orgName, groupName, template, modoIgreja } = parsed.data
  const service = createServiceClient()

  const allowed = await checkSetupRateLimit(service, user.id)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em 1 hora.' },
      { status: 429 },
    )
  }

  // Step 1: create organization
  const { data: org, error: orgError } = await service
    .from('organization')
    .insert({ name: orgName })
    .select()
    .single()

  if (orgError || !org) {
    console.error('[setup] org insert error:', orgError?.code, orgError?.message, orgError?.details)
    return NextResponse.json(
      { error: `Erro ao criar organização (${orgError?.code ?? 'desconhecido'}: ${orgError?.message ?? 'sem dados'})` },
      { status: 500 },
    )
  }

  // Step 2: create group
  const { data: group, error: groupError } = await service
    .from('app_group')
    .insert({ organization_id: org.id, name: groupName, template, modo_igreja: modoIgreja })
    .select()
    .single()

  if (groupError || !group) {
    console.error('[setup] group insert error:', groupError?.code, groupError?.message, groupError?.details)
    await service.from('organization').delete().eq('id', org.id)
    return NextResponse.json(
      { error: `Erro ao criar grupo (${groupError?.code ?? 'desconhecido'}: ${groupError?.message ?? 'sem dados'})` },
      { status: 500 },
    )
  }

  // Step 3: upsert profile
  const { error: profileError } = await service.from('profile').upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? '',
    is_minor: false,
    parental_consent: false,
  })

  if (profileError) {
    console.error('[setup] profile upsert error:', profileError.code, profileError.message, profileError.details)
    await service.from('app_group').delete().eq('id', group.id)
    await service.from('organization').delete().eq('id', org.id)
    return NextResponse.json(
      { error: `Erro ao criar perfil (${profileError.code ?? 'desconhecido'}: ${profileError.message ?? 'sem dados'})` },
      { status: 500 },
    )
  }

  // Step 4: create membership
  const { error: memberError } = await service.from('membership').insert({
    user_id: user.id,
    group_id: group.id,
    role: 'admin_grupo',
    is_iniciante: false,
    is_lider_naipe: false,
    is_spalla: false,
  })

  if (memberError) {
    console.error('[setup] membership insert error:', memberError.code, memberError.message, memberError.details)
    await service.from('app_group').delete().eq('id', group.id)
    await service.from('organization').delete().eq('id', org.id)
    return NextResponse.json(
      { error: `Erro ao criar membro (${memberError.code ?? 'desconhecido'}: ${memberError.message ?? 'sem dados'})` },
      { status: 500 },
    )
  }

  await service.from('audit_log').insert({
    user_id: user.id,
    action: 'onboarding_setup',
    resource_type: 'app_group',
    resource_id: group.id,
    metadata: { org_id: org.id },
  })

  return NextResponse.json({ ok: true, groupId: group.id })
}
