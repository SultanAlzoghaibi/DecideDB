// Better Auth config: login, sessions and password hashing, stored in our Postgres.
// Tables: db/migrations/0003_auth.sql. The HTTP endpoints live in app/api/auth/[...all].
//
// Naming: Better Auth calls the logged-in person a "user". In DecideDB it's a "profile":
// table `profile`, foreign keys `profile_id`, and `profileId` in our code (see lib/session.ts).
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { pool } from "@/lib/db";
import { sendEmail, verificationCodeEmail } from "@/lib/email";

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
  // Email + password accounts must confirm their email with a 4-digit code
  // before they can log in. Google/GitHub emails are already verified by them.
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: {
    sendOnSignUp: true, // code goes out right after sign-up
    sendOnSignIn: true, // logging in while unverified sends a fresh code
    autoSignInAfterVerification: true, // correct code = logged in
  },
  // A failed Google/GitHub login (cancelled, email already used by a password
  // account, ...) comes back to /login?error=<code> instead of Better Auth's own page.
  onAPIError: { errorURL: "/login" },
  socialProviders: { ...(github && { github }), ...(google && { google }) },
  plugins: [
    emailOTP({
      otpLength: 4,
      expiresIn: 10 * 60, // seconds
      // 3 wrong tries kills the code (and Better Auth allows 3 code requests per
      // minute), so guessing 1 of 10,000 codes isn't practical.
      allowedAttempts: 3,
      storeOTP: "hashed", // the DB never holds a usable code
      overrideDefaultEmailVerification: true, // verify by code instead of a link
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "email-verification") return; // other OTP flows aren't used
        await sendEmail({ to: email, ...verificationCodeEmail(otp) });
      },
    }),
    // Lets server actions set the session cookie. Must be the last plugin.
    nextCookies(),
  ],
});
