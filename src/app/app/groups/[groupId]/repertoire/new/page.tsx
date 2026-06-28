'use client'

import { use } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { repertoireSchema, type RepertoireInput } from '@/lib/validations'

export default function NewRepertoirePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RepertoireInput>({
    resolver: zodResolver(repertoireSchema),
    defaultValues: { group_id: groupId },
  })

  async function onSubmit(values: RepertoireInput) {
    const res = await fetch('/api/repertoire/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError('root', { message: json.error ?? 'Erro ao salvar. Tente novamente.' })
      return
    }

    router.replace(`/app/groups/${groupId}/repertoire`)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/app/groups/${groupId}/repertoire`}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-stone-900 mb-6">Nova peça</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        {/* hidden group_id */}
        <input type="hidden" {...register('group_id')} />

        {/* Título */}
        <div>
          <label className="label">
            Título <span className="text-red-500">*</span>
          </label>
          <input className="input" placeholder="Ex: Aleluia" {...register('title')} />
          {errors.title && (
            <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Compositor */}
        <div>
          <label className="label">Compositor</label>
          <input
            className="input"
            placeholder="Ex: G. F. Handel"
            {...register('composer')}
          />
        </div>

        {/* Tom e BPM lado a lado */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tom</label>
            <input
              className="input"
              placeholder="Ex: Dó maior"
              {...register('music_key')}
            />
          </div>
          <div>
            <label className="label">Andamento (BPM)</label>
            <input
              type="number"
              className="input"
              placeholder="Ex: 120"
              min={20}
              max={300}
              {...register('tempo_bpm', { valueAsNumber: true })}
            />
            {errors.tempo_bpm && (
              <p className="mt-1 text-xs text-red-600">{errors.tempo_bpm.message}</p>
            )}
          </div>
        </div>

        {/* Data de apresentação */}
        <div>
          <label className="label">Data de apresentação</label>
          <input type="date" className="input" {...register('performance_date')} />
        </div>

        {/* Observações */}
        <div>
          <label className="label">Observações</label>
          <textarea
            className="input min-h-[100px] resize-y"
            placeholder="Notas sobre a peça, contexto litúrgico, etc."
            {...register('notes')}
          />
        </div>

        {errors.root && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Salvando…' : 'Salvar peça'}
          </button>
          <Link
            href={`/app/groups/${groupId}/repertoire`}
            className="btn-secondary"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
