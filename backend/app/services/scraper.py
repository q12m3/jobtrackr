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

_REMOTEOK_URL = "https://remoteok.com/remote-dev-jobs"
_SALARY_RE = re.compile(r"\$?([\d,]+)k?", re.IGNORECASE)


def _parse_salary_value(raw: str) -> int | None:
    raw = raw.strip().replace(",", "")
    match = _SALARY_RE.search(raw)
    if not match:
        return None
    value = int(match.group(1))
    if "k" in raw.lower() or value < 1000:
        value *= 1000
    return value


def _parse_salary(salary_text: str) -> tuple[int | None, int | None]:
    salary_text = salary_text.strip()
    if not salary_text or salary_text in ("-", "N/A", ""):
        return None, None

    parts = re.split(r"[-–—]", salary_text)
    if len(parts) == 2:
        return _parse_salary_value(parts[0]), _parse_salary_value(parts[1])
    if len(parts) == 1:
        val = _parse_salary_value(parts[0])
        return val, val
    return None, None


def _parse_posted_at(epoch_str: str | None) -> datetime | None:
    if not epoch_str:
        return None
    try:
        return datetime.fromtimestamp(int(epoch_str), tz=timezone.utc)
    except (ValueError, OSError):
        return None


async def _scrape_jobs() -> list[dict]:
    jobs: list[dict] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        try:
            await page.goto(_REMOTEOK_URL, wait_until="domcontentloaded", timeout=60_000)
            await page.wait_for_selector("tr.job", timeout=30_000)
        except PlaywrightTimeout:
            logger.warning("Timeout waiting for job rows on remoteok.com")
            await browser.close()
            return jobs

        rows = await page.query_selector_all("tr.job")
        logger.info("Found %d job rows", len(rows))

        for row in rows:
            try:
                job_url_path = await row.get_attribute("data-url")
                epoch = await row.get_attribute("data-epoch")

                if not job_url_path:
                    continue

                url = f"https://remoteok.com{job_url_path}"

                title_el = await row.query_selector("h2[itemprop='title']")
                title = (await title_el.inner_text()).strip() if title_el else None
                if not title:
                    continue

                company_el = await row.query_selector("h3[itemprop='name']")
                company = (await company_el.inner_text()).strip() if company_el else "Unknown"

                tag_els = await row.query_selector_all(".tags .tag")
                tags: list[str] = []
                for tag_el in tag_els:
                    text = (await tag_el.inner_text()).strip()
                    if text:
                        tags.append(text)

                salary_el = await row.query_selector(".salary")
                salary_text = (await salary_el.inner_text()).strip() if salary_el else ""
                salary_min, salary_max = _parse_salary(salary_text)

                posted_at = _parse_posted_at(epoch)

                jobs.append(
                    {
                        "title": title,
                        "company": company,
                        "tags": tags,
                        "salary_min": salary_min,
                        "salary_max": salary_max,
                        "url": url,
                        "posted_at": posted_at,
                    }
                )
            except Exception as exc:
                logger.warning("Failed to parse row: %s", exc)
                continue

        await browser.close()

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
        raw_jobs = await _scrape_jobs()
        logger.info("Scraped %d jobs from remoteok.com", len(raw_jobs))

        async with AsyncSessionLocal() as db:
            inserted = await _upsert_jobs(raw_jobs, db)
            await db.commit()
            logger.info("Inserted %d new jobs", inserted)
    except Exception as exc:
        logger.exception("Scraper job failed: %s", exc)
