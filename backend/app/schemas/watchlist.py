from datetime import datetime

from pydantic import BaseModel

from app.schemas.jobs import JobOut


class WatchlistItemOut(BaseModel):
    id: int
    job_id: int
    saved_at: datetime
    job: JobOut

    model_config = {"from_attributes": True}


class WatchlistResponse(BaseModel):
    items: list[WatchlistItemOut]
    total: int
