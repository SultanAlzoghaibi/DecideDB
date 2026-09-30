"""JevDB clients: TypeSafe's Jev client, plus a copy of every call sent to JevDB.

    with JevDB(user_id="user_482", group_id="support-bot", tags=["prod"]) as jevdb:
        response = jevdb.system_one(state=..., questions=...)
        decision_id = jevdb.id_of(response)   # keep this to grade the decision later

    async with AsyncJevDB(...) as jevdb:
        response = await jevdb.system_one(state=..., questions=...)

`system_one` takes exactly the same arguments as TypeSafe's `system_one`, plus optional
per-call `user_id`, `group_id`, `tags` and `decision_id`. It calls Jev, hands the log to a
background sender, and returns Jev's response unchanged. If Jev fails, the failure is logged
and the original exception is re-raised, so your code behaves exactly as without JevDB.
"""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from typing import Any, Callable, Optional, Sequence

from typesafe_sdk import AsyncTypeSafeClient, TypeSafeClient

from . import _record
from ._sender import Sender, _warn

_UNSET: Any = object()
_REMEMBER = 512  # how many recent responses `id_of` can look up


class _Base:
    def __init__(
        self,
        *,
        api_key: Optional[str],
        base_url: Optional[str],
        user_id: Optional[str],
        group_id: Optional[str],
        tags: Optional[Sequence[str]],
        on_error: Optional[Callable[[Exception], None]],
    ) -> None:
        self._sender = Sender(api_key, base_url, on_error or _warn)  # None → print a warning
        self._defaults = {"user_id": user_id, "group_id": group_id, "tags": list(tags or [])}
        # response object → decision id. TypeSafe's response models can't hold weak references,
        # so this keeps the most recent responses only.
        self._ids: "OrderedDict[int, tuple[Any, str]]" = OrderedDict()

    # ---- public ----

    def id_of(self, response: Any) -> Optional[str]:
        """The JevDB decision id for a response returned by `system_one` (for grading later)."""
        hit = self._ids.get(id(response))
        return hit[1] if hit and hit[0] is response else None

    def log(self, payload: dict) -> None:
        """Low-level: queue an already-built record. Most people never need this."""
        self._sender.submit(payload)

    # ---- shared by the sync and async clients ----

    def _meta(self, user_id: Any, group_id: Any, tags: Any) -> dict:
        """Per-call values win over the defaults set on the client."""
        d = self._defaults
        return {
            "user_id": d["user_id"] if user_id is _UNSET else user_id,
            "group_id": d["group_id"] if group_id is _UNSET else group_id,
            "tags": d["tags"] if tags is _UNSET else list(tags or []),
        }

    def _remember(self, response: Any, decision_id: str) -> None:
        self._ids[id(response)] = (response, decision_id)
        while len(self._ids) > _REMEMBER:
            self._ids.popitem(last=False)

    def _log_success(self, *, decision_id, started_at, t0, state, questions, kwargs, response, meta) -> None:
        raw = getattr(response, "raw_http_response", None)
        self._sender.submit(
            _record.build(
                id=decision_id,
                started_at=started_at,
                latency_ms=(time.perf_counter() - t0) * 1000,
                request=_record.request_body(response, state, questions, kwargs.get("model")),
                response=_record.response_body(response),
                status=getattr(raw, "status_code", 200),
                error=None,
                **meta,
            )
        )

    def _log_failure(self, *, decision_id, started_at, t0, state, questions, kwargs, err, meta) -> None:
        # TypeSafeAPIError carries the HTTP status and Jev's error body.
        self._sender.submit(
            _record.build(
                id=decision_id,
                started_at=started_at,
                latency_ms=(time.perf_counter() - t0) * 1000,
                request=_record.request_body(None, state, questions, kwargs.get("model")),
                response=getattr(err, "body", None),
                status=getattr(err, "status", None),
                error=f"{type(err).__name__}: {err}",
                **meta,
            )
        )


class JevDB(_Base):
    """Synchronous client. Wraps `typesafe_sdk.TypeSafeClient`."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        jev_api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        user_id: Optional[str] = None,
        group_id: Optional[str] = None,
        tags: Optional[Sequence[str]] = None,
        model: Optional[str] = None,
        jev_client: Optional[TypeSafeClient] = None,
        on_error: Optional[Callable[[Exception], None]] = None,
    ) -> None:
        """
        api_key      JevDB API key (default: JEVDB_API_KEY). Only ever sent to JevDB.
        jev_api_key  Jev API key (default: TYPESAFE_API_KEY). Only ever sent to Jev.
        base_url     JevDB URL (default: JEVDB_URL).
        user_id, group_id, tags   Attached to every call; override per call in `system_one`.
        model        Default Jev model (default: TypeSafe's default / TYPESAFE_DEFAULT_MODEL).
        jev_client   Bring your own TypeSafeClient instead (then jev_api_key/model are ignored,
                     and JevDB won't close it for you).
        on_error     Called with the exception when a log can't be sent (default: print a warning).
        """
        super().__init__(
            api_key=api_key, base_url=base_url, user_id=user_id, group_id=group_id, tags=tags, on_error=on_error
        )
        self._owns_jev = jev_client is None
        self._jev = jev_client or TypeSafeClient(api_key=jev_api_key, model=model)

    def system_one(
        self,
        state: Any,
        questions: Any,
        *,
        user_id: Any = _UNSET,
        group_id: Any = _UNSET,
        tags: Any = _UNSET,
        decision_id: Optional[str] = None,
        **kwargs: Any,
    ) -> Any:
        """Same as `TypeSafeClient.system_one`, plus per-call JevDB metadata."""
        meta = self._meta(user_id, group_id, tags)
        did = decision_id or _record.new_id()
        started_at, t0 = _record.now_iso(), time.perf_counter()
        ctx = dict(decision_id=did, started_at=started_at, t0=t0, state=state, questions=questions, kwargs=kwargs)
        try:
            response = self._jev.system_one(state=state, questions=questions, **kwargs)
        except Exception as err:
            self._log_failure(err=err, meta=meta, **ctx)
            raise
        self._log_success(response=response, meta=meta, **ctx)
        self._remember(response, did)
        return response

    def flush(self) -> None:
        """Wait until every queued log has been sent."""
        self._sender.flush()

    def close(self) -> None:
        """Send pending logs, and close the Jev client if JevDB created it."""
        self.flush()
        if self._owns_jev:
            self._jev.close()

    def __enter__(self) -> "JevDB":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()


class AsyncJevDB(_Base):
    """Asynchronous client. Wraps `typesafe_sdk.AsyncTypeSafeClient`."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        jev_api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        user_id: Optional[str] = None,
        group_id: Optional[str] = None,
        tags: Optional[Sequence[str]] = None,
        model: Optional[str] = None,
        jev_client: Optional[AsyncTypeSafeClient] = None,
        on_error: Optional[Callable[[Exception], None]] = None,
    ) -> None:
        """Same options as `JevDB`, with an `AsyncTypeSafeClient`."""
        super().__init__(
            api_key=api_key, base_url=base_url, user_id=user_id, group_id=group_id, tags=tags, on_error=on_error
        )
        self._owns_jev = jev_client is None
        self._jev = jev_client or AsyncTypeSafeClient(api_key=jev_api_key, model=model)

    async def system_one(
        self,
        state: Any,
        questions: Any,
        *,
        user_id: Any = _UNSET,
        group_id: Any = _UNSET,
        tags: Any = _UNSET,
        decision_id: Optional[str] = None,
        **kwargs: Any,
    ) -> Any:
        """Same as `AsyncTypeSafeClient.system_one`, plus per-call JevDB metadata."""
        meta = self._meta(user_id, group_id, tags)
        did = decision_id or _record.new_id()
        started_at, t0 = _record.now_iso(), time.perf_counter()
        ctx = dict(decision_id=did, started_at=started_at, t0=t0, state=state, questions=questions, kwargs=kwargs)
        try:
            response = await self._jev.system_one(state=state, questions=questions, **kwargs)
        except Exception as err:
            self._log_failure(err=err, meta=meta, **ctx)
            raise
        # Queuing is instant (the sender is a background thread), so this never blocks the event loop.
        self._log_success(response=response, meta=meta, **ctx)
        self._remember(response, did)
        return response

    async def flush(self) -> None:
        """Wait until every queued log has been sent, without blocking the event loop."""
        await asyncio.to_thread(self._sender.flush)

    async def aclose(self) -> None:
        """Send pending logs, and close the Jev client if JevDB created it."""
        await self.flush()
        if self._owns_jev:
            await self._jev.aclose()

    async def __aenter__(self) -> "AsyncJevDB":
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.aclose()
