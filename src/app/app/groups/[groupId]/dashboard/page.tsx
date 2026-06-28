import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGroupById, getMembersByGroup } from '@/lib/db/groups'
import { getRepertoireByGroup } from '@/lib/db/repertoire'
import { getGroupReadiness } from '@/lib/db/tasks'
import { generateReadinessSummary } from '@/lib/ai'
import type { Metadata } from 'next'

// Cache the Anthropic call for 1 hour per (groupName, date, overallLevel).
// Prevents an API call on every dashboard page view.
const getCachedAiSummary = unstable_cache(
  async (groupName: string, rehearsalDate: string, overall: number) =>
    generateReadinessSummary({
      groupName,
      rehearsalDate,
      readinessData: [{ label: 'Geral', level: overall }],
    }),
  ['dashboard-ai-summary'],
  { revalidate: 3600 },
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>
}): Promise<Metadata> {
  const { groupId } = await params
  try {
    const group = await getGroupById(groupId)
    return { title: group.name }
  } catch {
    return { title: 'Dashboard' }
  }
}

export default async function DashboardPage({
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

  const [group, members, repertoire, readiness] = await Promise.all([
    getGroupById(groupId),
    getMembersByGroup(groupId),
    getRepertoireByGroup(groupId),
    getGroupReadiness(groupId),
  ])

  const overallPct = Math.round(readiness.overall * 100)

  const progressColor =
    overallPct >= 80
      ? 'bg-green-500'
      : overallPct >= 50
        ? 'bg-amber-500'
        : 'bg-red-500'

  const hasData = members.length > 0 && repertoire.length > 0

  let aiSummary: string | null = null
  if (hasData && readiness.overall > 0) {
    try {
      aiSummary = await getCachedAiSummary(
        group.name,
        new Date().toLocaleDateString('pt-BR'),
        Math.round(readiness.overall * 100) / 100, // round to 2dp so minor fluctuations don't bust cache
      )
    } catch {
      // AI summary is optional
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-stone-900">{group.name}</h1>
        <p className="text-sm text-stone-500 mt-0.5">Dashboard</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-stone-500">Músicos</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{members.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500">Repertório</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{repertoire.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500">Prontidão geral</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{overallPct}%</p>
          {overallPct > 0 && (
            <div className="mt-2 h-2 w-full rounded-full bg-stone-100">
              <div
                className={`h-2 rounded-full ${progressColor} transition-all`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* AI summary */}
      {aiSummary && (
        <div className="card border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              Sugestão para o próximo ensaio
            </span>
            <span className="ml-auto text-xs text-stone-400">
              Gerado por IA · Decisão final é sua
            </span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">{aiSummary}</p>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <div className="card text-center py-12">
          <p className="text-stone-500 mb-4">
            Seu grupo está vazio. Adicione músicos e repertório para começar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`/app/groups/${groupId}/musicians`} className="btn-primary">
              Convidar músicos
            </a>
            <a href={`/app/groups/${groupId}/repertoire`} className="btn-secondary">
              Adicionar repertório
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
