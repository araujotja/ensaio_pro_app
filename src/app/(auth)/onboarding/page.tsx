'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AppRole } from '@/types/database'

// ─── types & constants ──────────────────────────────────────────────────────

type Step = 'account' | 'join_confirm' | 'org' | 'group'

const TEMPLATES = [
  { value: 'coral', label: 'Coral' },
  { value: 'orquestra', label: 'Orquestra' },
  { value: 'coral_orquestra', label: 'Coral + Orquestra' },
  { value: 'banda', label: 'Banda' },
  { value: 'escola_projeto', label: 'Escola / Projeto' },
  { value: 'louvor', label: 'Louvor' },
  { value: 'louvor_coral', label: 'Louvor + Coral' },
  { value: 'louvor_orquestra', label: 'Louvor + Orquestra' },
  { value: 'livre', label: 'Livre' },
]

const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  admin_org: 'Admin Org',
  admin_grupo: 'Admin do Grupo',
  maestro: 'Maestro',
  lider_louvor: 'Líder de Louvor',
  lider_naipe: 'Líder de Naipe',
  spalla: 'Spalla',
  mentor: 'Mentor',
  musico: 'Músico',
  iniciante: 'Iniciante',
  tecnica_producao: 'Técnica / Produção',
  convidado: 'Convidado',
}

// ─── main content (needs Suspense because of useSearchParams) ────────────────

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // New format: ?token=ABC123
  const inviteToken = searchParams.get('token') ?? ''
  // Legacy format: ?group=UUID&role=spalla  (also present in new format for display)
  const inviteGroupId = searchParams.get('group') ?? ''
  const inviteRole = (searchParams.get('role') ?? '') as AppRole

  // Only token-based invites are accepted — legacy links without a token are expired/invalid
  const isInvite = !!inviteToken
  const isLegacyLink = !!(inviteGroupId && inviteRole && !inviteToken)

  const inviteRoleLabel = ROLE_LABELS[inviteRole] ?? inviteRole

  const [isAuthed, setIsAuthed] = useState(false)
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState<Step>('account')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [account, setAccount] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [org, setOrg] = useState({ name: '' })
  const [group, setGroup] = useState({ name: '', template: 'coral', modoIgreja: false })

  // Detect auth on mount and pick the right initial step
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (user) {
          setIsAuthed(true)
          setStep(isInvite ? 'join_confirm' : 'org')
        }
        setReady(true)
      })
      .catch((err) => {
        console.error('[onboarding] auth check failed:', err)
        setReady(true) // still show the page even if auth check fails
      })
  }, [isInvite])

  // ── progress indicator config ──────────────────────────────────────────────
  type ProgressStep = { key: Step; label: string }
  const progressSteps: ProgressStep[] = isInvite
    ? isAuthed
      ? [{ key: 'join_confirm', label: 'Entrar' }]
      : [{ key: 'account', label: 'Conta' }, { key: 'join_confirm', label: 'Entrar' }]
    : isAuthed
      ? [
          { key: 'org', label: 'Organização' },
          { key: 'group', label: 'Grupo' },
        ]
      : [
          { key: 'account', label: 'Conta' },
          { key: 'org', label: 'Organização' },
          { key: 'group', label: 'Grupo' },
        ]

  const stepIndex = progressSteps.findIndex((s) => s.key === step)

  // ── handlers ───────────────────────────────────────────────────────────────

  async function handleAccountNext() {
    setError('')
    if (!account.fullName.trim() || account.fullName.length < 2) {
      setError('Nome deve ter ao menos 2 caracteres.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
      setError('E-mail inválido.')
      return
    }
    if (account.password.length < 12) {
      setError('Senha deve ter ao menos 12 caracteres.')
      return
    }
    if (account.password !== account.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: { data: { full_name: account.fullName } },
    })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (isInvite) {
      await handleJoin()
    } else {
      setStep('org')
    }
  }

  async function handleJoin() {
    setError('')
    setLoading(true)

    const res = await fetch('/api/onboarding/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: inviteToken }),
    })
    setLoading(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erro ao entrar no grupo. Tente novamente.')
      return
    }

    const json = await res.json()
    const targetGroupId = json.groupId ?? inviteGroupId
    router.replace(`/app/groups/${targetGroupId}/dashboard`)
  }

  function handleOrgNext() {
    setError('')
    if (!org.name.trim() || org.name.length < 2) {
      setError('Nome da organização deve ter ao menos 2 caracteres.')
      return
    }
    setStep('group')
  }

  async function handleGroupSubmit() {
    setError('')
    if (!group.name.trim()) {
      setError('Nome do grupo é obrigatório.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/onboarding/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: org.name,
        groupName: group.name,
        template: group.template,
        modoIgreja: group.modoIgreja,
      }),
    })
    setLoading(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erro ao criar grupo. Tente novamente.')
      return
    }
    router.replace('/app')
  }

  // Show spinner while auth check is in progress — never blank
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-stone-200 border-t-amber-600" />
      </div>
    )
  }

  const subtitle = isInvite
    ? `Você foi convidado como ${inviteRoleLabel}`
    : isAuthed
      ? 'Configure sua organização e grupo'
      : 'Crie sua conta em 3 passos'

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900">Ensaio Pro</h1>
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        </div>

        {/* Progress indicator */}
        {progressSteps.length > 1 && (
          <div className="mb-8 flex items-center justify-center gap-3">
            {progressSteps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    i <= stepIndex
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`hidden text-xs sm:block ${
                    i <= stepIndex ? 'text-stone-700 font-medium' : 'text-stone-400'
                  }`}
                >
                  {s.label}
                </span>
                {i < progressSteps.length - 1 && (
                  <div className="h-px w-8 bg-stone-300" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card">
          {/* Legacy link — no token, cannot proceed securely */}
          {isLegacyLink && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
              <p className="font-semibold mb-1">Este link de convite expirou.</p>
              <p>Peça ao administrador do grupo para enviar um novo convite pelo app.</p>
            </div>
          )}

          {/* Invite banner */}
          {isInvite && (
            <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Você foi convidado para participar do grupo como{' '}
              <span className="font-semibold">{inviteRoleLabel}</span>.
              {!isAuthed && ' Crie sua conta abaixo para continuar.'}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── step: account ── */}
          {step === 'account' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-800">Sua conta</h2>
              <div>
                <label className="label">Nome completo</label>
                <input
                  className="input"
                  value={account.fullName}
                  onChange={(e) => setAccount({ ...account, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  className="input"
                  value={account.email}
                  onChange={(e) => setAccount({ ...account, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Senha</label>
                <input
                  type="password"
                  className="input"
                  value={account.password}
                  onChange={(e) => setAccount({ ...account, password: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Confirmar senha</label>
                <input
                  type="password"
                  className="input"
                  value={account.confirmPassword}
                  onChange={(e) =>
                    setAccount({ ...account, confirmPassword: e.target.value })
                  }
                />
              </div>
              <button
                className="btn-primary w-full justify-center"
                onClick={handleAccountNext}
                disabled={loading}
              >
                {loading ? 'Aguarde…' : isInvite ? 'Criar conta e entrar no grupo' : 'Continuar'}
              </button>
            </div>
          )}

          {/* ── step: join_confirm (authed user receiving invite) ── */}
          {step === 'join_confirm' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-800">Entrar no grupo</h2>
              <p className="text-sm text-stone-500">
                Você já está autenticado. Clique para confirmar que deseja entrar no grupo
                com o papel de <span className="font-medium text-stone-700">{inviteRoleLabel}</span>.
              </p>
              <button
                className="btn-primary w-full justify-center"
                onClick={handleJoin}
                disabled={loading}
              >
                {loading ? 'Entrando…' : 'Confirmar e entrar no grupo'}
              </button>
            </div>
          )}

          {/* ── step: org ── */}
          {step === 'org' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-800">Sua organização</h2>
              <p className="text-sm text-stone-500">
                Nome da instituição, escola ou ministério que administra o grupo.
              </p>
              <div>
                <label className="label">Nome da organização</label>
                <input
                  className="input"
                  value={org.name}
                  onChange={(e) => setOrg({ name: e.target.value })}
                />
              </div>
              <button className="btn-primary w-full justify-center" onClick={handleOrgNext}>
                Continuar
              </button>
            </div>
          )}

          {/* ── step: group ── */}
          {step === 'group' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-800">Seu primeiro grupo</h2>
              <div>
                <label className="label">Nome do grupo</label>
                <input
                  className="input"
                  value={group.name}
                  onChange={(e) => setGroup({ ...group, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={group.template}
                  onChange={(e) => setGroup({ ...group, template: e.target.value })}
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-amber-600"
                  checked={group.modoIgreja}
                  onChange={(e) => setGroup({ ...group, modoIgreja: e.target.checked })}
                />
                <span className="text-sm text-stone-700">Modo Igreja</span>
              </label>
              <button
                className="btn-primary w-full justify-center"
                onClick={handleGroupSubmit}
                disabled={loading}
              >
                {loading ? 'Criando…' : 'Criar e entrar'}
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          {isInvite ? (
            <>
              Já tem conta?{' '}
              <a
                href={`/login?redirect=/onboarding?group=${inviteGroupId}&role=${inviteRole}${inviteToken ? `&token=${inviteToken}` : ''}`}
                className="font-medium text-amber-600 hover:text-amber-700"
              >
                Entrar
              </a>
            </>
          ) : isAuthed ? (
            <>
              Já tem um grupo?{' '}
              <a href="/app" className="font-medium text-amber-600 hover:text-amber-700">
                Ir para o app
              </a>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <a href="/login" className="font-medium text-amber-600 hover:text-amber-700">
                Entrar
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

// ─── page export — wraps with Suspense so useSearchParams() works ────────────

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-stone-200 border-t-amber-600" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
