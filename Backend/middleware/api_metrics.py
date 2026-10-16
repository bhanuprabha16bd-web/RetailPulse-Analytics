"""
middleware/api_metrics.py – ASGI middleware that records API request metrics.

Records:
  - Endpoint path (normalised – dynamic path params replaced by placeholders)
  - HTTP method
  - Response status code
  - Response time in milliseconds
  - Whether the request resulted in an error (4xx/5xx)
  - Error category

Security:
  - Passwords, tokens, and sensitive request bodies are NEVER recorded.
  - Only the URL path is stored – no query-string values.
  - Health-check and metrics endpoints are skipped to avoid self-referential noise.

Retention:
  - api_metrics older than API_METRICS_RETENTION_DAYS are purged by the
    health_service.purge_old_api_metrics() function.
"""

import re
import time
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from database import SessionLocal
import models

# Endpoints that should NOT be recorded
_SKIP_PREFIXES = (
    "/api/system-health",
    "/api/health",
    "/docs",
    "/openapi",
    "/redoc",
    "/favicon",
)

# Regex patterns for normalising dynamic path segments
_DYNAMIC_PATTERNS = [
    (re.compile(r"/\d+"), "/{id}"),          # numeric IDs
    (re.compile(r"/[a-f0-9-]{32,36}"), "/{uuid}"),  # UUIDs
]


def _normalise_path(path: str) -> str:
    """Replace dynamic segments so metrics group by route not individual IDs."""
    for pattern, replacement in _DYNAMIC_PATTERNS:
        path = pattern.sub(replacement, path)
    return path


def _classify_error(status_code: int, path: str) -> str | None:
    if status_code < 400:
        return None
    if status_code == 401 or status_code == 403:
        return "Auth Error"
    if status_code == 422:
        return "Validation Error"
    if status_code >= 500:
        return "API Error"
    return "API Error"


class ApiMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip non-API and monitoring paths
        if any(path.startswith(prefix) for prefix in _SKIP_PREFIXES):
            return await call_next(request)
        if not path.startswith("/api"):
            return await call_next(request)

        start = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            # Re-raise, but still try to record
            raise
        finally:
            elapsed_ms = int((time.monotonic() - start) * 1000)

        status_code = response.status_code
        is_error = status_code >= 400
        error_category = _classify_error(status_code, path)
        normalised_path = _normalise_path(path)

        # Extract company_id from JWT if possible (best-effort, no hard failure)
        company_id = None
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                import jwt as pyjwt
                import auth as backend_auth
                token = auth_header.split(" ", 1)[1]
                payload = pyjwt.decode(token, backend_auth.SECRET_KEY, algorithms=[backend_auth.ALGORITHM])
                company_id = payload.get("company_id")
        except Exception:
            pass  # Unauthenticated requests are fine – company_id stays None

        # Write to DB in a short-lived session
        try:
            db = SessionLocal()
            try:
                metric = models.ApiMetric(
                    company_id=company_id,
                    endpoint=normalised_path,
                    method=request.method,
                    status_code=status_code,
                    response_time_ms=elapsed_ms,
                    is_error=is_error,
                    error_category=error_category,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(metric)
                db.commit()
            finally:
                db.close()
        except Exception:
            pass  # Middleware must never break the main request

        return response
