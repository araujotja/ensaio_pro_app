import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroupsByUser } from '@/lib/db/groups'

export default async function AppRootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const groups = await getGroupsByUser()

  if (!groups || groups.length === 0) redirect('/onboarding')

  redirect(`/app/groups/${groups[0].id}/dashboard`)
}
