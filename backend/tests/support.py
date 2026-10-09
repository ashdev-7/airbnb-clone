"""Test-only routes. Phase 1 has no tables or mutating endpoints of its own, so these
exercise the session dependencies and the error handlers through real HTTP."""

from fastapi import APIRouter, Query
from sqlalchemy import text

from app.core.deps import ReadSession, WriteSession
from app.core.errors import AppError

PROBE_TABLE_DDL = "CREATE TABLE IF NOT EXISTS probe (id INTEGER PRIMARY KEY, note TEXT NOT NULL)"

probe_router = APIRouter(prefix="/_test")


@probe_router.post("/write", status_code=201)
def write(session: WriteSession) -> dict[str, str]:
    session.execute(text("INSERT INTO probe (note) VALUES ('written')"))
    return {"status": "written"}


@probe_router.post("/write-then-fail")
def write_then_fail(session: WriteSession) -> None:
    session.execute(text("INSERT INTO probe (note) VALUES ('must be rolled back')"))
    raise RuntimeError("secret internal detail")


@probe_router.get("/count")
def count(session: ReadSession) -> dict[str, int]:
    return {"count": session.execute(text("SELECT count(*) FROM probe")).scalar_one()}


@probe_router.get("/boom")
def boom() -> None:
    raise RuntimeError("secret internal detail")


@probe_router.get("/app-error")
def app_error() -> None:
    raise AppError("dates_unavailable", 409, "Those dates are no longer available.")


@probe_router.get("/validate")
def validate(limit: int = Query(ge=1)) -> dict[str, int]:
    return {"limit": limit}
