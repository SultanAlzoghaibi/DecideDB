// Better Auth config: login, sessions and password hashing, stored in our Postgres.
// Tables: db/migrations/0003_auth.sql. The HTTP endpoints live in app/api/auth/[...all].
//
// Naming: Better Auth calls the logged-in person a "user". In JevDB it's a "profile":
// table `profile`, foreign keys `profile_id`, and `profileId` in our code (see lib/session.ts).
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "@/lib/db";

// OAuth logins only switch on when their keys are set, so self-hosters without
// a GitHub/Google app still get email + password.
const github =
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }
    : undefined;
const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

export const enabledProviders = { github: !!github, google: !!google };

export const auth = betterAuth({
  database: pool,
  user: { modelName: "profile" },
  session: { fields: { userId: "profile_id" } },
  account: { fields: { userId: "profile_id" } },
  // UUID ids, same as the rest of the schema. Postgres generates them.
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: { enabled: true },
  // A failed Google/GitHub login (cancelled, email already used by a password
  // account, ...) comes back to /login?error=<code> instead of Better Auth's own page.
  onAPIError: { errorURL: "/login" },
  socialProviders: { ...(github && { github }), ...(google && { google }) },
  // Lets server actions set the session cookie. Must be the last plugin.
  plugins: [nextCookies()],
});
