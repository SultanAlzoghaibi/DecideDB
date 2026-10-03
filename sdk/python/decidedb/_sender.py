"""Background sender: queues logs and POSTs them to DecideDB from one daemon thread.

Used by both clients. Sending never raises into the caller and never blocks a Jev call.
Standard library only.
"""

from __future__ import annotations

import atexit
import json
import os
import queue
import threading
import urllib.request
from typing import Any, Callable, Optional

# TODO(later): replace with the hosted DecideDB URL once it exists.
DEFAULT_BASE_URL = "http://localhost:3000"


def _warn(err: Exception) -> None:
    print(f"[decidedb] failed to log: {err}")


class Sender:
    def __init__(
        self,
        api_key: Optional[str],
        base_url: Optional[str],
        on_error: Callable[[Exception], None] = _warn,
        timeout: float = 5.0,
    ) -> None:
        # DecideDB key (not your Jev key). Sent as a header, never in the body.
        self._api_key = api_key or os.environ.get("DECIDEDB_API_KEY")
        base = base_url or os.environ.get("DECIDEDB_URL") or DEFAULT_BASE_URL
        self._url = base.rstrip("/") + "/ingest/response"
        self._on_error = on_error
        self._timeout = timeout

        # Logs wait here; one daemon thread sends them so logging returns instantly.
        self._queue: "queue.Queue[dict[str, Any]]" = queue.Queue()
        self._worker = threading.Thread(target=self._run, name="decidedb-sender", daemon=True)
        self._worker.start()
        # Daemon threads die with the program, so send what's left on normal exit.
        atexit.register(self.flush)

    def submit(self, payload: dict[str, Any]) -> None:
        self._queue.put(payload)

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
