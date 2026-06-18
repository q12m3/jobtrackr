'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Job } from '@/lib/types'
import { formatSalary, formatDate, scoreColor, cn } from '@/lib/utils'

interface JobCardProps {
  job: Job
  inWatchlist: boolean
  onWatchlistToggle: () => Promise<void> | void
}

export function JobCard({ job, inWatchlist, onWatchlistToggle }: JobCardProps) {
  const [toggling, setToggling] = useState(false)

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (toggling) return
    setToggling(true)
    await onWatchlistToggle()
    setToggling(false)
  }

  return (
    <Link href={`/jobs/${job.id}`} className="block group">
      <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate text-base">
              {job.title}
            </h3>
            <p className="text-sm text-zinc-400 mt-0.5">{job.company}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className={cn('text-xl font-bold', scoreColor(job.demand_score))}>
                {job.demand_score}
              </span>
              <p className="text-[10px] text-zinc-600 leading-none mt-0.5">score</p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              aria-label={inWatchlist ? 'Remove from watchlist' : 'Save to watchlist'}
              className={cn(
                'p-2 rounded-lg text-lg transition-colors disabled:opacity-50',
                inWatchlist
                  ? 'text-indigo-400 bg-indigo-950/60 hover:bg-red-950/60 hover:text-red-400'
                  : 'text-zinc-600 hover:text-indigo-400 hover:bg-indigo-950/40',
              )}
            >
              {inWatchlist ? '★' : '☆'}
            </button>
          </div>
        </div>

        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.tags.slice(0, 7).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/80"
              >
                {tag}
              </span>
            ))}
            {job.tags.length > 7 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-500 border border-zinc-700/80">
                +{job.tags.length - 7}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
          <span>{formatSalary(job.salary_min, job.salary_max)}</span>
          <span className="text-zinc-700">·</span>
          <span>{formatDate(job.posted_at)}</span>
        </div>
      </article>
    </Link>
  )
}
