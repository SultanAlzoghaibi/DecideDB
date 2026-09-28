// Browser-side auth helpers (signIn, signUp, signOut) for "use client" components.
// They call the /api/auth/* endpoints on this same site.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
