'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Copy, Check, MailCheck, Link2, Users } from 'lucide-react'
import type { AppRole } from '@/types/database'

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'musico', label: 'Músico' },
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'lider_naipe', label: 'Líder de Naipe' },
  { value: 'spalla', label: 'Spalla' },
  { value: 'maestro', label: 'Maestro' },
  { value: 'lider_louvor', label: 'Líder de Louvor' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'tecnica_producao', label: 'Técnica / Produção' },
  { value: 'admin_grupo', label: 'Admin do Grupo' },
  { value: 'convidado', label: 'Convidado' },
]

type State = 'form' | 'success_new' | 'success_existing'

export default function InvitePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)

  const [state, setState] = useState<State>('form')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AppRole>('musico')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [sentEmail, setSentEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/musicians/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, email, role }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erro ao enviar convite. Tente novamente.')
      return
    }

    const json = await res.json()
    setSentEmail(email)
    setInviteLink(json.invite_url ?? '')
    setState(json.existing_user ? 'success_existing' : 'success_new')
  }

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function resetForm() {
    setEmail('')
    setRole('musico')
    setError('')
    setSentEmail('')
    setInviteLink('')
    setCopied(false)
    setState('form')
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <Link
          href={`/app/groups/${groupId}/musicians`}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para músicos
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="h-5 w-5 text-amber-600" />
        <h1 className="text-2xl font-bold text-stone-900">Convidar músico</h1>
      </div>

      {state === 'form' ? (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">
              E-mail do músico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="input"
              placeholder="musico@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Papel no grupo</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Enviando convite…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Convidar
              </>
            )}
          </button>
        </form>
      ) : state === 'success_new' ? (
        /* ── New user: email was sent ── */
        <div className="space-y-4">
          <div className="card border-green-200 bg-green-50 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-full bg-green-100 p-2">
                <MailCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Convite enviado para {sentEmail}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  O músico receberá um e-mail com o link para criar sua conta e entrar no grupo.
                </p>
              </div>
            </div>

            {inviteLink && (
              <div className="border-t border-green-200 pt-3 space-y-2">
                <p className="text-xs font-medium text-green-700">
                  Link de backup (caso o e-mail não chegue):
                </p>
                <CopyLinkRow link={inviteLink} copied={copied} onCopy={copyLink} />
                <p className="text-xs text-green-600">O link expira em 24 horas.</p>
              </div>
            )}
          </div>

          <Actions groupId={groupId} onReset={resetForm} />
        </div>
      ) : (
        /* ── Existing user: no email sent, share link manually ── */
        <div className="space-y-4">
          <div className="card border-amber-200 bg-amber-50 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-full bg-amber-100 p-2">
                <Link2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Este e-mail já tem uma conta.
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Um link de acesso foi gerado — compartilhe com o músico pelo WhatsApp ou e-mail.
                </p>
              </div>
            </div>

            {inviteLink && (
              <div className="border-t border-amber-200 pt-3 space-y-2">
                <p className="text-xs font-medium text-amber-700">Link de convite:</p>
                <CopyLinkRow link={inviteLink} copied={copied} onCopy={copyLink} color="amber" />
                <p className="text-xs text-amber-600">O link expira em 24 horas.</p>
              </div>
            )}
          </div>

          <Actions groupId={groupId} onReset={resetForm} />
        </div>
      )}
    </div>
  )
}

function CopyLinkRow({
  link,
  copied,
  onCopy,
  color = 'green',
}: {
  link: string
  copied: boolean
  onCopy: () => void
  color?: 'green' | 'amber'
}) {
  const border = color === 'amber' ? 'border-amber-200 focus:border-amber-300 focus:ring-amber-200' : 'border-green-200 focus:border-green-300 focus:ring-green-200'
  const btn = color === 'amber' ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-green-200 text-green-700 hover:bg-green-50'
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={link}
        className={`input text-xs flex-1 bg-white ${border}`}
      />
      <button
        onClick={onCopy}
        className={`flex-shrink-0 flex items-center gap-1.5 rounded-md bg-white border px-3 py-2 text-xs font-medium transition-colors ${btn}`}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copiado!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </>
        )}
      </button>
    </div>
  )
}

function Actions({ groupId, onReset }: { groupId: string; onReset: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <button onClick={onReset} className="btn-primary justify-center">
        <UserPlus className="h-4 w-4" />
        Convidar outro músico
      </button>
      <Link href={`/app/groups/${groupId}/musicians`} className="btn-secondary justify-center">
        <Users className="h-4 w-4" />
        Ver lista de músicos
      </Link>
    </div>
  )
}
