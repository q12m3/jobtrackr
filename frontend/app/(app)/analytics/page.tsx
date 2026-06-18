'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, ApiError } from '@/lib/api'
import { AnalyticsResponse } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'

const SCORE_COLORS: Record<string, string> = {
  '0-20': '#ef4444',
  '21-40': '#f97316',
  '41-60': '#eab308',
  '61-80': '#22c55e',
  '81-100': '#10b981',
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: '#f4f4f5' },
  itemStyle: { color: '#818cf8' },
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-bold text-white mt-1.5">{value}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h3 className="text-sm font-semibold text-zinc-300 mb-5">{title}</h3>
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const { loading: authLoading } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    if (authLoading) return
    api
      .get<AnalyticsResponse>('/analytics')
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true)
        }
      })
      .finally(() => setLoading(false))
  }, [authLoading])

  if (loading || authLoading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-36" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </main>
    )
  }

  if (forbidden) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center max-w-md w-full">
          <div className="text-5xl mb-5">📊</div>
          <h2 className="text-2xl font-bold text-white">Analytics requires Pro</h2>
          <p className="text-zinc-400 mt-2 mb-8 text-sm leading-relaxed">
            Upgrade to Pro to unlock job market analytics — top tags, salary trends, and demand
            score distributions.
          </p>
          <Button size="lg" className="w-full" onClick={() => router.push('/settings')}>
            Upgrade to Pro
          </Button>
        </div>
      </main>
    )
  }

  if (!data) return null

  const avgSalaryData = [
    { name: 'Avg Min', value: data.avg_salary_min ?? 0 },
    { name: 'Avg Max', value: data.avg_salary_max ?? 0 },
  ]

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-zinc-500">
          {data.total_jobs.toLocaleString()} jobs analyzed
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Avg Salary Min"
          value={data.avg_salary_min ? `$${Math.round(data.avg_salary_min / 1000)}k` : '—'}
        />
        <StatCard
          label="Avg Salary Max"
          value={data.avg_salary_max ? `$${Math.round(data.avg_salary_max / 1000)}k` : '—'}
        />
        <StatCard label="Total Jobs" value={data.total_jobs.toLocaleString()} />
        <StatCard label="Top Tag" value={data.top_tags[0]?.tag ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top 10 Tags by Job Count">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.top_tags}
              layout="vertical"
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} />
              <YAxis
                type="category"
                dataKey="tag"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                width={72}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demand Score Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.score_distribution}
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.score_distribution.map((entry) => (
                  <Cell key={entry.range} fill={SCORE_COLORS[entry.range] ?? '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Salary Range (USD)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={avgSalaryData}
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: number) => [`$${v.toLocaleString()}`, 'Average']}
              />
              <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </main>
  )
}
