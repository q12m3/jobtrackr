import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.watchlist import router as watchlist_router
from app.api.billing import router as billing_router
from app.core.config import settings
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.scraper import run_scraper

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    start_scheduler()
    # Run scraper once immediately on startup so the DB is not empty
    await run_scraper()
    yield
    stop_scheduler()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(watchlist_router)
app.include_router(billing_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
