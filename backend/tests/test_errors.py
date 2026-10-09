"""Plan §11.1 and §7.5: one error envelope for every failure, with a request id."""

import logging

import pytest
from fastapi.testclient import TestClient


def _error(response_json: dict[str, object]) -> dict[str, object]:
    assert set(response_json) == {"error"}
    error = response_json["error"]
    assert isinstance(error, dict)
    assert set(error) == {"code", "message", "details", "request_id"}
    return error


def test_unknown_route_returns_the_envelope(client: TestClient) -> None:
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    error = _error(response.json())
    assert error["code"] == "not_found"
    assert error["request_id"] == response.headers["X-Request-ID"]


def test_wrong_method_returns_the_envelope(client: TestClient) -> None:
    response = client.delete("/api/health")
    assert response.status_code == 405
    assert _error(response.json())["code"] == "method_not_allowed"


def test_unhandled_exception_returns_the_envelope_and_hides_the_cause(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.ERROR, logger="app"):
        response = client.get("/api/_test/boom")

    assert response.status_code == 500
    error = _error(response.json())
    assert error["code"] == "internal_error"
    assert error["request_id"] == response.headers["X-Request-ID"]
    assert "secret internal detail" not in response.text
    assert "Traceback" not in response.text

    # The stack trace goes to the log, tagged with the same request id.
    records = [record for record in caplog.records if record.exc_info]
    assert len(records) == 1
    assert "secret internal detail" in str(records[0].exc_info[1])  # type: ignore[index]
    assert records[0].request_id == error["request_id"]  # type: ignore[attr-defined]


def test_app_error_returns_its_code_and_status(client: TestClient) -> None:
    response = client.get("/api/_test/app-error")
    assert response.status_code == 409
    error = _error(response.json())
    assert error["code"] == "dates_unavailable"
    assert error["message"] == "Those dates are no longer available."
    assert error["details"] == {}


def test_validation_error_returns_the_envelope_with_field_paths(client: TestClient) -> None:
    response = client.get("/api/_test/validate", params={"limit": "zero"})
    assert response.status_code == 422
    error = _error(response.json())
    assert error["code"] == "validation_error"
    details = error["details"]
    assert isinstance(details, dict)
    assert [field["path"] for field in details["fields"]] == ["query.limit"]


def test_request_id_is_echoed_when_supplied(client: TestClient) -> None:
    response = client.get("/api/health", headers={"X-Request-ID": "abc-123"})
    assert response.headers["X-Request-ID"] == "abc-123"


def test_request_id_is_generated_when_missing_or_unsafe(client: TestClient) -> None:
    generated = client.get("/api/health").headers["X-Request-ID"]
    assert len(generated) == 32

    unsafe = client.get("/api/health", headers={"X-Request-ID": "bad id\twith spaces"})
    assert unsafe.headers["X-Request-ID"] != "bad id\twith spaces"
    assert len(unsafe.headers["X-Request-ID"]) == 32


def test_every_request_is_logged_with_its_request_id(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger="app"):
        client.get("/api/health", headers={"X-Request-ID": "trace-me"})

    lines = [record for record in caplog.records if record.name == "app.request"]
    assert len(lines) == 1
    assert lines[0].request_id == "trace-me"  # type: ignore[attr-defined]
    assert "GET /api/health 200" in lines[0].getMessage()
