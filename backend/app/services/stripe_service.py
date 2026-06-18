import logging

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import User

logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key

_PLAN_BY_PRICE: dict[str, str] = {
    settings.stripe_price_pro: "pro",
    settings.stripe_price_enterprise: "enterprise",
}

_PRICE_BY_PLAN: dict[str, str] = {
    "pro": settings.stripe_price_pro,
    "enterprise": settings.stripe_price_enterprise,
}


async def get_or_create_stripe_customer(user: User, db: AsyncSession) -> str:
    if user.stripe_customer_id:
        return user.stripe_customer_id

    customer = stripe.Customer.create(
        email=user.email,
        metadata={"user_id": str(user.id)},
    )
    user.stripe_customer_id = customer.id
    await db.flush()
    return customer.id


async def create_checkout_session(user: User, plan: str, db: AsyncSession) -> str:
    if plan not in _PRICE_BY_PLAN:
        raise ValueError(f"Unknown plan: {plan}")

    customer_id = await get_or_create_stripe_customer(user, db)
    price_id = _PRICE_BY_PLAN[plan]

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        subscription_data={"trial_period_days": 7},
        success_url=f"{settings.frontend_url}/settings?checkout=success",
        cancel_url=f"{settings.frontend_url}/settings?checkout=cancelled",
        metadata={"user_id": str(user.id), "plan": plan},
    )
    return session.url


async def create_portal_session(user: User, db: AsyncSession) -> str:
    customer_id = await get_or_create_stripe_customer(user, db)
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.frontend_url}/settings",
    )
    return session.url


async def handle_subscription_updated(event_data: dict, db: AsyncSession) -> None:
    subscription = event_data["object"]
    customer_id: str = subscription["customer"]
    status: str = subscription["status"]
    price_id: str = subscription["items"]["data"][0]["price"]["id"]

    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()
    if user is None:
        logger.warning("No user found for Stripe customer %s", customer_id)
        return

    if status in ("active", "trialing"):
        user.plan = _PLAN_BY_PRICE.get(price_id, "free")
    elif status in ("canceled", "incomplete_expired", "unpaid"):
        user.plan = "free"

    if status == "trialing":
        from datetime import datetime, timezone
        trial_end_ts = subscription.get("trial_end")
        if trial_end_ts:
            user.trial_ends_at = datetime.fromtimestamp(trial_end_ts, tz=timezone.utc)
    else:
        user.trial_ends_at = None

    await db.flush()
    logger.info("Updated user %s plan to %s (status=%s)", user.id, user.plan, status)


async def handle_subscription_deleted(event_data: dict, db: AsyncSession) -> None:
    subscription = event_data["object"]
    customer_id: str = subscription["customer"]

    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()
    if user is None:
        logger.warning("No user found for Stripe customer %s", customer_id)
        return

    user.plan = "free"
    user.trial_ends_at = None
    await db.flush()
    logger.info("Downgraded user %s to free (subscription deleted)", user.id)
