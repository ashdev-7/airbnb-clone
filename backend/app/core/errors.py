"""The single error envelope (plan §11.1) and the handlers that render it.

Services raise `AppError`; nothing else in the application builds an error response.
"""

from collections.abc import Mapping
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

REQUEST_ID_HEADER = "X-Request-ID"

_HTTP_ERRORS: dict[int, tuple[str, str]] = {
    404: ("not_found", "Not found."),
    405: ("method_not_allowed", "Method not allowed."),
}


class AppError(Exception):
    """A failure the client is told about: a stable code, an HTTP status, a message."""

    def __init__(
        self,
        code: str,
        status: int,
        message: str,
        details: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status = status
        self.message = message
        self.details = dict(details or {})
        self.headers = dict(headers or {})


def unauthenticated() -> AppError:
    return AppError("unauthenticated", 401, "Sign in to continue.")


def invalid_field(path: str, message: str) -> AppError:
    """A 422 for a rule that needs the database, in the same shape as schema errors."""
    return AppError(
        "validation_error", 422, "Invalid input.", {"fields": [{"path": path, "message": message}]}
    )


def error_response(
    request_id: str,
    code: str,
    status: int,
    message: str,
    details: Mapping[str, Any] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    body = {
        "error": {
            "code": code,
            "message": message,
            "details": dict(details or {}),
            "request_id": request_id,
        }
    }
    return JSONResponse(body, status_code=status, headers=dict(headers or {}))


def internal_error_response(request_id: str) -> JSONResponse:
    """What the client sees for an unknown exception: never the cause, always the id."""
    return error_response(
        request_id,
        "internal_error",
        500,
        "Something went wrong.",
        headers={REQUEST_ID_HEADER: request_id},
    )


def _request_id(request: Request) -> str:
    return str(request.state.request_id)


async def _handle_app_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return error_response(
        _request_id(request), exc.code, exc.status, exc.message, exc.details, exc.headers
    )


async def _handle_http_error(request: Request, exc: Exception) -> JSONResponse:
    """Errors raised by the framework itself, such as an unknown route."""
    assert isinstance(exc, StarletteHTTPException)
    code, message = _HTTP_ERRORS.get(exc.status_code, (f"http_{exc.status_code}", str(exc.detail)))
    return error_response(_request_id(request), code, exc.status_code, message, headers=exc.headers)


async def _handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    fields = [
        {"path": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
        for error in exc.errors()
    ]
    return error_response(
        _request_id(request), "validation_error", 422, "Invalid input.", {"fields": fields}
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
