// Apply database migrations: `bun run db:migrate` (from web/).
//
// Docker runs db/migrations/*.sql only when the volume is brand new. After that, new
// migration files need this script. It records each applied file in `schema_migrations`
// and runs only files it hasn't seen, each inside its own transaction (all or nothing).
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

const DIR = join(import.meta.dir, "..", "..", "db", "migrations");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const files = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name));

  // First run on a database Docker already set up: those files ran at container start,
  // so record them without running them again. Each check asks "is this migration's
  // result already in the database?". Add one line here for every new migration file.
  if (done.size === 0) {
    const APPLIED_IF: Record<string, string> = {
      "0001": "SELECT to_regclass('public.requests') IS NOT NULL AS ok",
      "0002": "SELECT to_regclass('public.answers') IS NOT NULL AS ok",
      "0003": "SELECT to_regclass('public.profile') IS NOT NULL AS ok",
      "0004": "SELECT to_regclass('public.context') IS NOT NULL AS ok",
      "0005": "SELECT to_regclass('public.rag_settings') IS NOT NULL AS ok",
    };
    for (const f of files) {
      const check = APPLIED_IF[f.slice(0, 4)];
      if (!check || !(await pool.query<{ ok: boolean }>(check)).rows[0]?.ok) break; // stop at the first one not applied
      await pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
      done.add(f);
      console.log(`recorded ${f} (already applied by Docker)`);
    }
  }

  const pending = files.filter((f) => !done.has(f));
  if (pending.length === 0) console.log("database is up to date");

  for (const f of pending) {
    const sql = await Bun.file(join(DIR, f)).text();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      console.log(`applied ${f}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`failed ${f}: ${(err as Error).message}`);
      process.exitCode = 1;
      break;
    } finally {
      client.release();
    }
  }
}

await main().finally(() => pool.end());
