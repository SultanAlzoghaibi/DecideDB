"""Builds the JSON record the SDK sends to DecisionDB for one Jev call."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Mapping, Optional, Sequence

SDK_VERSION = "decisiondb-python/0.2.0"


def new_id() -> str:
    """A time-ordered id when available (UUID v7, Python 3.14+), otherwise random (v4)."""
    make = getattr(uuid, "uuid7", uuid.uuid4)
    return str(make())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _plain(value: Any) -> Any:
    """Turn TypeSafe's typed question objects (pydantic models) into plain JSON-able dicts."""
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", exclude_none=True)
    if isinstance(value, Mapping):
        return {k: _plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_plain(v) for v in value]
    return value


def request_body(response: Any, state: Any, questions: Any, model: Optional[str]) -> Any:
    """The exact body that was sent to Jev, read from the HTTP request when available."""
    raw = getattr(response, "raw_http_response", None)
    content = getattr(getattr(raw, "request", None), "content", None)
    if content:
        try:
            return json.loads(content)
        except ValueError:
            pass
    body: dict[str, Any] = {"state": _plain(state), "questions": _plain(questions)}
    if model:
        body["model"] = model
    return body


def response_body(response: Any) -> Any:
    """The exact body Jev returned, falling back to the parsed model."""
    raw = getattr(response, "raw_http_response", None)
    if raw is not None:
        try:
            return raw.json()
        except Exception:
            pass
    if hasattr(response, "model_dump"):
        return response.model_dump(mode="json", exclude={"raw_http_response"})
    return response


def build(
    *,
    id: str,
    started_at: str,
    latency_ms: float,
    request: Any,
    response: Any,
    status: Optional[int],
    error: Optional[str],
    user_id: Optional[str],
    group_id: Optional[str],
    tags: Optional[Sequence[str]],
) -> dict[str, Any]:
    return {
        "id": id,
        "started_at": started_at,
        "latency_ms": round(latency_ms, 1),
        "status": status,
        "error": error,
        "user_id": user_id,
        "group_id": group_id,
        "tags": list(tags) if tags else [],
        "request": request,
        "response": response,
        "sdk": SDK_VERSION,
    }
