import type { AppRole } from '@/types/database'

// Core leaders: can invite members, configure groups, assign tasks
export const LEADER_ROLES: readonly AppRole[] = [
  'admin_org', 'admin_grupo', 'maestro', 'lider_louvor',
]

// Extended reviewers: can also approve/reject submissions
export const REVIEWER_ROLES: readonly AppRole[] = [
  'admin_org', 'admin_grupo', 'maestro', 'lider_louvor', 'lider_naipe', 'spalla',
]

// Numeric privilege level for each role — used to prevent privilege escalation on invite.
// A leader may only invite at their own level or below.
export const ROLE_LEVEL: Record<AppRole, number> = {
  admin_org:          100,
  admin_grupo:         90,
  maestro:             80,
  lider_louvor:        70,
  lider_naipe:         60,
  spalla:              50,
  mentor:              40,
  musico:              30,
  tecnica_producao:    30,
  iniciante:           20,
  convidado:           10,
}
