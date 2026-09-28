import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { LoginForm } from "@/components/LoginForm";
import { enabledProviders } from "@/lib/auth";
import { getProfile } from "@/lib/session";
import "@/styles/auth.css";

export const metadata: Metadata = { title: "Log in · JevDB" };

// Error codes Better Auth adds as /login?error=<code> after a failed Google/GitHub login.
const OAUTH_ERRORS: Record<string, string> = {
  account_not_linked:
    "That email already has a password login. Log in with your email and password instead.",
  access_denied: "Login was cancelled.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  // Already logged in: skip the form.
  if (await getProfile()) redirect("/console");

  // Only show OAuth buttons the server has keys for (see lib/auth.ts).
  const providers = (["google", "github"] as const).filter((p) => enabledProviders[p]);

  const { error } = await searchParams;
  const code = Array.isArray(error) ? error[0] : error;
  const initialError = code ? (OAUTH_ERRORS[code] ?? "Login failed. Try again.") : null;

  return (
    <>
      <Nav />
      <main className="auth">
        <LoginForm providers={[...providers]} initialError={initialError} />
      </main>
    </>
  );
}
