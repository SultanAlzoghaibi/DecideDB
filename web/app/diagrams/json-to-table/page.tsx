import type { Metadata } from "next";
import { JsonToTableFlow, JsonToTableFlowMeta } from "@/components/JsonToTable";

// Review page: one Jev request's JSON turning into the SQL tables. Not linked from the site.
export const metadata: Metadata = {
  title: "DecisionDB · JSON to tables",
  robots: { index: false },
};

const VERSIONS = [
  { name: "1 · the Jev request", Diagram: JsonToTableFlow },
  { name: "2 · what the SDK sends DecisionDB: user, group and tags included", Diagram: JsonToTableFlowMeta },
];

export default function JsonToTablePage() {
  return (
    <main className="container review-page">
      {VERSIONS.map(({ name, Diagram }) => (
        <section key={name} className="section">
          <p className="eyebrow">JSON → tables · {name}</p>
          <Diagram />
        </section>
      ))}
    </main>
  );
}
