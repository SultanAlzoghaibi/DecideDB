"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setPending(true);
    setFailed(false);
    // The client throws on network failure (instead of returning an error), so treat both the same.
    const didFail = await authClient.signOut().then(
      ({ error }) => !!error,
      () => true,
    );
    if (didFail) {
      // Still logged in: don't pretend otherwise, let them retry.
      setPending(false);
      setFailed(true);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className="btn btn--ghost" disabled={pending} onClick={onClick}>
      {pending ? "Signing out…" : failed ? "Sign out failed, retry" : "Sign out"}
    </button>
  );
}
