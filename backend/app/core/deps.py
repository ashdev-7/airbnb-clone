"""FastAPI dependencies shared by every feature.

`ReadSession` and `WriteSession` are requested by service providers, never by routers
(plan §7.5 rule 5). Both use `scope="function"`, which ends the dependency before the
response is sent: by the time a client reads "201", the commit is already on disk, and a
commit that fails becomes an error response instead of a false success.
"""

from collections.abc import Iterator
from datetime import date
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.clock import today
from app.core.config import Settings
from app.db.session import Database


def get_database(request: Request) -> Database:
    database: Database = request.app.state.database
    return database


def _read_session(database: Annotated[Database, Depends(get_database)]) -> Iterator[Session]:
    with database.read_session() as session:
        yield session


def _write_session(database: Annotated[Database, Depends(get_database)]) -> Iterator[Session]:
    with database.write_session() as session:
        yield session


def get_today(request: Request) -> date:
    """Today's business date. Tests override this dependency to pin the day."""
    return today(request.app.state.settings.app_timezone)


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


Today = Annotated[date, Depends(get_today)]
AppSettings = Annotated[Settings, Depends(get_settings)]
ReadSession = Annotated[Session, Depends(_read_session, scope="function")]
WriteSession = Annotated[Session, Depends(_write_session, scope="function")]
