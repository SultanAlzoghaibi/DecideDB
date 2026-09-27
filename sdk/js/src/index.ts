// JevDB JS SDK: after your app calls Jev, hand the request + response to
// `jevdb.log()`. It sends them to JevDB in the background and never throws,
// so logging can't slow down or break your app.

const SDK_VERSION = "jevdb-js/0.1.0";

// TODO(later): replace with the hosted JevDB URL once it exists.
const DEFAULT_BASE_URL = "http://localhost:3000";

export type JevDBOptions = {
  apiKey?: string; // JevDB key (not your Jev key). Defaults to JEVDB_API_KEY.
  baseUrl?: string; // Defaults to JEVDB_URL, then DEFAULT_BASE_URL.
  onError?: (err: unknown) => void; // Called when a log fails to send. Default: console.warn.
};

export type LogEntry = {
  request: unknown; // the body you sent to Jev
  response: unknown; // the body Jev returned, or null if the call failed
  statusCode: number;
  latencyMs?: number;
  error?: string;
};

export class JevDB {
  private readonly apiKey?: string;
  private readonly url: string;
  private readonly onError: (err: unknown) => void;
  // Sends still in flight. `flush()` waits for these.
  private readonly pending = new Set<Promise<void>>();

  constructor(options: JevDBOptions = {}) {
    const env = typeof process !== "undefined" ? process.env : {};
    this.apiKey = options.apiKey ?? env.JEVDB_API_KEY;
    const baseUrl = options.baseUrl ?? env.JEVDB_URL ?? DEFAULT_BASE_URL;
    this.url = `${baseUrl.replace(/\/+$/, "")}/ingest/response`;
    this.onError = options.onError ?? ((err) => console.warn("[jevdb] failed to log:", err));
  }

  // Fire-and-forget: returns immediately, the POST happens in the background.
  log(entry: LogEntry): void {
    const send = this.send(entry).finally(() => this.pending.delete(send));
    this.pending.add(send);
  }

  // Wait for every queued log to finish. Call before a script or serverless function exits.
  async flush(): Promise<void> {
    await Promise.all(this.pending);
  }

  private async send(entry: LogEntry): Promise<void> {
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          request: entry.request,
          response: entry.response,
          status_code: entry.statusCode,
          latency_ms: entry.latencyMs,
          error: entry.error,
          sdk: SDK_VERSION,
        }),
      });
      if (!res.ok) throw new Error(`JevDB responded ${res.status}`);
    } catch (err) {
      this.onError(err);
    }
  }
}
