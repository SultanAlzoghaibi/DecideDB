"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient, NETWORK_ERROR } from "@/lib/auth-client";
import { GitHubIcon, GoogleIcon } from "./ProviderIcons";
import { VerifyEmailForm } from "./VerifyEmailForm";

type Mode = "signin" | "signup";
type Provider = "github" | "google";

const PROVIDERS: Record<Provider, { label: string; Icon: () => React.ReactElement }> = {
  google: { label: "Continue with Google", Icon: GoogleIcon },
  github: { label: "Continue with GitHub", Icon: GitHubIcon },
};

// Email + password form, plus a button per OAuth provider the server has keys for.
export function LoginForm({
  providers,
  initialError,
}: {
  providers: Provider[];
  initialError: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);
  // Set when the next step is typing the emailed code.
  const [verify, setVerify] = useState<{ email: string; reason: "signup" | "unverified" } | null>(
    null,
  );

  // Pressing Back from Google/GitHub can restore this page from the browser's
  // back-forward cache with the buttons still disabled; re-enable them.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setPending(true);
    setError(null);
    let error: { message?: string; code?: string } | null;
    try {
      ({ error } =
        mode === "signup"
          ? await authClient.signUp.email({ name: String(form.get("name")), email, password })
          : await authClient.signIn.email({ email, password }));
    } catch {
      // Network failure (server down, offline): the client throws instead of returning an error.
      error = { message: NETWORK_ERROR };
    }

    // Unconfirmed email: the server just emailed a fresh code, so ask for it.
    if (error?.code === "EMAIL_NOT_VERIFIED") {
      setPending(false);
      setVerify({ email, reason: "unverified" });
      return;
    }
    if (error) {
      setPending(false);
      setError(error.message ?? "Something went wrong. Try again.");
      return;
    }
    // Sign-up worked but isn't logged in yet: the code was emailed, confirm it first.
    if (mode === "signup") {
      setPending(false);
      setVerify({ email, reason: "signup" });
      return;
    }
    // Stay disabled while navigating, so a second click can't submit again.
    // refresh() so server components re-read the new session cookie.
    router.push("/console");
    router.refresh();
  }

  async function onOAuth(provider: Provider) {
    setPending(true);
    setError(null);
    // Leaves the site for GitHub/Google, then comes back to callbackURL.
    try {
      const { error } = await authClient.signIn.social({ provider, callbackURL: "/console" });
      if (error) {
        setPending(false);
        setError(error.message ?? "Could not start login. Try again.");
      }
    } catch {
      setPending(false);
      setError(NETWORK_ERROR);
    }
  }

  if (verify) {
    return (
      <VerifyEmailForm
        email={verify.email}
        reason={verify.reason}
        onBack={() => {
          setVerify(null);
          setError(null);
        }}
      />
    );
  }

  const isSignup = mode === "signup";

  return (
    <div className="auth__card">
      <h1 className="auth__title">{isSignup ? "Create your account" : "Log in to DecisionDB"}</h1>
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

      {/* method="post": if JS hasn't loaded, the browser's fallback submit must never
          put the password in the URL (a GET would, and URLs end up in history and logs). */}
      <form className="auth__form" method="post" onSubmit={onSubmit}>
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
        {isSignup ? "Already have an account? " : "New to DecisionDB? "}
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
