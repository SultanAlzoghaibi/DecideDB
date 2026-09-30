// Postgres access for all server code.
// Server-only: never import this from a "use client" component.
//
// Rule: every query on data tables (requests, answers, grades, ...) goes through
// withProfile(). `pool` is exported only for Better Auth (lib/auth.ts), which
// manages its own tables.
import { Pool, type PoolClient } from "pg";

// A pool keeps a few connections open and hands them out per query,
// instead of opening a new connection on every request (slow).
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

// Runs `fn` in one transaction on behalf of one profile.
//
// It sets `app.current_profile_id` for this transaction only (like SET LOCAL),
// so row-level security policies can filter every table by it. Because it's
// per transaction, a pooled connection never carries one profile's id into the
// next request. All queries inside `fn` must use the `db` it receives.
//
//   const rows = await withProfile(profileId, (db) =>
//     db.query("SELECT id FROM requests WHERE profile_id = $1", [profileId]),
//   );
//
// Throwing inside `fn` rolls everything back.
export async function withProfile<T>(
  profileId: string,
  fn: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("BEGIN");
    // set_config(..., true) = SET LOCAL, but it takes $1 safely (SET LOCAL can't).
    await client.query("SELECT set_config('app.current_profile_id', $1, true)", [profileId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    // If even ROLLBACK fails, the connection is in a bad state: throw it away.
    await client.query("ROLLBACK").catch(() => {
      broken = true;
    });
    throw err;
  } finally {
    client.release(broken);
  }
}
