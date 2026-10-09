"""Request ids and logging (plan §7.5 rule 4).

Every request gets an id: taken from the `X-Request-ID` header when it is safe, generated
otherwise. The id is returned in the response header, stamped on every log line written
while the request is handled, and included in every error envelope.
"""

import logging
import re
import time
import uuid
from contextvars import ContextVar
from typing import Any

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.errors import REQUEST_ID_HEADER, internal_error_response

_NO_REQUEST = "-"
_SAFE_REQUEST_ID = re.compile(r"[A-Za-z0-9._-]{1,64}")

request_id_var: ContextVar[str] = ContextVar("request_id", default=_NO_REQUEST)

logger = logging.getLogger("app.request")


_LOG_FORMAT = "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"
_configured = False


def configure_logging() -> None:
    """Send the `app` loggers to stderr with the request id on every line. Safe to call twice."""
    global _configured
    if _configured:
        return
    _configured = True

    # Stamp the id on every record as it is created, whichever logger or handler it reaches.
    default_factory = logging.getLogRecordFactory()

    def record_with_request_id(*args: Any, **kwargs: Any) -> logging.LogRecord:
        record = default_factory(*args, **kwargs)
        record.request_id = request_id_var.get()
        return record

    logging.setLogRecordFactory(record_with_request_id)

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(_LOG_FORMAT))
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.INFO)
    app_logger.addHandler(handler)


class RequestIdMiddleware:
    """Assigns the request id, logs one line per request, and is the last line of defence:
    an exception nobody handled becomes the 500 envelope here, with its trace in the log."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        supplied = Headers(scope=scope).get(REQUEST_ID_HEADER, "")
        request_id = supplied if _SAFE_REQUEST_ID.fullmatch(supplied) else uuid.uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        token = request_id_var.set(request_id)

        started = time.perf_counter()
        status = 500
        response_started = False

        async def send_with_request_id(message: Message) -> None:
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                status = message["status"]
                response_started = True
                headers = MutableHeaders(scope=message)
                headers[REQUEST_ID_HEADER] = request_id
                # Availability, prices and the session change at any moment: no browser
                # or proxy in front of the API may answer from a copy.
                headers.setdefault("Cache-Control", "no-store")
            await send(message)

        try:
            try:
                await self.app(scope, receive, send_with_request_id)
            except Exception:
                logger.exception("Unhandled exception")
                if response_started:
                    raise
                await internal_error_response(request_id)(scope, receive, send_with_request_id)
            duration_ms = (time.perf_counter() - started) * 1000
            logger.info("%s %s %s %.1fms", scope["method"], scope["path"], status, duration_ms)
        finally:
            request_id_var.reset(token)
