'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import { JobListResponse, WatchlistItem } from '@/lib/types'
import { JobCard } from '@/components/JobCard'
import { FilterBar } from '@/components/FilterBar'
import { Pagination } from '@/components/Pagination'
import { JobCardSkeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'

function DashboardContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()

  const page = Number(searchParams.get('page') ?? '1')
  const tag = searchParams.get('tag') ?? ''
  const minScore = searchParams.get('min_score') ?? ''
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''

  const [data, setData] = useState<JobListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set())

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (tag) params.set('tag', tag)
    if (minScore) params.set('min_score', minScore)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)

    try {
      const result = await api.get<JobListResponse>(`/jobs?${params.toString()}`)
      setData(result)
    } catch {
      toast('Failed to load jobs', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, tag, minScore, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    if (!user) return
    api
      .get<{ items: WatchlistItem[] }>('/watchlist')
      .then(({ items }) => setWatchlistIds(new Set(items.map((i) => i.job_id))))
      .catch(() => {})
  }, [user])

  async function toggleWatchlist(jobId: number) {
    const inList = watchlistIds.has(jobId)
    setWatchlistIds((prev) => {
      const next = new Set(prev)
      inList ? next.delete(jobId) : next.add(jobId)
      return next
    })
    try {
      if (inList) {
        await api.delete(`/watchlist/${jobId}`)
        toast('Removed from watchlist', 'info')
      } else {
        await api.post(`/watchlist/${jobId}`)
        toast('Saved to watchlist', 'success')
      }
    } catch (err) {
      setWatchlistIds((prev) => {
        const next = new Set(prev)
        inList ? next.add(jobId) : next.delete(jobId)
        return next
      })
      toast(err instanceof ApiError ? err.message : 'Action failed', 'error')
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Feed</h1>
          {data && !loading && (
            <p className="text-sm text-zinc-500 mt-1">
              {data.total.toLocaleString()} jobs found
            </p>
          )}
        </div>
      </div>

      <FilterBar />

      <div className="mt-5 space-y-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)
          : data?.items.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                inWatchlist={watchlistIds.has(job.id)}
                onWatchlistToggle={() => toggleWatchlist(job.id)}
              />
            ))}

        {!loading && data?.items.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-lg">No jobs match your filters</p>
            <p className="text-sm mt-1">Try adjusting or clearing the filters</p>
          </div>
        )}
      </div>

      {!loading && data && data.pages > 1 && (
        <div className="mt-8">
          <Pagination page={data.page} pages={data.pages} total={data.total} />
        </div>
      )}
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
