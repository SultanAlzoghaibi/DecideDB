// POST /ingest/response — the JS and Python SDKs send one Jev call here
// (the request they sent to Jev + the response they got back).
//
// It runs only on the server, so later it's the place that writes to Postgres.

type IngestPayload = {
  request: unknown; // body the app sent to Jev
  response: unknown; // body Jev returned (null if the call failed before a response)
  status_code: number;
  latency_ms?: number;
  error?: string;
  sdk?: string; // e.g. "jevdb-js/0.1.0"
};

export async function POST(req: Request) {
  let payload: IngestPayload;
  try {
    payload = (await req.json()) as IngestPayload;
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }

  // TODO(you): check the API key, validate the shape, then write to Postgres
  // (tables in db/migrations/). For now we just print it.
  console.log("ingest:", JSON.stringify(payload));

  return Response.json({ status: "ok" });
}
