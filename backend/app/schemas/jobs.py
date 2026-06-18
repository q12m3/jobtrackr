from datetime import datetime

from pydantic import BaseModel


class JobOut(BaseModel):
    id: int
    title: str
    company: str
    tags: list[str]
    salary_min: int | None
    salary_max: int | None
    url: str
    posted_at: datetime | None
    demand_score: int
    scraped_at: datetime

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    items: list[JobOut]
    total: int
    page: int
    pages: int


class TagStat(BaseModel):
    tag: str
    count: int


class ScoreBucket(BaseModel):
    range: str
    count: int


class AnalyticsResponse(BaseModel):
    top_tags: list[TagStat]
    avg_salary_min: float | None
    avg_salary_max: float | None
    score_distribution: list[ScoreBucket]
    total_jobs: int
