"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className="btn btn--ghost" disabled={pending} onClick={onClick}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
