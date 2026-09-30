"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient, NETWORK_ERROR } from "@/lib/auth-client";

const RESEND_COOLDOWN = 30; // seconds between "send a new code" clicks

type AuthError = { code?: string; status?: number; message?: string };

function messageFor(error: AuthError): string {
  if (error.status === 429) return "Too many tries. Wait a minute, then try again.";
  switch (error.code) {
    case "INVALID_OTP":
      return "That code isn't right. Check the email and try again.";
    case "OTP_EXPIRED":
      return "That code expired. Send a new one.";
    case "TOO_MANY_ATTEMPTS":
      return "Too many wrong tries. Send a new code.";
    default:
      return error.message ?? "Something went wrong. Try again.";
  }
}

// Step 2 of email sign-up: type the 4-digit code we emailed.
// A correct code verifies the email and logs you in (autoSignInAfterVerification).
export function VerifyEmailForm({
  email,
  reason,
  onBack,
}: {
  email: string;
  reason: "signup" | "unverified";
  onBack: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN); // a code was just sent

  // Count the resend cooldown down once a second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const { error } = await authClient.emailOtp
      .verifyEmail({ email, otp: code })
      .catch(() => ({ error: { message: NETWORK_ERROR } as AuthError }));
    if (error) {
      setPending(false);
      setError(messageFor(error));
      return;
    }
    router.push("/console");
    router.refresh();
  }

  async function onResend() {
    setError(null);
    setNotice(null);
    setCooldown(RESEND_COOLDOWN);
    const { error } = await authClient.emailOtp
      .sendVerificationOtp({ email, type: "email-verification" })
      .catch(() => ({ error: { message: NETWORK_ERROR } as AuthError }));
    if (error) {
      setError(messageFor(error));
      return;
    }
    setCode("");
    setNotice("New code sent. The old one no longer works.");
  }

  return (
    <div className="auth__card">
      <h1 className="auth__title">Check your email</h1>
      <p className="auth__sub">
        {reason === "unverified" ? "Your email isn't confirmed yet. " : ""}
        We sent a 4-digit code to <strong className="auth__email">{email}</strong>. It expires
        in 10 minutes.
      </p>

      {/* method="post": the no-JS fallback must never put form data in the URL. */}
      <form className="auth__form" method="post" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">Code</span>
          <input
            className="input auth__code"
            name="code"
            value={code}
            // Digits only, max 4 (paste-friendly: "1 2 3 4" becomes "1234").
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="one-time-code" // phones can autofill it from the email
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="0000"
            autoFocus
            required
          />
        </label>

        {error && (
          <p className="auth__error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="auth__notice" role="status">
            {notice}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={pending || code.length !== 4}
        >
          {pending ? "Checking…" : "Confirm email"}
        </button>
      </form>

      <p className="auth__switch">
        <button type="button" onClick={onResend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
        </button>
        {" · "}
        <button type="button" onClick={onBack}>
          Use a different email
        </button>
      </p>
    </div>
  );
}
