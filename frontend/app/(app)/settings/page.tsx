'use client'

import { useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { useAuth, isPro } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { formatDate, cn } from '@/lib/utils'

type PlanConfig = {
  id: string
  name: string
  price: string
  description: string
  features: string[]
  highlight: boolean
}

const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Get started',
    features: ['10 jobs/day', 'Job feed & search', 'Watchlist (5 jobs)'],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19/mo',
    description: 'Most popular',
    features: [
      'Unlimited job listings',
      'Full analytics dashboard',
      'Unlimited watchlist',
      '7-day free trial',
    ],
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$49/mo',
    description: 'For teams',
    features: ['Everything in Pro', 'REST API access', 'Priority support', 'Custom integrations'],
    highlight: false,
  },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const isTrial =
    user?.plan === 'free' &&
    user.trial_ends_at != null &&
    new Date(user.trial_ends_at) > new Date()

  const effectivePlan = isTrial ? 'pro' : (user?.plan ?? 'free')

  async function handleUpgrade(plan: string) {
    setCheckoutLoading(plan)
    try {
      const { checkout_url } = await api.post<{ checkout_url: string }>('/billing/checkout', {
        plan,
      })
      window.location.href = checkout_url
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Checkout failed', 'error')
      setCheckoutLoading(null)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const { portal_url } = await api.post<{ portal_url: string }>('/billing/portal')
      window.location.href = portal_url
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to open billing portal', 'error')
      setPortalLoading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {/* Account */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
          Account
        </h2>
        <div className="divide-y divide-zinc-800">
          <Row label="Email" value={user?.email ?? '—'} />
          <Row
            label="Plan"
            value={
              <span className="flex items-center gap-2">
                <span className="capitalize">{isTrial ? 'Pro (Trial)' : user?.plan}</span>
                {isTrial && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    trial
                  </span>
                )}
              </span>
            }
          />
          {isTrial && user?.trial_ends_at && (
            <Row
              label="Trial ends"
              value={
                <span className="text-amber-400">{formatDate(user.trial_ends_at)}</span>
              }
            />
          )}
        </div>
      </section>

      {/* Billing */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Billing
          </h2>
          {isPro(user) && (
            <Button
              variant="secondary"
              size="sm"
              loading={portalLoading}
              onClick={handleManageBilling}
            >
              Manage billing ↗
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = effectivePlan === plan.id
            const canUpgrade = !isCurrent && plan.id !== 'free'

            return (
              <div
                key={plan.id}
                className={cn(
                  'rounded-xl border p-5 flex flex-col transition-colors',
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-950/30'
                    : plan.highlight
                      ? 'border-zinc-600 bg-zinc-800/50'
                      : 'border-zinc-700 bg-zinc-800/30',
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-white">{plan.name}</p>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white shrink-0">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mb-1">{plan.description}</p>
                <p className="text-2xl font-bold text-white mb-4">{plan.price}</p>

                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-zinc-400 flex items-start gap-2">
                      <span className="text-emerald-500 mt-px leading-none">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {canUpgrade && (
                  <Button
                    size="sm"
                    variant={plan.highlight ? 'primary' : 'secondary'}
                    className="w-full"
                    loading={checkoutLoading === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    Upgrade to {plan.name}
                  </Button>
                )}

                {isCurrent && plan.id === 'free' && (
                  <p className="text-xs text-zinc-600 text-center">Your current plan</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  )
}
