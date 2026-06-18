from datetime import datetime, timezone


def compute_demand_score(
    tags: list[str],
    salary_max: int | None,
    salary_min: int | None,
    posted_at: datetime | None,
) -> int:
    score = 50

    if salary_max is not None and salary_max > 100_000:
        score += 10

    tags_lower = [t.lower() for t in tags]
    if "python" in tags_lower:
        score += 15
    if "react" in tags_lower:
        score += 10

    if posted_at is not None:
        age_hours = (datetime.now(timezone.utc) - posted_at).total_seconds() / 3600
        if age_hours <= 24:
            score += 15

    if salary_min is None and salary_max is None:
        score -= 10

    return max(0, min(100, score))
