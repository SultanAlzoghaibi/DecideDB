"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { GitHubIcon, GoogleIcon } from "./ProviderIcons";

type Mode = "signin" | "signup";
type Provider = "github" | "google";

const PROVIDERS: Record<Provider, { label: string; Icon: () => React.ReactElement }> = {
  google: { label: "Continue with Google", Icon: GoogleIcon },
  github: { label: "Continue with GitHub", Icon: GitHubIcon },
};

// Email + password form, plus a button per OAuth provider the server has keys for.
export function LoginForm({ providers }: { providers: Provider[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setPending(true);
    setError(null);
    const { error } =
      mode === "signup"
        ? await authClient.signUp.email({ name: String(form.get("name")), email, password })
        : await authClient.signIn.email({ email, password });
    setPending(false);

    if (error) {
      setError(error.message ?? "Something went wrong. Try again.");
      return;
    }
    // refresh() so server components re-read the new session cookie.
    router.push("/console");
    router.refresh();
  }

  async function onOAuth(provider: Provider) {
    setPending(true);
    setError(null);
    // Leaves the site for GitHub/Google, then comes back to callbackURL.
    const { error } = await authClient.signIn.social({ provider, callbackURL: "/console" });
    if (error) {
      setPending(false);
      setError(error.message ?? "Could not start login. Try again.");
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="auth__card">
      <h1 className="auth__title">{isSignup ? "Create your account" : "Log in to JevDB"}</h1>
      <p className="auth__sub">
        {isSignup ? "One account for your console and projects." : "Welcome back."}
      </p>

      {providers.length > 0 && (
        <>
          <div className="auth__oauth">
            {providers.map((p) => {
              const { label, Icon } = PROVIDERS[p];
              return (
                <button
                  key={p}
                  type="button"
                  className="btn btn--ghost auth__provider"
                  disabled={pending}
                  onClick={() => onOAuth(p)}
                >
                  <Icon />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="auth__divider">or</div>
        </>
      )}

      <form className="auth__form" onSubmit={onSubmit}>
        {isSignup && (
          <label className="field">
            <span className="field__label">Name</span>
            <input className="input" name="name" autoComplete="name" required />
          </label>
        )}
        <label className="field">
          <span className="field__label">Email</span>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </label>

        {error && (
          <p className="auth__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="auth__switch">
        {isSignup ? "Already have an account? " : "New to JevDB? "}
        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? "signin" : "signup");
            setError(null);
          }}
        >
          {isSignup ? "Log in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
