"""Application settings, read from the environment and `backend/.env` (plan §7.6)."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/app.db"
    # The only secret. No default: a missing key must fail at startup, not sign cookies weakly.
    secret_key: str = Field(min_length=1)
    service_fee_bps: int = Field(default=1500, ge=0, le=10_000)
    app_timezone: str = "Asia/Kolkata"
    seed_on_empty: bool = False
    # True behind HTTPS (production): the session cookie is then sent over HTTPS only.
    cookie_secure: bool = False
    # How long a writer waits for SQLite's write lock before the request fails with 503.
    sqlite_busy_timeout_ms: int = Field(default=5000, ge=0)
