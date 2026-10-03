import type { Metadata } from "next";
import { DocsPage } from "@/components/DocsPage";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: "DecideDB Docs",
  description: "How to set up DecideDB, connect your app, and grade Jev decisions.",
};

export default function Docs() {
  return <DocsPage />;
}
