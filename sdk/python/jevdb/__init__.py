"""JevDB Python SDK.

After your app calls Jev, hand the request + response to ``jevdb.log()``.
It is queued and sent to JevDB by a background thread, and never raises,
so logging can't slow down or break your app. Standard library only.
"""

from __future__ import annotations

import atexit
import json
import os
import queue
import threading
import urllib.request
from typing import Any, Callable, Optional

__all__ = ["JevDB"]
__version__ = "0.1.0"

SDK_VERSION = f"jevdb-python/{__version__}"

# TODO(later): replace with the hosted JevDB URL once it exists.
DEFAULT_BASE_URL = "http://localhost:3000"


def _warn(err: Exception) -> None:
    print(f"[jevdb] failed to log: {err}")


class JevDB:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        on_error: Callable[[Exception], None] = _warn,
        timeout: float = 5.0,
    ) -> None:
        # JevDB key (not your Jev key). Defaults to JEVDB_API_KEY.
        self._api_key = api_key or os.environ.get("JEVDB_API_KEY")
        base = base_url or os.environ.get("JEVDB_URL") or DEFAULT_BASE_URL
        self._url = base.rstrip("/") + "/ingest/response"
        self._on_error = on_error
        self._timeout = timeout

        # Logs wait here; one daemon thread sends them so `log()` returns instantly.
        self._queue: "queue.Queue[dict[str, Any]]" = queue.Queue()
        self._worker = threading.Thread(target=self._run, name="jevdb-logger", daemon=True)
        self._worker.start()
        # Daemon threads die with the program, so send what's left on normal exit.
        atexit.register(self.flush)

    def log(
        self,
        request: Any,
        response: Any,
        status_code: int,
        latency_ms: Optional[float] = None,
        error: Optional[str] = None,
    ) -> None:
        """Queue one Jev call. Returns immediately."""
        self._queue.put(
            {
                "request": request,
                "response": response,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "error": error,
                "sdk": SDK_VERSION,
            }
        )

    def flush(self) -> None:
        """Block until every queued log has been sent (or failed)."""
        self._queue.join()

    def _run(self) -> None:
        while True:
            payload = self._queue.get()
            try:
                self._send(payload)
            except Exception as err:  # never let a failed log kill the thread
                self._on_error(err)
            finally:
                self._queue.task_done()

    def _send(self, payload: dict[str, Any]) -> None:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        req = urllib.request.Request(
            self._url,
            data=json.dumps(payload, default=str).encode(),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=self._timeout):
            pass  # urlopen raises on 4xx/5xx
