'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tag, setTag] = useState(searchParams.get('tag') ?? '')
  const [minScore, setMinScore] = useState(searchParams.get('min_score') ?? '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') ?? '')

  function apply(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (tag.trim()) params.set('tag', tag.trim())
    if (minScore) params.set('min_score', minScore)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    router.push(`/?${params.toString()}`)
  }

  function reset() {
    setTag('')
    setMinScore('')
    setDateFrom('')
    setDateTo('')
    router.push('/')
  }

  const hasFilters = !!(tag || minScore || dateFrom || dateTo)

  return (
    <form
      onSubmit={apply}
      className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          label="Tag"
          placeholder="python, react, aws…"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <Input
          label="Min Score"
          type="number"
          min="0"
          max="100"
          placeholder="0 – 100"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
        />
        <Input
          label="Posted After"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          label="Posted Before"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Clear
          </Button>
        )}
      </div>
    </form>
  )
}
