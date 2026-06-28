import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroupsByUser } from '@/lib/db/groups'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const groups = await getGroupsByUser()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar groups={groups} />
      <main className="flex-1 overflow-y-auto bg-stone-50">{children}</main>
    </div>
  )
}
