export type AppRole =
  | 'admin_org'
  | 'admin_grupo'
  | 'maestro'
  | 'lider_louvor'
  | 'lider_naipe'
  | 'spalla'
  | 'mentor'
  | 'musico'
  | 'iniciante'
  | 'tecnica_producao'
  | 'convidado'

export type TaskStatus = 'pendente' | 'enviado' | 'aprovado' | 'reaberto'

export type SubmissionType = 'audio' | 'video' | 'link' | 'texto'

export type FeedbackType =
  | 'aprovado'
  | 'ajustar'
  | 'comentario_texto'
  | 'comentario_audio'

export type GroupTemplate =
  | 'coral'
  | 'orquestra'
  | 'coral_orquestra'
  | 'banda'
  | 'escola_projeto'
  | 'louvor'
  | 'louvor_coral'
  | 'louvor_orquestra'
  | 'livre'

export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AppGroup {
  id: string
  organization_id: string
  name: string
  template: GroupTemplate
  modo_igreja: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Nucleus {
  id: string
  group_id: string
  name: string
  created_at: string
}

export interface Category {
  id: string
  group_id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  is_minor: boolean
  parental_consent: boolean
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  user_id: string
  group_id: string
  role: AppRole
  nucleus_id: string | null
  is_iniciante: boolean
  is_lider_naipe: boolean
  is_spalla: boolean
  created_at: string
  updated_at: string
}

export interface Repertoire {
  id: string
  group_id: string
  title: string
  composer: string | null
  music_key: string | null
  tempo_bpm: number | null
  performance_date: string | null
  notes: string | null
  links: string[]
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  repertoire_id: string
  name: string
  measure_start: number | null
  measure_end: number | null
  created_at: string
}

export interface RepertoirePart {
  id: string
  repertoire_id: string
  nucleus_id: string | null
  label: string
  storage_path: string
  created_at: string
}

export interface Track {
  id: string
  repertoire_id: string
  label: string
  storage_path: string
  ordering: number
  created_at: string
}

export interface Task {
  id: string
  group_id: string
  repertoire_id: string
  section_id: string | null
  scope: 'grupo' | 'nucleo' | 'categoria' | 'membro' | 'papel'
  target_id: string | null
  guidance: string | null
  due_date: string | null
  status: TaskStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  task_id: string
  user_id: string
  type: SubmissionType
  storage_path: string | null
  link_url: string | null
  text_content: string | null
  created_at: string
  updated_at: string
}

export interface Feedback {
  id: string
  submission_id: string
  reviewer_id: string
  type: FeedbackType
  comment: string | null
  storage_path: string | null
  created_at: string
}

export interface ReadinessState {
  id: string
  user_id: string
  repertoire_id: string
  section_id: string | null
  level: number
  updated_at: string
}

export interface Rehearsal {
  id: string
  group_id: string
  scheduled_at: string
  notes: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AccessLog {
  id: string
  user_id: string
  resource_type: string
  resource_id: string
  created_at: string
}
