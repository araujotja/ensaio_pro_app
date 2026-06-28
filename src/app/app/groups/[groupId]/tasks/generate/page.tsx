'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import type { Repertoire } from '@/types/database'

interface AISuggestion {
  guidance: string
  suggested_scope: string
  suggested_measures: string
  suggested_due_days: number
}

export default function GenerateTaskPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)
  const router = useRouter()

  const [repertoire, setRepertoire] = useState<Repertoire[]>([])
  const [selectedRepertoireId, setSelectedRepertoireId] = useState('')
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [editedGuidance, setEditedGuidance] = useState('')
  const [editedScope, setEditedScope] = useState('')
  const [editedDueDays, setEditedDueDays] = useState(7)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/repertoire/list?groupId=${groupId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setRepertoire(list)
        if (list.length > 0) setSelectedRepertoireId(list[0].id)
      })
      .catch(() => {})
  }, [groupId])

  const selectedPiece = repertoire.find((r) => r.id === selectedRepertoireId)

  async function handleGenerate() {
    if (!description.trim()) {
      setError('Descreva o problema ou o que deve ser praticado.')
      return
    }
    setError('')
    setGenerating(true)
    setSuggestion(null)

    const res = await fetch('/api/ai/generate-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        groupContext: `Grupo: ${groupId}`,
        repertoireTitle: selectedPiece?.title ?? '',
      }),
    })

    setGenerating(false)

    if (!res.ok) {
      setError('Erro ao gerar com IA. Tente novamente.')
      return
    }

    const data: AISuggestion = await res.json()
    setSuggestion(data)
    setEditedGuidance(data.guidance)
    setEditedScope(data.suggested_scope || 'grupo')
    setEditedDueDays(data.suggested_due_days ?? 7)
  }

  async function handleConfirm() {
    if (!suggestion || !selectedRepertoireId) return
    setSaving(true)
    setError('')

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + editedDueDays)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const validScopes = ['grupo', 'nucleo', 'categoria', 'membro', 'papel']
    const scope = validScopes.includes(editedScope) ? editedScope : 'grupo'

    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: groupId,
        repertoire_id: selectedRepertoireId,
        scope,
        guidance: editedGuidance,
        due_date: dueDateStr,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erro ao salvar tarefa.')
      return
    }

    router.replace(`/app/groups/${groupId}/tasks`)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/app/groups/${groupId}/tasks`}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-amber-600" />
        <h1 className="text-2xl font-bold text-stone-900">Gerar tarefa com IA</h1>
      </div>

      <div className="space-y-5">
        {/* Peça */}
        <div className="card space-y-4">
          <div>
            <label className="label">Peça do repertório</label>
            <select
              className="input"
              value={selectedRepertoireId}
              onChange={(e) => setSelectedRepertoireId(e.target.value)}
            >
              {repertoire.length === 0 && (
                <option value="">Nenhuma peça cadastrada</option>
              )}
              {repertoire.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                  {r.composer ? ` — ${r.composer}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Descreva o problema ou o que deve ser praticado</label>
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder='Ex: "Sopranos estão desafinando no compasso 32. Eles precisam gravar essa passagem em casa."'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && !suggestion && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedRepertoireId}
            className="btn-primary"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar com IA
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        {suggestion && (
          <div className="card space-y-4 border-amber-200 bg-amber-50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-700">
                Sugestão gerada — edite antes de confirmar
              </p>
            </div>

            <div>
              <label className="label">Orientação</label>
              <textarea
                className="input min-h-[100px] resize-y bg-white"
                value={editedGuidance}
                onChange={(e) => setEditedGuidance(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Escopo sugerido</label>
                <select
                  className="input bg-white"
                  value={editedScope}
                  onChange={(e) => setEditedScope(e.target.value)}
                >
                  {['grupo', 'nucleo', 'categoria', 'membro', 'papel'].map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Prazo (dias a partir de hoje)</label>
                <input
                  type="number"
                  className="input bg-white"
                  min={1}
                  max={90}
                  value={editedDueDays}
                  onChange={(e) => setEditedDueDays(Number(e.target.value))}
                />
              </div>
            </div>

            {suggestion.suggested_measures && (
              <p className="text-xs text-stone-500">
                Compassos sugeridos: {suggestion.suggested_measures}
              </p>
            )}

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Salvando…' : 'Confirmar tarefa'}
              </button>
              <button
                onClick={() => { setSuggestion(null); setError('') }}
                className="btn-secondary"
              >
                Gerar novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
