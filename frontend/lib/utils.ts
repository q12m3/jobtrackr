export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatSalary(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'Salary not listed'
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`
  if (max != null) return `Up to ${fmt(max)}`
  return `From ${fmt(min!)}`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-zinc-400'
}
