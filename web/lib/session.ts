// Who is logged in? Server-only helpers for pages and route handlers.
// This is the one place Better Auth's `user` becomes our `profile`.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type Profile = {
  profileId: string;
  email: string;
  name: string;
};

// The current profile, or null when nobody is logged in.
export async function getProfile(): Promise<Profile | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, email, name } = session.user;
  return { profileId: id, email, name };
}

// Same, but sends logged-out visitors to /login. Use at the top of protected pages.
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}
