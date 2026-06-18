'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { WatchlistItem } from '@/lib/types'
import { JobCard } from '@/components/JobCard'
import { JobCardSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

export default function WatchlistPage() {
  const toast = useToast()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWatchlist = useCallback(async () => {
    try {
      const data = await api.get<{ items: WatchlistItem[]; total: number }>('/watchlist')
      setItems(data.items)
    } catch {
      toast('Failed to load watchlist', 'error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  async function removeFromWatchlist(jobId: number) {
    const previous = items
    setItems((prev) => prev.filter((i) => i.job_id !== jobId))

    try {
      await api.delete(`/watchlist/${jobId}`)
      toast('Removed from watchlist', 'info')
    } catch (err) {
      setItems(previous)
      toast(err instanceof ApiError ? err.message : 'Failed to remove', 'error')
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        {!loading && (
          <p className="text-sm text-zinc-500">
            {items.length} saved {items.length === 1 ? 'job' : 'jobs'}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <JobCardSkeleton key={i} />)
          : items.map((item) => (
              <JobCard
                key={item.id}
                job={item.job}
                inWatchlist
                onWatchlistToggle={() => removeFromWatchlist(item.job_id)}
              />
            ))}

        {!loading && items.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-lg">No saved jobs yet</p>
            <p className="text-sm mt-1">
              Click ☆ on any job card to save it here
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
