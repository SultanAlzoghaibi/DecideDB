// Every /api/auth/* endpoint (sign up, sign in, sign out, OAuth callbacks)
// is handled by Better Auth. `[...all]` catches all the sub-paths.
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
