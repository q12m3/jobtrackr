'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface PaginationProps {
  page: number
  pages: number
  total: number
}

export function Pagination({ page, pages, total }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-500">
        Page <span className="text-zinc-300">{page}</span> of{' '}
        <span className="text-zinc-300">{pages}</span>
        <span className="hidden sm:inline"> · {total.toLocaleString()} total</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
        >
          ← Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => goTo(page + 1)}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}
