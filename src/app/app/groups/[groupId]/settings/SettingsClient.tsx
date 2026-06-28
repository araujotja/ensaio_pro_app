'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, AlertTriangle } from 'lucide-react'
import type { AppGroup, Nucleus } from '@/types/database'

const TEMPLATE_OPTIONS = [
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

interface Props {
  group: AppGroup
  nuclei: Nucleus[]
  memberCount: number
  isLeader: boolean
  isAdmin: boolean
  userId: string
}

export default function SettingsClient({ group, nuclei, memberCount, isLeader, isAdmin }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Group info edit
  const [name, setName] = useState(group.name)
  const [template, setTemplate] = useState(group.template)
  const [modoIgreja, setModoIgreja] = useState(group.modo_igreja)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Nucleus add
  const [nucleiList, setNucleiList] = useState<Nucleus[]>(nuclei)
  const [nucleusName, setNucleusName] = useState('')
  const [addingNucleus, setAddingNucleus] = useState(false)
  const [showNucleusForm, setShowNucleusForm] = useState(false)

  // Danger zone
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dangerLoading, setDangerLoading] = useState(false)
  const [dangerError, setDangerError] = useState('')

  async function handleSaveGroup(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')

    const res = await fetch(`/api/groups/${group.id}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, template, modo_igreja: modoIgreja }),
    })

    setSaving(false)
    if (res.ok) {
      setSaveMsg('Salvo com sucesso.')
      startTransition(() => router.refresh())
    } else {
      const j = await res.json().catch(() => ({}))
      setSaveMsg(j.error ?? 'Erro ao salvar.')
    }
  }

  async function handleAddNucleus(e: React.FormEvent) {
    e.preventDefault()
    if (!nucleusName.trim()) return
    setAddingNucleus(true)

    const res = await fetch(`/api/groups/${group.id}/nucleus/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nucleusName.trim() }),
    })

    setAddingNucleus(false)
    if (res.ok) {
      const j = await res.json()
      setNucleiList((prev) => [...prev, { id: j.id, name: j.name, group_id: group.id, created_at: new Date().toISOString() }])
      setNucleusName('')
      setShowNucleusForm(false)
    }
  }

  async function handleLeave() {
    setDangerLoading(true)
    setDangerError('')

    const res = await fetch(`/api/groups/${group.id}/leave`, { method: 'DELETE' })

    setDangerLoading(false)
    if (res.ok) {
      router.push('/app')
    } else {
      const j = await res.json().catch(() => ({}))
      setDangerError(j.error ?? 'Erro ao sair do grupo.')
    }
  }

  async function handleDelete() {
    setDangerLoading(true)
    setDangerError('')

    const res = await fetch(`/api/groups/${group.id}/delete`, { method: 'DELETE' })

    setDangerLoading(false)
    if (res.ok) {
      router.push('/app')
    } else {
      const j = await res.json().catch(() => ({}))
      setDangerError(j.error ?? 'Erro ao excluir o grupo.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Informações do grupo */}
      {isLeader ? (
        <form onSubmit={handleSaveGroup} className="card space-y-4">
          <h2 className="text-base font-semibold text-stone-800">Informações do grupo</h2>

          <div>
            <label className="label">Nome do grupo</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </div>

          <div>
            <label className="label">Tipo</label>
            <select className="input" value={template} onChange={(e) => setTemplate(e.target.value as AppGroup['template'])}>
              {TEMPLATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="modo_igreja"
              checked={modoIgreja}
              onChange={(e) => setModoIgreja(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="modo_igreja" className="text-sm text-stone-700">Modo Igreja</label>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.startsWith('Salvo') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      ) : (
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-stone-800">Informações do grupo</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-stone-400">Nome</p>
              <p className="text-sm font-medium text-stone-900 mt-0.5">{group.name}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Tipo</p>
              <p className="text-sm font-medium text-stone-900 mt-0.5">
                {TEMPLATE_OPTIONS.find((o) => o.value === group.template)?.label ?? group.template}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Modo Igreja</p>
              <p className="text-sm font-medium text-stone-900 mt-0.5">{group.modo_igreja ? 'Sim' : 'Não'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Naipes */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-800">Naipes</h2>
          {isLeader && (
            <button
              onClick={() => setShowNucleusForm((v) => !v)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          )}
        </div>

        {showNucleusForm && isLeader && (
          <form onSubmit={handleAddNucleus} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Nome do naipe (ex: Soprano)"
              value={nucleusName}
              onChange={(e) => setNucleusName(e.target.value)}
              maxLength={60}
              autoFocus
            />
            <button type="submit" disabled={addingNucleus || !nucleusName.trim()} className="btn-primary">
              {addingNucleus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </button>
            <button type="button" onClick={() => { setShowNucleusForm(false); setNucleusName('') }} className="btn-secondary">
              ✕
            </button>
          </form>
        )}

        {nucleiList.length === 0 ? (
          <p className="text-sm text-stone-400">Nenhum naipe cadastrado.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {nucleiList.map((n) => (
              <li key={n.id} className="py-2 text-sm text-stone-700">{n.name}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Membros */}
      <div className="card flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-800">Membros</h2>
          <p className="text-sm text-stone-500 mt-0.5">{memberCount} membro{memberCount !== 1 ? 's' : ''} no grupo</p>
        </div>
        <a href={`/app/groups/${group.id}/musicians`} className="btn-secondary text-sm">
          Ver lista
        </a>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-base font-semibold text-red-700">Zona de perigo</h2>
        </div>

        {dangerError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{dangerError}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Leave group — all members */}
          <button
            onClick={handleLeave}
            disabled={dangerLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {dangerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sair do grupo
          </button>

          {/* Delete group — admins only */}
          {isAdmin && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700">Tem certeza? Esta ação é irreversível.</span>
                <button
                  onClick={handleDelete}
                  disabled={dangerLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {dangerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmar exclusão
                </button>
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-sm">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                Excluir grupo
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
