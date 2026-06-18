from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "enterprise"


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str
