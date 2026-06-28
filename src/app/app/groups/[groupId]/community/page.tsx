import { MessageSquare } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Comunidade' }

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Comunidade</h1>
      </div>

      <div className="card text-center py-16">
        <MessageSquare className="mx-auto h-12 w-12 text-stone-300 mb-4" />
        <p className="font-medium text-stone-700">Feed e canais por naipe</p>
        <p className="text-sm text-stone-500 mt-1">Em breve.</p>
      </div>
    </div>
  )
}
