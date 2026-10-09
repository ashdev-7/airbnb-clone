from collections.abc import Iterator
from contextlib import contextmanager

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_health_reports_ok_after_querying_the_database(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_fails_with_the_envelope_when_the_database_fails(
    app: FastAPI, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    @contextmanager
    def unavailable() -> Iterator[Session]:
        raise OSError("database file unavailable")
        yield

    monkeypatch.setattr(app.state.database, "read_session", unavailable)

    response = client.get("/api/health")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
