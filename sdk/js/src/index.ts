// DecisionDB JS SDK: TypeSafe's Jev client, plus a copy of every call sent to DecisionDB.
//
//   const decisiondb = new DecisionDB({ groupId: "support-bot", tags: ["prod"] });
//   const res = await decisiondb.systemOne({ state, questions }, { userId: "user_482" });
//   decisiondb.idOf(res);        // decision id, keep it to grade later
//   await decisiondb.flush();    // before a script / serverless function exits
//
// `systemOne` takes exactly TypeSafe's request, plus optional per-call metadata. It calls Jev,
// queues the log in the background, and returns Jev's response unchanged. If Jev fails, the
// failure is logged and the original error is re-thrown. Logging never throws into your app.

import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { Questions, RequestOptions, SystemOneRequest } from "@typesafe-ai/sdk";

const SDK_VERSION = "decisiondb-js/0.2.0";

// TODO(later): replace with the hosted DecisionDB URL once it exists.
const DEFAULT_BASE_URL = "http://localhost:3000";

export type DecisionDBOptions = {
  apiKey?: string; // DecisionDB key. Default: DECISIONDB_API_KEY. Only ever sent to DecisionDB.
  jevApiKey?: string; // Jev (TypeSafe) key. Default: TYPESAFE_API_KEY. Only ever sent to Jev.
  baseUrl?: string; // Where DecisionDB runs. Default: DECISIONDB_URL, else http://localhost:3000.
  userId?: string; // Attached to every call (override per call).
  groupId?: string;
  tags?: string[];
  model?: string; // Default Jev model, e.g. "jev-1.13.0" (pin it so thresholds stay comparable).
  jevClient?: TypeSafeClient; // Bring your own TypeSafeClient (then jevApiKey/model are ignored).
  onError?: (err: unknown) => void; // A log failed to send. Default: console.warn.
};

// Per-call DecisionDB metadata, plus TypeSafe's own request options (timeout, retry, signal, headers).
export type CallOptions = RequestOptions & {
  userId?: string | null;
  groupId?: string | null;
  tags?: string[];
  decisionId?: string; // Your own id (e.g. a ticket id) instead of a generated one.
};

// The record sent to DecisionDB for one Jev call (same shape as the Python SDK).
export type DecisionDBRecord = {
  id: string;
  started_at: string;
  latency_ms: number;
  status: number | null;
  error: string | null;
  user_id: string | null;
  group_id: string | null;
  tags: string[];
  request: unknown;
  response: unknown;
  sdk: string;
};

const env = (name: string): string | undefined =>
  typeof process !== "undefined" ? process.env[name] || undefined : undefined;

export class DecisionDB {
  private readonly jev: TypeSafeClient;
  private readonly apiKey?: string;
  private readonly url: string;
  private readonly onError: (err: unknown) => void;
  private readonly defaults: { userId: string | null; groupId: string | null; tags: string[] };
  // Sends still in flight; `flush()` waits for these.
  private readonly pending = new Set<Promise<void>>();
  // response object → decision id. Weak, so old responses can still be garbage collected.
  private readonly ids = new WeakMap<object, string>();

  constructor(options: DecisionDBOptions = {}) {
    this.jev =
      options.jevClient ??
      new TypeSafeClient({
        ...(options.jevApiKey ? { apiKey: options.jevApiKey } : {}),
        ...(options.model ? { defaultModel: options.model } : {}),
      });
    this.apiKey = options.apiKey ?? env("DECISIONDB_API_KEY");
    const baseUrl = options.baseUrl ?? env("DECISIONDB_URL") ?? DEFAULT_BASE_URL;
    this.url = `${baseUrl.replace(/\/+$/, "")}/ingest/response`;
    this.onError = options.onError ?? ((err) => console.warn("[decisiondb] failed to log:", err));
    this.defaults = {
      userId: options.userId ?? null,
      groupId: options.groupId ?? null,
      tags: options.tags ?? [],
    };
  }

  /** Same as TypeSafe's `systemOne`, plus per-call DecisionDB metadata. */
  async systemOne<const Q extends Questions>(request: SystemOneRequest<Q>, options: CallOptions = {}) {
    const { userId, groupId, tags, decisionId, ...typesafeOptions } = options;
    const meta = {
      user_id: userId !== undefined ? userId : this.defaults.userId,
      group_id: groupId !== undefined ? groupId : this.defaults.groupId,
      tags: tags ?? this.defaults.tags,
    };
    const id = decisionId ?? crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const t0 = performance.now();
    // The body TypeSafe sends: your request with the model resolved.
    const sent = { ...request, model: request.model ?? this.jev.defaultModel };

    try {
      const response = await this.jev.systemOne(request, typesafeOptions);
      this.queue({ id, started_at: startedAt, latency_ms: ms(t0), status: 200, error: null, ...meta, request: sent, response, sdk: SDK_VERSION });
      this.ids.set(response as object, id);
      return response;
    } catch (err) {
      // TypeSafe's APIError carries the HTTP status and Jev's error body. Checked by shape, not
      // `instanceof`, so it still works if the app ends up with two copies of @typesafe-ai/sdk.
      const apiErr = isApiError(err) ? err : null;
      const status = apiErr ? apiErr.status : null;
      const body = apiErr ? apiErr.body : null;
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      this.queue({ id, started_at: startedAt, latency_ms: ms(t0), status, error: message, ...meta, request: sent, response: body, sdk: SDK_VERSION });
      throw err;
    }
  }

  /** The DecisionDB decision id for a response returned by `systemOne` (for grading later). */
  idOf(response: unknown): string | undefined {
    return typeof response === "object" && response !== null ? this.ids.get(response) : undefined;
  }

  /** Low-level: queue an already-built record. Most people never need this. */
  log(record: DecisionDBRecord): void {
    this.queue(record);
  }

  /** Wait for every queued log to finish. Call before a script or serverless function exits. */
  async flush(): Promise<void> {
    await Promise.all(this.pending);
  }

  // Fire-and-forget: the POST happens in the background and never throws.
  private queue(record: DecisionDBRecord): void {
    const send = this.send(record).finally(() => this.pending.delete(send));
    this.pending.add(send);
  }

  private async send(record: DecisionDBRecord): Promise<void> {
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error(`DecisionDB responded ${res.status}`);
    } catch (err) {
      this.onError(err);
    }
  }
}

const isApiError = (err: unknown): err is { status: number; body: unknown } =>
  typeof err === "object" && err !== null && typeof (err as { status?: unknown }).status === "number" && "body" in err;

const ms = (t0: number) => Math.round((performance.now() - t0) * 10) / 10;

// Re-exported so users can build questions without a second import.
export { choice, noul, score } from "@typesafe-ai/sdk";
