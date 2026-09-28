import type { Metadata } from "next";
import { SdkDocs } from "@/components/SdkDocs";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: "JevDB Docs · Client SDK",
  description: "Call Jev through JevDB's Python or JavaScript client and keep a copy of every decision.",
};

export default function SdkDocsPage() {
  return <SdkDocs />;
}
