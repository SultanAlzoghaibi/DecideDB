import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { SignOutButton } from "@/components/SignOutButton";
import { ConsoleTabs } from "@/components/ConsoleTabs";
import { requireProfile } from "@/lib/session";
import "@/styles/auth.css";
import "@/styles/decisions.css";

export const metadata: Metadata = { title: "Console · DecisionDB" };

// Stub: the logged-in home. Usage (calls logged, tokens, grades) will show here
// once logging writes to Postgres and has a profile to belong to.
export default async function ConsolePage() {
  const profile = await requireProfile();

  return (
    <>
      <Nav active="console" />
      <main className="container console">
        <div className="console__head">
          <h1 className="console__title">Console</h1>
          <SignOutButton />
        </div>
        <ConsoleTabs current="/console" />

        <section className="console__card">
          <h2>Profile</h2>
          <dl className="console__meta">
            <dt>Name</dt>
            <dd>{profile.name}</dd>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
            <dt>Profile ID</dt>
            <dd className="mono">{profile.profileId}</dd>
          </dl>
        </section>

        <section className="console__card">
          <h2>Usage</h2>
          <p className="console__empty">
            Your usage will show here: Jev calls logged, tokens and grades.{" "}
            <a href="/console/decisions">Browse your decisions →</a>
          </p>
        </section>
      </main>
    </>
  );
}
