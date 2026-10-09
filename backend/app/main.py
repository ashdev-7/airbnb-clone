"""Application factory. Run with `uvicorn app.main:create_app --factory`."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import Settings
from app.core.errors import register_error_handlers
from app.core.logging import RequestIdMiddleware, configure_logging
from app.db.engine import create_db_engine
from app.db.schema import create_schema
from app.db.session import Database
from app.health.router import router as health_router

API_PREFIX = "/api"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging()

    database = Database(create_db_engine(settings.database_url, settings.sqlite_busy_timeout_ms))
    create_schema(database.engine)

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

    app.add_middleware(RequestIdMiddleware)
    register_error_handlers(app)
    app.include_router(health_router, prefix=API_PREFIX)
    return app
