import type { Metadata } from "next";
import { CustomExamplesDocs } from "@/components/RagDocs";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: "DecisionDB Docs · Custom examples",
  description: "Hand-picked examples for retrieval. Coming soon.",
};

export default function CustomExamplesPage() {
  return <CustomExamplesDocs />;
}
