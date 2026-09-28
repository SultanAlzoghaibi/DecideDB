// One shared Postgres connection pool for all server code.
// A pool keeps a few connections open and hands them out per query,
// instead of opening a new connection on every request (slow).
// Server-only: never import this from a "use client" component.
import { Pool } from "pg";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
