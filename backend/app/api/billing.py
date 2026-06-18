import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.billing import CheckoutRequest, CheckoutResponse, PortalResponse
from app.services.stripe_service import (
    create_checkout_session,
    create_portal_session,
    handle_subscription_deleted,
    handle_subscription_updated,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    body: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CheckoutResponse:
    try:
        url = await create_checkout_session(current_user, body.plan, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except stripe.StripeError as exc:
        logger.error("Stripe error during checkout: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Payment provider error")
    return CheckoutResponse(checkout_url=url)


@router.post("/portal", response_model=PortalResponse)
async def billing_portal(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PortalResponse:
    try:
        url = await create_portal_session(current_user, db)
    except stripe.StripeError as exc:
        logger.error("Stripe error creating portal: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Payment provider error")
    return PortalResponse(portal_url=url)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.errors.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")
    except Exception as exc:
        logger.error("Webhook parse error: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed webhook payload")

    event_type: str = event["type"]
    event_data: dict = event["data"]

    try:
        if event_type == "customer.subscription.updated":
            await handle_subscription_updated(event_data, db)
        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(event_data, db)
        else:
            logger.debug("Unhandled Stripe event: %s", event_type)
    except Exception as exc:
        logger.exception("Error handling webhook %s: %s", event_type, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook processing failed")

    return {"received": True}
