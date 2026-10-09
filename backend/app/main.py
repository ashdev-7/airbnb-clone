"""Application factory. Run with `uvicorn app.main:create_app --factory`."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.bookings.router import router as bookings_router
from app.core.config import Settings
from app.core.errors import register_error_handlers
from app.core.logging import RequestIdMiddleware, configure_logging
from app.db.engine import create_db_engine
from app.db.schema import create_schema
from app.db.session import Database
from app.health.router import router as health_router
from app.listings.router import router as listings_router
from app.reviews.router import router as reviews_router
from app.users.router import router as auth_router
from app.wishlist.router import router as wishlist_router

API_PREFIX = "/api"
SESSION_COOKIE = "airstay_session"
SESSION_SECONDS = 14 * 24 * 60 * 60


def _seed_if_empty(database: Database, settings: Settings) -> None:
    """Loads the sample data once, on the first start against an empty database
    (SEED_ON_EMPTY, used in deployment). A database that has users is left alone."""
    from sqlalchemy import func, select

    from app.core.clock import today
    from app.seed.loader import seed_database
    from app.users.models import User

    with database.read_session() as session:
        users = session.scalar(select(func.count()).select_from(User)) or 0
    if users == 0:
        seed_database(database, today(settings.app_timezone), settings.service_fee_bps)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging()

    database = Database(create_db_engine(settings.database_url, settings.sqlite_busy_timeout_ms))
    create_schema(database.engine)
    if settings.seed_on_empty:
        _seed_if_empty(database, settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        yield
        database.engine.dispose()

    app = FastAPI(
        title="AirStay API",
        lifespan=lifespan,
        docs_url=f"{API_PREFIX}/docs",
        openapi_url=f"{API_PREFIX}/openapi.json",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.database = database

    # A signed, HttpOnly cookie holding only the user id (plan §10.9). SameSite=Lax keeps
    # other sites from sending it with a state-changing request.
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.secret_key,
        session_cookie=SESSION_COOKIE,
        max_age=SESSION_SECONDS,
        same_site="lax",
        https_only=settings.cookie_secure,
    )
    app.add_middleware(RequestIdMiddleware)  # added last, so it wraps everything else
    register_error_handlers(app)
    for router in (
        health_router,
        auth_router,
        listings_router,
        bookings_router,
        reviews_router,
        wishlist_router,
    ):
        app.include_router(router, prefix=API_PREFIX)
    return app
