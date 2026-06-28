import { z } from 'zod'

const APP_ROLES = [
  'admin_org',
  'admin_grupo',
  'maestro',
  'lider_louvor',
  'lider_naipe',
  'spalla',
  'mentor',
  'musico',
  'iniciante',
  'tecnica_producao',
  'convidado',
] as const

const GROUP_TEMPLATES = [
  'coral',
  'orquestra',
  'coral_orquestra',
  'banda',
  'escola_projeto',
  'louvor',
  'louvor_coral',
  'louvor_orquestra',
  'livre',
] as const

export const loginSchema = z.object({
  email: z.email({ error: 'E-mail inválido' }),
  password: z.string().min(12, { error: 'Senha deve ter ao menos 12 caracteres' }),
})

export const signupSchema = z
  .object({
    email: z.email({ error: 'E-mail inválido' }),
    password: z.string().min(12, { error: 'Senha deve ter ao menos 12 caracteres' }),
    full_name: z.string().min(2, { error: 'Nome deve ter ao menos 2 caracteres' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export const orgSchema = z.object({
  name: z
    .string()
    .min(2, { error: 'Nome deve ter ao menos 2 caracteres' })
    .max(100, { error: 'Nome deve ter no máximo 100 caracteres' }),
})

export const groupSchema = z.object({
  organization_id: z.uuid({ error: 'ID de organização inválido' }),
  name: z.string().min(1, { error: 'Nome é obrigatório' }),
  template: z.enum(GROUP_TEMPLATES, { error: 'Template inválido' }),
  modo_igreja: z.boolean(),
})

export const memberSchema = z.object({
  email: z.email({ error: 'E-mail inválido' }),
  role: z.enum(APP_ROLES, { error: 'Papel inválido' }),
  nucleus_id: z.uuid({ error: 'ID de naipe inválido' }).optional(),
  is_iniciante: z.boolean().default(false),
  is_lider_naipe: z.boolean().default(false),
  is_spalla: z.boolean().default(false),
  is_minor: z.boolean().default(false),
})

export const repertoireSchema = z.object({
  group_id: z.uuid({ error: 'ID de grupo inválido' }),
  title: z.string().min(1, { error: 'Título é obrigatório' }),
  composer: z.string().optional(),
  music_key: z.string().optional(),
  tempo_bpm: z.number().int().min(20).max(300).optional(),
  performance_date: z.string().optional(),
  notes: z.string().optional(),
})

export const sectionSchema = z.object({
  repertoire_id: z.uuid({ error: 'ID de repertório inválido' }),
  name: z.string().min(1, { error: 'Nome é obrigatório' }),
  measure_start: z.number().int().optional(),
  measure_end: z.number().int().optional(),
})

export const taskSchema = z.object({
  group_id: z.uuid({ error: 'ID de grupo inválido' }),
  repertoire_id: z.uuid({ error: 'ID de repertório inválido' }),
  section_id: z.uuid().optional(),
  scope: z.enum(['grupo', 'nucleo', 'categoria', 'membro', 'papel'], {
    error: 'Escopo inválido',
  }),
  target_id: z.string().optional(),
  guidance: z.string().optional(),
  due_date: z.string().optional(),
})

export const submissionSchema = z
  .object({
    task_id: z.uuid({ error: 'ID de tarefa inválido' }),
    type: z.enum(['audio', 'video', 'link', 'texto'], { error: 'Tipo inválido' }),
    link_url: z.url({ error: 'URL inválida' }).optional(),
    text_content: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'link') return !!data.link_url
      if (data.type === 'texto') return !!data.text_content
      return true
    },
    { error: 'Conteúdo obrigatório para o tipo selecionado' },
  )

export const feedbackSchema = z.object({
  submission_id: z.uuid({ error: 'ID de envio inválido' }),
  type: z.enum(['aprovado', 'ajustar', 'comentario_texto', 'comentario_audio'], {
    error: 'Tipo de feedback inválido',
  }),
  comment: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type OrgInput = z.infer<typeof orgSchema>
export type GroupInput = z.infer<typeof groupSchema>
export type MemberInput = z.infer<typeof memberSchema>
export type RepertoireInput = z.infer<typeof repertoireSchema>
export type SectionInput = z.infer<typeof sectionSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type SubmissionInput = z.infer<typeof submissionSchema>
export type FeedbackInput = z.infer<typeof feedbackSchema>
