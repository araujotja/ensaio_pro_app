import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroupById } from '@/lib/db/groups'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Configurações' }
}

const TEMPLATE_LABELS: Record<string, string> = {
  coral: 'Coral',
  orquestra: 'Orquestra',
  coral_orquestra: 'Coral + Orquestra',
  banda: 'Banda',
  escola_projeto: 'Escola / Projeto',
  louvor: 'Louvor',
  louvor_coral: 'Louvor + Coral',
  louvor_orquestra: 'Louvor + Orquestra',
  livre: 'Livre',
}

export default async function SettingsPage({
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

  const group = await getGroupById(groupId)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Configurações</h1>
        <p className="text-sm text-stone-500 mt-0.5">{group.name}</p>
      </div>

      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-stone-800">Informações do grupo</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-stone-400">Nome</p>
            <p className="text-sm font-medium text-stone-900 mt-0.5">{group.name}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Tipo</p>
            <p className="text-sm font-medium text-stone-900 mt-0.5">
              {TEMPLATE_LABELS[group.template] ?? group.template}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Modo Igreja</p>
            <p className="text-sm font-medium text-stone-900 mt-0.5">
              {group.modo_igreja ? 'Sim' : 'Não'}
            </p>
          </div>
        </div>
      </div>

      <div className="card opacity-60">
        <p className="text-sm font-medium text-stone-700">Configurações avançadas</p>
        <p className="text-xs text-stone-400 mt-1">Em breve: naipes, permissões, integrações.</p>
      </div>
    </div>
  )
}
