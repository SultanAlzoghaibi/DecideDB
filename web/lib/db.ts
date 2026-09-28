// One shared Postgres connection pool for all server code.
// A pool keeps a few connections open and hands them out per query,
// instead of opening a new connection on every request (slow).
// Server-only: never import this from a "use client" component.
import { Pool } from "pg";

// In dev, hot reload can re-run this file; reuse the pool stored on globalThis
// instead of opening a new set of connections each time.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool = globalForDb.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (!globalForDb.pgPool) {
  // An idle connection can die (Postgres restart, network blip). pg reports that
  // as an "error" event, and an unhandled one crashes the whole server.
  // Log it instead; the pool replaces the dead connection on the next query.
  pool.on("error", (err) => console.error("postgres pool error:", err.message));
  globalForDb.pgPool = pool;
}
