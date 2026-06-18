from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_pro
from app.db.models import Job, User
from app.db.session import get_db
from app.schemas.jobs import AnalyticsResponse, JobListResponse, JobOut, ScoreBucket, TagStat

router = APIRouter(tags=["jobs"])

_PAGE_SIZE = 20


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(1, ge=1),
    tag: str | None = Query(None),
    min_score: int | None = Query(None, ge=0, le=100),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> JobListResponse:
    query = select(Job)

    if tag:
        query = query.where(Job.tags.any(tag))
    if min_score is not None:
        query = query.where(Job.demand_score >= min_score)
    if date_from:
        query = query.where(Job.posted_at >= date_from)
    if date_to:
        query = query.where(Job.posted_at <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total: int = total_result.scalar_one()

    offset = (page - 1) * _PAGE_SIZE
    query = query.order_by(Job.demand_score.desc(), Job.scraped_at.desc()).offset(offset).limit(_PAGE_SIZE)
    result = await db.execute(query)
    jobs = result.scalars().all()

    pages = max(1, (total + _PAGE_SIZE - 1) // _PAGE_SIZE)
    return JobListResponse(items=list(jobs), total=total, page=page, pages=pages)


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_pro),
) -> AnalyticsResponse:
    total_result = await db.execute(select(func.count()).select_from(Job))
    total: int = total_result.scalar_one()

    tag_rows = await db.execute(
        text(
            """
            SELECT tag, COUNT(*) AS cnt
            FROM jobs, unnest(tags) AS tag
            GROUP BY tag
            ORDER BY cnt DESC
            LIMIT 10
            """
        )
    )
    top_tags = [TagStat(tag=row.tag, count=row.cnt) for row in tag_rows]

    salary_result = await db.execute(
        select(
            func.avg(Job.salary_min).label("avg_min"),
            func.avg(Job.salary_max).label("avg_max"),
        ).where(Job.salary_min.isnot(None))
    )
    salary_row = salary_result.one()
    avg_salary_min = float(salary_row.avg_min) if salary_row.avg_min is not None else None
    avg_salary_max = float(salary_row.avg_max) if salary_row.avg_max is not None else None

    bucket_rows = await db.execute(
        text(
            """
            SELECT
                CASE
                    WHEN demand_score BETWEEN 0  AND 20  THEN '0-20'
                    WHEN demand_score BETWEEN 21 AND 40  THEN '21-40'
                    WHEN demand_score BETWEEN 41 AND 60  THEN '41-60'
                    WHEN demand_score BETWEEN 61 AND 80  THEN '61-80'
                    WHEN demand_score BETWEEN 81 AND 100 THEN '81-100'
                END AS range,
                COUNT(*) AS cnt
            FROM jobs
            GROUP BY range
            ORDER BY range
            """
        )
    )
    score_distribution = [
        ScoreBucket(range=row.range, count=row.cnt)
        for row in bucket_rows
        if row.range is not None
    ]

    return AnalyticsResponse(
        top_tags=top_tags,
        avg_salary_min=avg_salary_min,
        avg_salary_max=avg_salary_max,
        score_distribution=score_distribution,
        total_jobs=total,
    )
