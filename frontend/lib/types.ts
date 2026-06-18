export type User = {
  id: number
  email: string
  plan: string
  trial_ends_at: string | null
}

export type Job = {
  id: number
  title: string
  company: string
  tags: string[]
  salary_min: number | null
  salary_max: number | null
  url: string
  posted_at: string | null
  demand_score: number
  scraped_at: string
}

export type JobListResponse = {
  items: Job[]
  total: number
  page: number
  pages: number
}

export type WatchlistItem = {
  id: number
  job_id: number
  saved_at: string
  job: Job
}

export type WatchlistResponse = {
  items: WatchlistItem[]
  total: number
}

export type TagStat = { tag: string; count: number }
export type ScoreBucket = { range: string; count: number }

export type AnalyticsResponse = {
  top_tags: TagStat[]
  avg_salary_min: number | null
  avg_salary_max: number | null
  score_distribution: ScoreBucket[]
  total_jobs: number
}
