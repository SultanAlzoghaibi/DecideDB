// Browser-side auth helpers (signIn, signUp, signOut, emailOtp) for "use client" components.
// They call the /api/auth/* endpoints on this same site.
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient()], // adds authClient.emailOtp.* (verify the 4-digit code)
});

// The client throws (instead of returning an error) when the server can't be reached.
export const NETWORK_ERROR = "Couldn't reach JevDB. Check your connection and try again.";
