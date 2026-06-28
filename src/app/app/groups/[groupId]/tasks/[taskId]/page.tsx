import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGroupById, getMembershipForGroup } from '@/lib/db/groups'
import { getTasksByGroup, getSubmissionsByTask } from '@/lib/db/tasks'
import { REVIEWER_ROLES } from '@/lib/constants'
import { isSafeUrl } from '@/utils/url'
import type { TaskStatus, Submission } from '@/types/database'
import type { Metadata } from 'next'
import TaskSubmitForm from './TaskSubmitForm'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Tarefa' }
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


export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; taskId: string }>
}) {
  const { groupId, taskId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [group, membership] = await Promise.all([
    getGroupById(groupId),
    getMembershipForGroup(groupId),
  ])

  if (!membership) notFound()

  const tasks = await getTasksByGroup(groupId)
  const task = tasks.find((t) => t.id === taskId)
  if (!task) notFound()

  const submissions = await getSubmissionsByTask(taskId)
  const isLeader = (REVIEWER_ROLES as readonly string[]).includes(membership.role)

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app/groups/${groupId}/tasks`}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para tarefas
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-stone-900">
            {(task as any).repertoire?.title ?? 'Tarefa'}
            {(task as any).section?.name ? ` — ${(task as any).section.name}` : ''}
          </h1>
          <span
            className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status as TaskStatus]}`}
          >
            {STATUS_LABELS[task.status as TaskStatus]}
          </span>
        </div>
      </div>

      {/* Task details */}
      <div className="card space-y-3">
        {task.guidance && (
          <div>
            <p className="text-xs text-stone-400 mb-1">Orientação</p>
            <p className="text-sm text-stone-700 leading-relaxed">{task.guidance}</p>
          </div>
        )}
        <div className="flex flex-col gap-1 text-xs text-stone-400">
          {task.due_date && (
            <span>Prazo: {new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
          )}
          <span>Escopo: {task.scope}</span>
        </div>
      </div>

      {/* Submissions */}
      <div>
        <h2 className="text-base font-semibold text-stone-800 mb-3">
          Envios ({submissions.length})
        </h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-stone-400">Nenhum envio ainda.</p>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <div key={s.id} className="card flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900">
                    {(s as any).profile?.full_name ?? 'Músico'}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {s.type} · {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    {s.link_url && isSafeUrl(s.link_url) && (
                      <>
                        {' · '}
                        <a
                          href={s.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 hover:underline"
                        >
                          Ver link
                        </a>
                      </>
                    )}
                    {s.text_content && (
                      <span className="block mt-1 text-stone-600">{s.text_content}</span>
                    )}
                  </p>
                </div>
                {isLeader && (
                  <div className="flex gap-2 flex-shrink-0">
                    <form action={`/api/feedback/create`} method="POST">
                      <input type="hidden" name="submission_id" value={s.id} />
                      <input type="hidden" name="type" value="aprovado" />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Aprovar
                      </button>
                    </form>
                    <form action={`/api/feedback/create`} method="POST">
                      <input type="hidden" name="submission_id" value={s.id} />
                      <input type="hidden" name="type" value="ajustar" />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reabrir
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit form */}
      <TaskSubmitForm taskId={taskId} groupId={groupId} />
    </div>
  )
}
