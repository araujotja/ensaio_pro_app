'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

type SubmissionType = 'audio' | 'video' | 'link' | 'texto'

const TYPE_OPTIONS: { value: SubmissionType; label: string }[] = [
  { value: 'audio', label: 'Áudio (upload)' },
  { value: 'link', label: 'Link (YouTube, Drive…)' },
  { value: 'texto', label: 'Texto' },
]

export default function TaskSubmitForm({
  taskId,
  groupId,
}: {
  taskId: string
  groupId: string
}) {
  const [type, setType] = useState<SubmissionType>('audio')
  const [linkUrl, setLinkUrl] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    let res: Response

    if (type === 'audio' || type === 'video') {
      if (!file) {
        setError('Selecione um arquivo.')
        setSubmitting(false)
        return
      }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('task_id', taskId)
      fd.append('type', type)
      res = await fetch('/api/submissions/upload', { method: 'POST', body: fd })
    } else {
      res = await fetch('/api/submissions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          type,
          link_url: type === 'link' ? linkUrl : undefined,
          text_content: type === 'texto' ? text : undefined,
        }),
      })
    }

    setSubmitting(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erro ao enviar. Tente novamente.')
      return
    }

    setSuccess(true)
    setLinkUrl('')
    setText('')
    setFile(null)
  }

  if (success) {
    return (
      <div className="card bg-green-50 border-green-200 text-center py-6">
        <p className="text-sm font-medium text-green-700">Envio realizado com sucesso!</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 text-xs text-green-600 underline"
        >
          Enviar outro
        </button>
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-base font-semibold text-stone-800">Enviar resposta</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Tipo de envio</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as SubmissionType)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {type === 'link' && (
          <div>
            <label className="label">URL</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
            />
          </div>
        )}

        {type === 'texto' && (
          <div>
            <label className="label">Texto</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>
        )}

        {(type === 'audio' || type === 'video') && (
          <div>
            <label className="label">
              Arquivo {type === 'audio' ? '(max 25MB)' : '(max 100MB)'}
            </label>
            <input
              type="file"
              className="input"
              accept={type === 'audio' ? 'audio/*' : 'video/*'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
        )}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (
            'Enviando…'
          ) : (
            <>
              <Send className="h-4 w-4" />
              Enviar
            </>
          )}
        </button>
      </form>
    </div>
  )
}
