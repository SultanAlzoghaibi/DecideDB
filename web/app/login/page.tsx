import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { LoginForm } from "@/components/LoginForm";
import { enabledProviders } from "@/lib/auth";
import { getProfile } from "@/lib/session";
import "@/styles/auth.css";

export const metadata: Metadata = { title: "Log in · JevDB" };

export default async function LoginPage() {
  // Already logged in: skip the form.
  if (await getProfile()) redirect("/console");

  // Only show OAuth buttons the server has keys for (see lib/auth.ts).
  const providers = (["google", "github"] as const).filter((p) => enabledProviders[p]);

  return (
    <>
      <Nav />
      <main className="auth">
        <LoginForm providers={[...providers]} />
      </main>
    </>
  );
}
