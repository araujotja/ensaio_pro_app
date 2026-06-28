'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Music, ClipboardList, MessageSquare,
  Users, Crown, Settings, ChevronDown, Plus, LogOut, Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AppGroup } from '@/types/database'
import { cn } from '@/utils/cn'

interface Props {
  groups: AppGroup[]
  children: React.ReactNode
}

const NAV = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'repertoire', label: 'Repertório', Icon: Music },
  { key: 'tasks', label: 'Tarefas', Icon: ClipboardList },
  { key: 'musicians', label: 'Músicos', Icon: Users },
  { key: 'community', label: 'Comunidade', Icon: MessageSquare },
  { key: 'leaders', label: 'Líderes', Icon: Crown },
  { key: 'settings', label: 'Configurações', Icon: Settings },
]

interface NavProps {
  groups: AppGroup[]
  activeGroupId: string | undefined
  activeGroup: AppGroup | undefined
  pathname: string
  showGroups: boolean
  setShowGroups: (v: boolean) => void
  onNavigate: () => void
  onLogout: () => void
}

function SidebarNav({
  groups, activeGroupId, activeGroup, pathname,
  showGroups, setShowGroups, onNavigate, onLogout,
}: NavProps) {
  function navHref(key: string) {
    return `/app/groups/${activeGroupId}/${key}`
  }

  function isActive(key: string) {
    const segment = `/app/groups/${activeGroupId}/${key}`
    return pathname === segment || pathname.startsWith(segment + '/')
  }

  return (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-stone-200 px-4 flex-shrink-0">
        <span className="text-base font-bold text-amber-700">Ensaio Pro</span>
      </div>

      {/* Group selector */}
      <div className="border-b border-stone-200 px-3 py-2 flex-shrink-0">
        <button
          onClick={() => setShowGroups(!showGroups)}
          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          <span className="truncate">{activeGroup?.name ?? 'Selecionar grupo'}</span>
          <ChevronDown
            className={cn('h-4 w-4 text-stone-400 transition-transform', showGroups && 'rotate-180')}
          />
        </button>

        {showGroups && (
          <div className="mt-1 space-y-0.5">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/app/groups/${g.id}/dashboard`}
                onClick={() => { setShowGroups(false); onNavigate() }}
                className={cn(
                  'block truncate rounded-md px-3 py-1.5 text-sm',
                  g.id === activeGroupId
                    ? 'bg-amber-50 text-amber-700 font-medium'
                    : 'text-stone-600 hover:bg-stone-50',
                )}
              >
                {g.name}
              </Link>
            ))}
            <Link
              href="/app/groups/new"
              onClick={() => { setShowGroups(false); onNavigate() }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo grupo
            </Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {NAV.map(({ key, label, Icon }) => (
            <li key={key}>
              <Link
                href={navHref(key)}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(key)
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900',
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-stone-200 p-3 flex-shrink-0">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>
  )
}

export default function AppShell({ groups, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showGroups, setShowGroups] = useState(false)

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const groupIdMatch = pathname.match(/\/app\/groups\/([^/]+)/)
  const activeGroupId = groupIdMatch?.[1] ?? groups[0]?.id
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const navProps: NavProps = {
    groups, activeGroupId, activeGroup, pathname,
    showGroups, setShowGroups,
    onNavigate: () => setMobileOpen(false),
    onLogout: handleLogout,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col border-r border-stone-200 bg-white">
        <SidebarNav {...navProps} />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-white shadow-xl">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav {...navProps} />
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center h-14 border-b border-stone-200 bg-white px-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-base font-bold text-amber-700">Ensaio Pro</span>
          {activeGroup && (
            <span className="ml-2 text-sm text-stone-400 truncate hidden sm:block">
              · {activeGroup.name}
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-stone-50">
          {children}
        </main>
      </div>
    </div>
  )
}
