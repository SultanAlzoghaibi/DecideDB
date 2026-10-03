import type { Metadata } from "next";
import { SdkFlow, SdkFlowJoined, SdkFlowNested, SdkFlowOneDb, SdkFlowWrapped } from "@/components/SdkFlow";
import { SdkFlowRag } from "@/components/SdkFlowRag";
import { SdkFlowRagSide, SdkFlowRagStack } from "@/components/SdkFlowRagCache";

// Preview page for comparing diagram versions. Not linked from the site.
export const metadata: Metadata = {
  title: "DecideDB diagrams",
  robots: { index: false },
};

const VERSIONS = [
  { name: "A · SDK as its own box", Diagram: SdkFlow },
  { name: "B · SDK inside your app, linked by lines", Diagram: SdkFlowNested },
  { name: "C · your code + SDK joined, call! on the seam", Diagram: SdkFlowJoined },
  { name: "D · SDK wrapped around your code", Diagram: SdkFlowWrapped },
  { name: "C2 · like C, but one DecideDB under the SDK (on the landing page)", Diagram: SdkFlowOneDb },
  { name: "RAG 1 · cache as a chip on the SDK", Diagram: SdkFlowRag },
  { name: "RAG 2 · side cache: lookup arrow in, return arrow out (from the sketch)", Diagram: SdkFlowRagSide },
  { name: "RAG 3 · stacked cache: on the line from SDK to DecideDB (on the landing page)", Diagram: SdkFlowRagStack },
];

export default function DiagramsPage() {
  return (
    <main className="container review-page">
      <p className="section">
        <a className="btn btn--ghost" href="/diagrams/json-to-table">
          JSON → tables diagrams →
        </a>
      </p>
      {VERSIONS.map(({ name, Diagram }) => (
        <section key={name} className="section">
          <p className="eyebrow">{name}</p>
          <Diagram />
        </section>
      ))}
    </main>
  );
}
