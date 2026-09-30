// Datadog-style search for the decisions explorer:
//
//   group:support-bot type:choice conf:>0.8 tag:prod refund
//
// `key:value` tokens become filters; everything else is free-text search.
// Pure functions (no database), so the page can also use them to draw filter chips.

export type Facet = "group" | "user" | "type" | "tag" | "context" | "status";
export type Token = { key: Facet | "conf"; value: string; raw: string };

const FACETS = new Set(["group", "user", "type", "tag", "context", "status", "conf"]);

export type Parsed = {
  tokens: Token[];
  text: string; // free text, searched across questions, answers, users and state
  group?: string;
  user?: string;
  type?: "noul" | "choice" | "score" | "error";
  tag?: string;
  context?: "yes" | "no";
  status?: "ok" | "error";
  minConf?: number;
  maxConf?: number;
};

const TYPE_ALIASES: Record<string, Parsed["type"]> = {
  noul: "noul", yesno: "noul", "yes/no": "noul", bool: "noul",
  choice: "choice", score: "score", error: "error", errors: "error",
};

export function parseQuery(q: string | undefined): Parsed {
  const out: Parsed = { tokens: [], text: "" };
  const free: string[] = [];
  // Split on spaces, but keep "quoted values" together: group:"support bot".
  for (const raw of (q ?? "").match(/\S+:"[^"]*"|\S+/g) ?? []) {
    const m = raw.match(/^([a-z]+):(.+)$/i);
    const key = m?.[1]?.toLowerCase();
    if (!m || !key || !FACETS.has(key)) {
      free.push(raw);
      continue;
    }
    const value = m[2]!.replace(/^"|"$/g, "");
    const tok: Token = { key: key as Token["key"], value, raw };
    if (key === "group") out.group = value;
    else if (key === "user") out.user = value;
    else if (key === "tag") out.tag = value;
    else if (key === "type") out.type = TYPE_ALIASES[value.toLowerCase()];
    else if (key === "context") out.context = /^(yes|true|1)$/i.test(value) ? "yes" : "no";
    else if (key === "status") out.status = /^(error|err|fail)/i.test(value) ? "error" : "ok";
    else if (key === "conf") {
      // conf:>0.8  conf:<0.5  conf:0.9 (means >= 0.9)
      const c = value.match(/^([<>]=?)?\s*(0?\.\d+|1(\.0+)?|0)$/);
      if (c) {
        const n = Number(c[2]);
        if (c[1]?.startsWith("<")) out.maxConf = n;
        else out.minConf = n;
      }
    }
    out.tokens.push(tok);
  }
  out.text = free.join(" ").trim();
  return out;
}

// The query with one token removed (for the × on a filter chip).
export function withoutToken(q: string, raw: string): string {
  return q.split(/\s+/).filter((t) => t && t !== raw).join(" ");
}

// The query with `key:value` set (replacing any existing token for that key).
export function withToken(q: string, key: Facet, value: string): string {
  const v = /\s/.test(value) ? `"${value}"` : value;
  const kept = (q.match(/\S+:"[^"]*"|\S+/g) ?? []).filter((t) => !t.toLowerCase().startsWith(`${key}:`));
  return [...kept, `${key}:${v}`].join(" ");
}

// Time ranges for the range buttons: key → hours (null = all time).
export const RANGES = [
  { key: "1h", label: "1h", hours: 1 },
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
  { key: "all", label: "All", hours: null },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];
export const rangeHours = (key: string | undefined) => RANGES.find((r) => r.key === key)?.hours ?? 24 * 7;
