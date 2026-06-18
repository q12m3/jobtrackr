from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Stripe
    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_price_pro: str
    stripe_price_enterprise: str

    # App
    app_name: str = "JobTrackr"
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"


settings = Settings()
