import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.services.scraper import run_scraper

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def setup_scheduler() -> None:
    scheduler.add_job(
        run_scraper,
        trigger=IntervalTrigger(hours=6),
        id="scraper_job",
        name="RemoteOK scraper",
        replace_existing=True,
        misfire_grace_time=300,
    )
    logger.info("Scheduler configured: scraper runs every 6 hours")


def start_scheduler() -> None:
    setup_scheduler()
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
