'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, ApiError } from '@/lib/api'
import { Job, WatchlistItem } from '@/lib/types'
import { formatSalary, formatDate, scoreColor, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToast()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    api
      .get<Job>(`/jobs/${id}`)
      .then(setJob)
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false))
  }, [id, router])

  useEffect(() => {
    if (!user) return
    api
      .get<{ items: WatchlistItem[] }>('/watchlist')
      .then(({ items }) => setInWatchlist(items.some((i) => i.job_id === Number(id))))
      .catch(() => {})
  }, [user, id])

  async function toggleWatchlist() {
    setToggling(true)
    try {
      if (inWatchlist) {
        await api.delete(`/watchlist/${id}`)
        setInWatchlist(false)
        toast('Removed from watchlist', 'info')
      } else {
        await api.post(`/watchlist/${id}`)
        setInWatchlist(true)
        toast('Saved to watchlist', 'success')
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Action failed', 'error')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-40 rounded-lg" />
          <Skeleton className="h-11 w-28 rounded-lg" />
        </div>
      </main>
    )
  }

  if (!job) return null

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-6"
      >
        ← Back to jobs
      </Link>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white leading-snug">{job.title}</h1>
            <p className="text-zinc-400 mt-1.5 text-lg">{job.company}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className={cn('text-4xl font-bold', scoreColor(job.demand_score))}>
              {job.demand_score}
            </span>
            <p className="text-xs text-zinc-500 mt-1">demand score</p>
          </div>
        </div>

        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-sm bg-zinc-800 text-zinc-200 border border-zinc-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-px mt-6 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-700">
          {[
            { label: 'Salary', value: formatSalary(job.salary_min, job.salary_max) },
            { label: 'Posted', value: formatDate(job.posted_at) },
            { label: 'Scraped', value: formatDate(job.scraped_at) },
            { label: 'Source', value: 'RemoteOK' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 px-4 py-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{label}</p>
              <p className="text-white font-medium mt-1">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Apply on RemoteOK ↗
          </a>
          <Button
            variant="secondary"
            size="lg"
            loading={toggling}
            onClick={toggleWatchlist}
          >
            {inWatchlist ? '★ Saved' : '☆ Save'}
          </Button>
        </div>
      </div>
    </main>
  )
}
