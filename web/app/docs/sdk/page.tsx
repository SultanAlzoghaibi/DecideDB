import type { Metadata } from "next";
import { SdkOverview } from "@/components/sdkdocs/SdkOverview";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: "DecideDB Docs · SDK",
  description: "What the DecideDB SDK does, and how to pick Python or JS / TS.",
};

export default function SdkPage() {
  return <SdkOverview />;
}
