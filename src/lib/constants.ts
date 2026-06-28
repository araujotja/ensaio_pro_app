import type { AppRole } from '@/types/database'

// Core leaders: can invite members, configure groups, assign tasks
export const LEADER_ROLES: readonly AppRole[] = [
  'admin_org', 'admin_grupo', 'maestro', 'lider_louvor',
]

// Extended reviewers: can also approve/reject submissions
export const REVIEWER_ROLES: readonly AppRole[] = [
  'admin_org', 'admin_grupo', 'maestro', 'lider_louvor', 'lider_naipe', 'spalla',
]
