import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Sparkles, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGroupById } from '@/lib/db/groups'
import { getTasksByGroup } from '@/lib/db/tasks'
import type { TaskStatus } from '@/types/database'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Tarefas' }
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  reaberto: 'Reaberto',
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pendente: 'bg-stone-100 text-stone-600',
  enviado: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-green-100 text-green-700',
  reaberto: 'bg-orange-100 text-orange-700',
}

export default async function TasksPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [group, tasks] = await Promise.all([
    getGroupById(groupId),
    getTasksByGroup(groupId),
  ])

  const counts: Record<TaskStatus, number> = {
    pendente: 0,
    enviado: 0,
    aprovado: 0,
    reaberto: 0,
  }
  for (const t of tasks) {
    counts[t.status as TaskStatus]++
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Tarefas</h1>
          <p className="text-sm text-stone-500 mt-0.5">{group.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/groups/${groupId}/tasks/generate`} className="btn-secondary">
            <Sparkles className="h-4 w-4" />
            Gerar com IA
          </Link>
          <Link href={`/app/groups/${groupId}/tasks/new`} className="btn-primary">
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Link>
        </div>
      </div>

      {/* Status counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(counts) as TaskStatus[]).map((status) => (
          <div key={status} className="card text-center">
            <p className="text-2xl font-bold text-stone-900">{counts[status]}</p>
            <p className="text-xs text-stone-500 mt-1">{STATUS_LABELS[status]}</p>
          </div>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardList className="mx-auto h-10 w-10 text-stone-300 mb-3" />
          <p className="text-stone-500 mb-4">Nenhuma tarefa criada ainda.</p>
          <Link href={`/app/groups/${groupId}/tasks/new`} className="btn-primary">
            <Plus className="h-4 w-4" />
            Criar primeira tarefa
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/app/groups/${groupId}/tasks/${task.id}`}
              className="card flex items-start justify-between gap-4 hover:border-stone-300 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {(task as any).repertoire?.title ?? 'Repertório'}
                  {(task as any).section?.name
                    ? ` — ${(task as any).section.name}`
                    : ''}
                </p>
                {task.guidance && (
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{task.guidance}</p>
                )}
                {task.due_date && (
                  <p className="text-xs text-stone-400 mt-1">
                    Prazo: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <span
                className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status as TaskStatus]}`}
              >
                {STATUS_LABELS[task.status as TaskStatus]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
