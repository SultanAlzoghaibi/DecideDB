"use server";

// Server Action: the settings form posts here directly (no API route needed).
// Next.js runs this on the server, so it can check the login and write to Postgres.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { RAG_MODES, saveRagSetting, type RagMode } from "@/lib/rag";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export async function saveRagAction(form: FormData) {
  const { profileId } = await requireProfile();
  const groupId = String(form.get("group_id") ?? "").trim();
  if (!groupId || groupId.length > 200) return;

  const mode = String(form.get("mode"));
  await saveRagSetting(profileId, {
    groupId,
    // "off" (the default) turns retrieval off but keeps the last mode for next time.
    enabled: RAG_MODES.includes(mode as RagMode),
    mode: RAG_MODES.includes(mode as RagMode) ? (mode as RagMode) : "automatic",
    minScore: clamp(Number(form.get("min_score")) || 0, 0, 1),
    sameTags: form.get("same_tags") === "on",
    maxExamples: clamp(Math.round(Number(form.get("max_examples")) || 3), 1, 10),
  });
  revalidatePath("/console/rag");
  if (form.get("after") === "open") redirect(`/console/rag/${encodeURIComponent(groupId)}`);
}
