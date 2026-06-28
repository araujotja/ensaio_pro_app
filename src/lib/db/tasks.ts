import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Task, Submission, Feedback, TaskStatus } from '@/types/database'

const SUBMISSION_TTL = Number(process.env.SIGNED_URL_TTL_SECONDS ?? 3600)

export async function getTasksByGroup(groupId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task')
    .select('*, repertoire(title), section(name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}


export async function createTask(params: {
  group_id: string
  repertoire_id: string
  section_id?: string
  scope: Task['scope']
  target_id?: string
  guidance?: string
  due_date?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('task')
    .insert({ ...params, status: 'pendente', created_by: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('task')
    .update({ status })
    .eq('id', taskId)
  if (error) throw error
}

export async function getSubmissionsByTask(taskId: string) {
  const supabase = await createClient()

  const { data: submissions, error } = await supabase
    .from('submission')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!submissions || submissions.length === 0) return []

  const userIds = [...new Set(submissions.map((s) => s.user_id))]
  const { data: profiles } = await supabase
    .from('profile')
    .select('id, full_name')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
  return submissions.map((s) => ({ ...s, profile: profileMap.get(s.user_id) ?? null }))
}

export async function createSubmission(params: {
  task_id: string
  type: Submission['type']
  storage_path?: string
  link_url?: string
  text_content?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('submission')
    .insert({ ...params, user_id: user.id })
    .select()
    .single()
  if (error) throw error

  await updateTaskStatus(params.task_id, 'enviado')

  return data as Submission
}

export async function getSignedUrlForSubmission(storagePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('task-submissions')
    .createSignedUrl(storagePath, SUBMISSION_TTL)
  if (error) throw error
  return data.signedUrl
}

export async function createFeedback(params: {
  submission_id: string
  type: Feedback['type']
  comment?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: feedback, error } = await supabase
    .from('feedback')
    .insert({ ...params, reviewer_id: user.id })
    .select()
    .single()
  if (error) throw error

  if (params.type === 'aprovado') {
    const { data: submission } = await supabase
      .from('submission')
      .select('task_id, user_id')
      .eq('id', params.submission_id)
      .single()

    if (submission) {
      const { data: task } = await supabase
        .from('task')
        .select('repertoire_id')
        .eq('id', submission.task_id)
        .single()

      if (task) {
        const { count: totalTasks } = await supabase
          .from('task')
          .select('id', { count: 'exact', head: true })
          .eq('repertoire_id', task.repertoire_id)

        const { count: approvedCount } = await supabase
          .from('feedback')
          .select('id', { count: 'exact', head: true })
          .eq('type', 'aprovado')
          .in(
            'submission_id',
            (
              await supabase
                .from('submission')
                .select('id')
                .eq('user_id', submission.user_id)
                .in(
                  'task_id',
                  (
                    await supabase
                      .from('task')
                      .select('id')
                      .eq('repertoire_id', task.repertoire_id)
                  ).data?.map((t) => t.id) ?? [],
                )
            ).data?.map((s) => s.id) ?? [],
          )

        const level =
          totalTasks && totalTasks > 0
            ? Math.min(1, (approvedCount ?? 0) / totalTasks)
            : 0

        const service = createServiceClient()
        await service.from('readiness_state').upsert(
          {
            user_id: submission.user_id,
            repertoire_id: task.repertoire_id,
            section_id: null,
            level,
          },
          { onConflict: 'user_id,repertoire_id,section_id' },
        )
      }
    }
  }

  return feedback as Feedback
}

export async function getGroupReadiness(
  groupId: string,
): Promise<{ overall: number; byNucleus: Record<string, number> }> {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('membership')
    .select('user_id, nucleus_id')
    .eq('group_id', groupId)

  if (!members || members.length === 0) {
    return { overall: 0, byNucleus: {} }
  }

  const userIds = members.map((m) => m.user_id)
  const { data: states } = await supabase
    .from('readiness_state')
    .select('user_id, level')
    .in('user_id', userIds)

  if (!states || states.length === 0) {
    return { overall: 0, byNucleus: {} }
  }

  const overall =
    states.reduce((sum, s) => sum + s.level, 0) / states.length

  const byNucleus: Record<string, number> = {}
  for (const m of members) {
    if (!m.nucleus_id) continue
    const memberStates = states.filter((s) => s.user_id === m.user_id)
    if (memberStates.length === 0) continue
    const avg =
      memberStates.reduce((sum, s) => sum + s.level, 0) / memberStates.length
    if (!byNucleus[m.nucleus_id]) {
      byNucleus[m.nucleus_id] = avg
    } else {
      byNucleus[m.nucleus_id] = (byNucleus[m.nucleus_id] + avg) / 2
    }
  }

  return { overall, byNucleus }
}
