// Dummy data for the dashboard: `bun run db:seed` (from web/).
//
//   bun run db:seed                      seed every profile that exists
//   bun run db:seed --email you@x.com    seed one profile
//   bun run db:seed --demo               also create two demo profiles you can log in as
//   bun run db:seed --reset              delete the profile's decisions first
//   bun run db:seed --count 100          decisions per profile (default 60)
//
// Every decision is built exactly like an SDK record and saved with saveDecision(),
// the same function /ingest uses, so the dashboard sees realistic data.
import { hashPassword } from "better-auth/crypto";
import { pool } from "@/lib/db";
import { saveDecision, type AddedContext, type DecisionRecord } from "@/lib/decisions";

// Local test logins created by --demo. Dev only: never use these anywhere real.
const DEMO_PROFILES = [
  { name: "Demo A", email: "demo-a@jevdb.test" },
  { name: "Demo B", email: "demo-b@jevdb.test" },
];
const DEMO_PASSWORD = "jevdb-demo-password";

// ── args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const COUNT = Number(value("count") ?? 60);

// ── a small seeded random generator, so each profile gets stable data ──
function rng(seedText: string) {
  let s = [...seedText].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── what each group asks Jev ─────────────────────────────────────────
type Q =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string | null> }
  | { type: "score"; instructions: string; criteria: string[] };

const GROUPS: Record<string, { states: string[]; questions: Record<string, Q> }> = {
  "support-bot": {
    states: [
      "I was charged twice for order A-104. Please fix this ASAP.",
      "How do I reset my password? The link in the email expired.",
      "My package says delivered but it's not here.",
      "Can I change the shipping address on my order?",
      "Your app keeps crashing when I open the settings page.",
      "I want a refund, the product arrived broken.",
      "Where can I download my invoices for last year?",
      "This is the third time I'm writing. Nobody answers. Cancel my subscription.",
    ],
    questions: {
      is_billing: { type: "noul", instructions: "Is this ticket about billing?" },
      tone: {
        type: "choice",
        instructions: "What is the customer's tone?",
        criteria: { calm: null, frustrated: null, angry: null },
      },
      urgency: { type: "score", instructions: "How urgent is this ticket?", criteria: ["can wait", "this week", "today"] },
    },
  },
  "sales-router": {
    states: [
      "Hi, we're a 500-person company looking at your enterprise plan. Can we get a demo?",
      "What's the price difference between Pro and Team?",
      "Just browsing, is there a free tier?",
      "We need SSO and a DPA before we can buy. Who do I talk to?",
      "Our trial ends tomorrow and the import tool is failing.",
      "Can you beat the quote we got from your competitor?",
    ],
    questions: {
      intent: {
        type: "choice",
        instructions: "What does the lead want?",
        criteria: { pricing: "Asks about plans or cost", demo: "Wants a call or demo", support: "Has a product problem", other: null },
      },
      is_enterprise: { type: "noul", instructions: "Is this an enterprise-size lead?" },
      lead_quality: { type: "score", instructions: "How likely is this lead to buy soon?", criteria: ["cold", "warm", "hot"] },
    },
  },
  moderation: {
    states: [
      "Check out my new crypto course!!! 1000% returns guaranteed, link in bio",
      "Great write-up, thanks for sharing the benchmark numbers.",
      "You clearly have no idea what you're talking about, idiot.",
      "Does anyone know if the API supports webhooks?",
      "DM me for cheap followers",
      "I disagree with point 3, the latency numbers look off to me.",
    ],
    questions: {
      is_spam: { type: "noul", instructions: "Is this message spam?" },
      category: {
        type: "choice",
        instructions: "Which moderation category fits best?",
        criteria: { ok: "Normal discussion", harassment: "Insults or attacks", spam: "Ads or scams", unclear: null },
      },
      toxicity: { type: "score", instructions: "How toxic is this message?", criteria: ["none", "mild", "severe"] },
    },
  },
};

// ── build one fake Jev answer for a question ─────────────────────────
function answerFor(q: Q, r: () => number) {
  if (q.type === "noul") {
    const p = r() < 0.5 ? 0.02 + r() * 0.3 : 0.7 + r() * 0.29;
    return { type: "noul" as const, noul: round(p) };
  }
  const options = q.type === "choice" ? Object.keys(q.criteria) : q.criteria.map((_, i) => String(i));
  // Mostly a clear winner; sometimes a near-tie between two options (low confidence).
  const nearTie = r() < 0.15;
  const winner = Math.floor(r() * options.length);
  const runner = (winner + 1 + Math.floor(r() * (options.length - 1))) % options.length;
  const weights = options.map((_, i) => (i === winner ? (nearTie ? 1 : 3 + r() * 6) : i === runner && nearTie ? 0.9 : r() * 0.6));
  const total = weights.reduce((a, b) => a + b, 0);
  const probs = weights.map((w) => w / total);
  const sorted = [...probs].sort((a, b) => b - a);
  // Confidence follows how far ahead the winner is, with some noise: near-ties land low.
  const confidence = round(Math.min(0.98, Math.max(0.18, 0.25 + (sorted[0]! - sorted[1]!) * 0.7 + (r() - 0.5) * 0.2)));
  const probabilities = Object.fromEntries(options.map((o, i) => [o, round(probs[i]!)]));
  if (q.type === "choice") return { type: "choice" as const, choice: options[winner]!, confidence, probabilities };
  const score = round(probs.reduce((sum, p, i) => sum + p * i, 0));
  return { type: "score" as const, score, confidence, probabilities, legend: Object.fromEntries(q.criteria.map((c, i) => [String(i), c])) };
}

const round = (n: number) => Math.round(n * 100) / 100;
const pick = <T,>(xs: T[], r: () => number) => xs[Math.floor(r() * xs.length)]!;

// ── build one full SDK record (and sometimes the context JevDB added) ──
function makeDecision(r: () => number, i: number, profileTag: string): { record: DecisionRecord; context?: AddedContext } {
  const group = pick(Object.keys(GROUPS), r);
  const g = GROUPS[group]!;
  const state = pick(g.states, r);
  const questions = g.questions;
  const started = new Date(Date.now() - r() * 7 * 24 * 3600 * 1000); // within the last 7 days
  const record: DecisionRecord = {
    id: `seed-${profileTag}-${i}`,
    started_at: started.toISOString(),
    latency_ms: round(80 + r() * 320),
    status: 200,
    error: null,
    user_id: `user_${101 + Math.floor(r() * 12)}`,
    group_id: group,
    tags: r() < 0.8 ? ["prod"] : r() < 0.5 ? ["staging"] : ["prod", "beta"],
    request: { model: r() < 0.6 ? "jev-1.13.0" : "jev-latest", state, questions },
    response: null,
    sdk: r() < 0.7 ? "jevdb-python/0.2.0" : "jevdb-js/0.2.0",
  };

  // A few failed calls: Jev rate-limited us or rejected the request.
  if (r() < 0.04) {
    const limited = r() < 0.5;
    record.status = limited ? 429 : 422;
    record.error = limited ? "TypeSafeRateLimitError: 429 rate limited" : "UnprocessableEntityError: 422 invalid criteria";
    record.response = { error: limited ? "rate limited" : "criteria must have at least two options" };
    return { record };
  }

  const answers = Object.fromEntries(Object.entries(questions).map(([k, q]) => [k, answerFor(q, r)]));
  record.response = {
    model: "jev-1.13.0",
    answers,
    usage: { input_tokens: 90 + Math.floor(r() * 400), output_tokens: 6 * Object.keys(questions).length },
  };

  // About 1 in 4 calls had retrieval on: JevDB added past graded examples to a choice question.
  if (r() < 0.25) {
    const [key, q] = Object.entries(questions).find(([, q]) => q.type === "choice")!;
    const options = Object.keys((q as { criteria: Record<string, unknown> }).criteria);
    const examples = [0, 1, 2].map(() => {
      const label = pick(options, r);
      return { state: pick(g.states, r), answer: label, grade: "good", graded_at: new Date(started.getTime() - r() * 5e8).toISOString() };
    });
    return {
      record,
      context: {
        source: "retrieval",
        example_set: `${key}@v${1 + Math.floor(r() * 12)}`,
        body: { question: key, injected_into: `questions.${key}.criteria.<option>.examples`, examples },
      },
    };
  }
  return { record };
}

// ── profiles ─────────────────────────────────────────────────────────
async function ensureDemoProfiles() {
  const hashed = await hashPassword(DEMO_PASSWORD);
  for (const p of DEMO_PROFILES) {
    const db = await pool.connect();
    try {
      // One transaction per profile: the profile and its login are created together or not at all.
      await db.query("BEGIN");
      const found = await db.query<{ id: string }>("SELECT id FROM profile WHERE email = $1", [p.email]);
      const id =
        found.rows[0]?.id ??
        (await db.query<{ id: string }>(`INSERT INTO profile (name, email, "emailVerified") VALUES ($1, $2, true) RETURNING id`, [p.name, p.email]))
          .rows[0]!.id;
      // What Better Auth writes for an email + password sign-up: a "credential" account holding the hash.
      const hasLogin = await db.query("SELECT 1 FROM account WHERE profile_id = $1 AND \"providerId\" = 'credential'", [id]);
      if (!hasLogin.rowCount) {
        await db.query(
          `INSERT INTO account ("accountId", "providerId", profile_id, password, "updatedAt") VALUES ($1, 'credential', $2, $3, now())`,
          [id, id, hashed],
        );
        console.log(`demo login ready: ${p.email}`);
      }
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    } finally {
      db.release();
    }
  }
}

async function main() {
  if (flag("demo")) await ensureDemoProfiles();

  const email = value("email");
  const profiles = (
    await pool.query<{ id: string; email: string }>(
      email ? "SELECT id, email FROM profile WHERE email = $1" : "SELECT id, email FROM profile ORDER BY email",
      email ? [email] : [],
    )
  ).rows;

  if (profiles.length === 0) {
    console.log(
      email
        ? `No profile with email ${email} yet. Log in once at http://localhost:3000/login (email or Google) to create it, then run this again.`
        : "No profiles yet. Sign up at http://localhost:3000/login, or run: bun run db:seed --demo",
    );
    return;
  }

  for (const p of profiles) {
    if (flag("reset")) {
      const del = await pool.query("DELETE FROM requests WHERE profile_id = $1", [p.id]);
      await pool.query("DELETE FROM states WHERE profile_id = $1", [p.id]);
      await pool.query("DELETE FROM question_versions WHERE profile_id = $1", [p.id]);
      await pool.query("DELETE FROM instructions WHERE profile_id = $1", [p.id]);
      console.log(`${p.email}: deleted ${del.rowCount} decisions`);
    }
    // A fresh run tag, so running the seed twice adds new decisions instead of skipping them.
    const runTag = `${p.id.slice(0, 8)}-${Date.now().toString(36)}`;
    const r = rng(runTag);
    let withContext = 0;
    for (let i = 0; i < COUNT; i++) {
      const { record, context } = makeDecision(r, i, runTag);
      await saveDecision(p.id, record, context);
      if (context) withContext++;
    }
    console.log(`${p.email}: added ${COUNT} decisions (${withContext} with context added)`);
  }
}

await main()
  .catch((err) => {
    console.error("seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
