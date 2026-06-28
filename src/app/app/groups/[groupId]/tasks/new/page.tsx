'use client'

import { use, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { taskSchema, type TaskInput } from '@/lib/validations'
import type { Repertoire } from '@/types/database'

const SCOPE_OPTIONS = [
  { value: 'grupo', label: 'Grupo inteiro' },
  { value: 'nucleo', label: 'Naipe / Núcleo' },
  { value: 'categoria', label: 'Categoria' },
  { value: 'membro', label: 'Membro específico' },
  { value: 'papel', label: 'Por papel' },
]

export default function NewTaskPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)
  const router = useRouter()
  const [repertoire, setRepertoire] = useState<Repertoire[]>([])
  const [loadingRepertoire, setLoadingRepertoire] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: { group_id: groupId, scope: 'grupo' },
  })

  useEffect(() => {
    fetch(`/api/repertoire/list?groupId=${groupId}`)
      .then((r) => r.json())
      .then((data) => setRepertoire(Array.isArray(data) ? data : []))
      .catch(() => setRepertoire([]))
      .finally(() => setLoadingRepertoire(false))
  }, [groupId])

  async function onSubmit(values: TaskInput) {
    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError('root', { message: json.error ?? 'Erro ao salvar. Tente novamente.' })
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

      <h1 className="text-2xl font-bold text-stone-900 mb-6">Nova tarefa</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        <input type="hidden" {...register('group_id')} />

        {/* Peça do repertório */}
        <div>
          <label className="label">
            Peça <span className="text-red-500">*</span>
          </label>
          {loadingRepertoire ? (
            <div className="input text-stone-400">Carregando repertório…</div>
          ) : (
            <select className="input" {...register('repertoire_id')}>
              <option value="">Selecione uma peça</option>
              {repertoire.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                  {r.composer ? ` — ${r.composer}` : ''}
                </option>
              ))}
            </select>
          )}
          {errors.repertoire_id && (
            <p className="mt-1 text-xs text-red-600">{errors.repertoire_id.message}</p>
          )}
        </div>

        {/* Escopo */}
        <div>
          <label className="label">Escopo</label>
          <select className="input" {...register('scope')}>
            {SCOPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Seção / compassos */}
        <div>
          <label className="label">Seção ou compassos (opcional)</label>
          <input
            className="input"
            placeholder="Ex: Compassos 32–48, Refrão"
            {...register('target_id')}
          />
        </div>

        {/* Orientação */}
        <div>
          <label className="label">Orientação</label>
          <textarea
            className="input min-h-[100px] resize-y"
            placeholder="Descreva o que o músico deve praticar ou enviar…"
            {...register('guidance')}
          />
        </div>

        {/* Prazo */}
        <div>
          <label className="label">Prazo</label>
          <input type="date" className="input" {...register('due_date')} />
        </div>

        {errors.root && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Salvando…' : 'Criar tarefa'}
          </button>
          <Link href={`/app/groups/${groupId}/tasks`} className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
