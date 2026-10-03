import type { Metadata } from "next";
import { RagDocs } from "@/components/RagDocs";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: "DecisionDB Docs · Retrieval (RAG)",
  description: "Add your best-graded past decisions to new Jev calls as examples, per group.",
};

export default function RagDocsPage() {
  return <RagDocs />;
}
