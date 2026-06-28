'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { GroupTemplate } from '@/types/database'

const TEMPLATE_OPTIONS: { value: GroupTemplate; label: string }[] = [
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

export default function NewGroupPage() {
  const router = useRouter()

  const [orgName, setOrgName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [template, setTemplate] = useState<GroupTemplate>('coral')
  const [modoIgreja, setModoIgreja] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/onboarding/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName, groupName, template, modoIgreja }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erro ao criar grupo. Tente novamente.')
      return
    }

    const { groupId } = await res.json()
    router.replace(`/app/groups/${groupId}/dashboard`)
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-stone-50 p-6 pt-16">
      <div className="w-full max-w-md space-y-6">
        <div>
          <Link
            href="/app"
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Novo grupo</h1>
          <p className="text-sm text-stone-500 mt-1">
            Crie um novo grupo musical com sua organização.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="label">
              Nome da organização <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Instituto Musical São Paulo"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="label">
              Nome do grupo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Coral Juvenil"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              minLength={1}
            />
          </div>

          <div>
            <label className="label">Tipo de grupo</label>
            <select
              className="input"
              value={template}
              onChange={(e) => setTemplate(e.target.value as GroupTemplate)}
            >
              {TEMPLATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="modo_igreja"
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              checked={modoIgreja}
              onChange={(e) => setModoIgreja(e.target.checked)}
            />
            <label htmlFor="modo_igreja" className="text-sm text-stone-700 cursor-pointer">
              Modo Igreja (oculta terminologia secular)
            </label>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Criando…' : 'Criar grupo'}
            </button>
            <Link href="/app" className="btn-secondary">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
