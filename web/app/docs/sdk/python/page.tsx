import type { Metadata } from "next";
import { SdkLangDocs } from "@/components/sdkdocs/SdkLangDocs";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: "JevDB Docs · Python SDK",
  description: "Install, configure and use the JevDB Python SDK.",
};

export default function Page() {
  return <SdkLangDocs lang="python" />;
}
