import logging
import re
from datetime import datetime, timezone

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job
from app.db.session import AsyncSessionLocal
from app.services.calculation import compute_demand_score

logger = logging.getLogger(__name__)

_REMOTEOK_URL = "https://remoteok.com/api"


def _parse_salary(salary_min: int | None, salary_max: int | None) -> tuple[int | None, int | None]:
    if salary_min and salary_min > 0:
        s_min = salary_min
    else:
        s_min = None
    if salary_max and salary_max > 0:
        s_max = salary_max
    else:
        s_max = None
    return s_min, s_max


def _parse_posted_at(epoch: int | None) -> datetime | None:
    if not epoch:
        return None
    try:
        return datetime.fromtimestamp(epoch, tz=timezone.utc)
    except (ValueError, OSError):
        return None


async def _fetch_jobs_via_api() -> list[dict]:
    jobs: list[dict] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        try:
            await page.goto(_REMOTEOK_URL, wait_until="domcontentloaded", timeout=60_000)
            await page.wait_for_timeout(2000)
            raw_text = await page.evaluate("() => document.body.innerText")
        except PlaywrightTimeout:
            logger.warning("Timeout fetching remoteok API")
            await browser.close()
            return jobs

        await browser.close()

    import json
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.error("Failed to parse remoteok JSON response")
        return jobs

    for item in data:
        if not isinstance(item, dict):
            continue
        if item.get("legal"):
            continue

        url = item.get("url") or item.get("apply_url", "")
        if not url:
            slug = item.get("slug", "")
            if slug:
                url = f"https://remoteok.com/remote-jobs/{slug}"
            else:
                continue

        if not url.startswith("http"):
            url = f"https://remoteok.com{url}"

        title = item.get("position") or item.get("title", "")
        if not title:
            continue

        company = item.get("company", "Unknown")

        tags: list[str] = item.get("tags", []) or []
        tags = [t for t in tags if isinstance(t, str)]

        salary_min, salary_max = _parse_salary(
            item.get("salary_min"),
            item.get("salary_max"),
        )

        epoch = item.get("epoch") or item.get("date")
        posted_at = _parse_posted_at(epoch)

        jobs.append({
            "title": title,
            "company": company,
            "tags": tags,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "url": url,
            "posted_at": posted_at,
        })

    logger.info("Parsed %d jobs from remoteok API", len(jobs))
    return jobs


async def _upsert_jobs(raw_jobs: list[dict], db: AsyncSession) -> int:
    inserted = 0

    existing_urls_result = await db.execute(select(Job.url))
    existing_urls: set[str] = {row[0] for row in existing_urls_result.fetchall()}

    for data in raw_jobs:
        if data["url"] in existing_urls:
            continue

        score = compute_demand_score(
            tags=data["tags"],
            salary_max=data["salary_max"],
            salary_min=data["salary_min"],
            posted_at=data["posted_at"],
        )

        job = Job(
            title=data["title"],
            company=data["company"],
            tags=data["tags"],
            salary_min=data["salary_min"],
            salary_max=data["salary_max"],
            url=data["url"],
            posted_at=data["posted_at"],
            demand_score=score,
        )
        db.add(job)
        existing_urls.add(data["url"])
        inserted += 1

    await db.flush()
    return inserted


async def run_scraper() -> None:
    logger.info("Scraper job started")
    try:
        raw_jobs = await _fetch_jobs_via_api()
        logger.info("Fetched %d jobs from remoteok.com", len(raw_jobs))

        async with AsyncSessionLocal() as db:
            inserted = await _upsert_jobs(raw_jobs, db)
            await db.commit()
            logger.info("Inserted %d new jobs", inserted)
    except Exception as exc:
        logger.exception("Scraper job failed: %s", exc)
