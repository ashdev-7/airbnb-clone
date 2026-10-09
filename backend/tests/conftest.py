"""Shared fixtures: every test gets its own app on its own temporary SQLite file."""

import sqlite3
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.session import Database
from app.main import create_app
from tests.support import PROBE_TABLE_DDL, probe_router

AppFactory = Callable[..., FastAPI]


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    return tmp_path / "test.db"


@pytest.fixture
def make_app(db_path: Path) -> Iterator[AppFactory]:
    """Build an app on the temporary database; keyword arguments override settings."""
    apps: list[FastAPI] = []

    def factory(**overrides: object) -> FastAPI:
        values: dict[str, object] = {
            "database_url": f"sqlite:///{db_path.as_posix()}",
            "secret_key": "test-secret",
        }
        values.update(overrides)
        # _env_file=None: tests never read a developer's backend/.env.
        settings = Settings(_env_file=None, **values)  # type: ignore[arg-type]
        app = create_app(settings)
        app.include_router(probe_router, prefix="/api")
        database: Database = app.state.database
        with database.engine.connect() as connection:
            connection.exec_driver_sql(PROBE_TABLE_DDL)
            connection.commit()
        apps.append(app)
        return app

    yield factory
    for app in apps:
        app.state.database.engine.dispose()


@pytest.fixture
def app(make_app: AppFactory) -> FastAPI:
    return make_app()


@pytest.fixture
def database(app: FastAPI) -> Database:
    database: Database = app.state.database
    return database


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def other_connection(db_path: Path, app: FastAPI) -> Iterator[sqlite3.Connection]:
    """A second, independent connection that fails at once instead of waiting for a lock."""
    connection = sqlite3.connect(db_path, timeout=0, isolation_level=None, check_same_thread=False)
    yield connection
    connection.close()
