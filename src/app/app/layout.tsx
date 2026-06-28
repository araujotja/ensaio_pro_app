import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroupsByUser } from '@/lib/db/groups'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const groups = await getGroupsByUser()

  return <AppShell groups={groups}>{children}</AppShell>
}
