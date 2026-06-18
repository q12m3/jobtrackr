from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.db.models import Job, User, Watchlist
from app.db.session import get_db
from app.schemas.watchlist import WatchlistItemOut, WatchlistResponse

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("", response_model=WatchlistResponse)
async def get_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WatchlistResponse:
    count_result = await db.execute(
        select(func.count()).where(Watchlist.user_id == current_user.id)
    )
    total: int = count_result.scalar_one()

    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == current_user.id)
        .options(selectinload(Watchlist.job))
        .order_by(Watchlist.saved_at.desc())
    )
    items = result.scalars().all()

    return WatchlistResponse(items=list(items), total=total)


@router.post("/{job_id}", response_model=WatchlistItemOut, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Watchlist:
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    entry = Watchlist(user_id=current_user.id, job_id=job_id)
    db.add(entry)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Job already in watchlist",
        )

    await db.refresh(entry)

    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.id == entry.id)
        .options(selectinload(Watchlist.job))
    )
    return result.scalar_one()


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.job_id == job_id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not in watchlist",
        )
    await db.delete(entry)
