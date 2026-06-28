'use client'

import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'

interface Props {
  groupId: string
  initialNotes: string
  canEdit: boolean
}

export default function SpallaNotes({ groupId, initialNotes, canEdit }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSave() {
    setSaving(true)
    setMsg('')

    const res = await fetch(`/api/groups/${groupId}/spalla-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })

    setSaving(false)
    setMsg(res.ok ? 'Salvo.' : 'Erro ao salvar.')
  }

  if (!canEdit) {
    return (
      <div className="rounded-lg bg-stone-50 border border-stone-200 p-4 min-h-[120px]">
        <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
          {notes || <span className="text-stone-400">Nenhuma nota registrada.</span>}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        className="input resize-none w-full"
        rows={6}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={4000}
        placeholder="Arcadas, articulações, entradas, decisões musicais…"
      />
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar notas
        </button>
        {msg && (
          <span className={`text-sm ${msg === 'Salvo.' ? 'text-green-600' : 'text-red-600'}`}>
            {msg}
          </span>
        )}
        <span className="ml-auto text-xs text-stone-400">{notes.length}/4000</span>
      </div>
    </div>
  )
}
