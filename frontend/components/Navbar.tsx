'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, isPro } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

function PlanBadge({ plan, trialEndsAt }: { plan: string; trialEndsAt: string | null }) {
  const isTrial =
    plan === 'free' && trialEndsAt && new Date(trialEndsAt) > new Date()

  if (isTrial) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
        Trial
      </span>
    )
  }
  if (plan === 'enterprise') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">
        Enterprise
      </span>
    )
  }
  if (plan === 'pro') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
        Pro
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-700 text-zinc-400 border border-zinc-600">
      Free
    </span>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
      )}
    >
      {children}
    </Link>
  )
}

export function Navbar() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const router = useRouter()

  async function handleLogout() {
    try {
      await logout()
      toast('Logged out', 'info')
      router.push('/login')
    } catch {
      toast('Logout failed', 'error')
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Job<span className="text-indigo-400">Trackr</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/watchlist">Watchlist</NavLink>
            {isPro(user) && <NavLink href="/analytics">Analytics</NavLink>}
            <NavLink href="/settings">Settings</NavLink>
          </nav>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-xs text-zinc-500 max-w-[180px] truncate">
              {user.email}
            </span>
            <PlanBadge plan={user.plan} trialEndsAt={user.trial_ends_at} />
            <button
              onClick={handleLogout}
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
