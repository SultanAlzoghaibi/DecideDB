import type { Metadata } from "next";
import { SdkOverview } from "@/components/sdkdocs/SdkOverview";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: "JevDB Docs · SDK",
  description: "What the JevDB SDK does, and how to pick Python or JS / TS.",
};

export default function SdkPage() {
  return <SdkOverview />;
}
