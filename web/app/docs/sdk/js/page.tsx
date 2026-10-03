import type { Metadata } from "next";
import { SdkLangDocs } from "@/components/sdkdocs/SdkLangDocs";
import "@/styles/docs.css";

export const metadata: Metadata = {
  title: "DecideDB Docs · JS / TS SDK",
  description: "Install, configure and use the DecideDB JS / TS SDK.",
};

export default function Page() {
  return <SdkLangDocs lang="js" />;
}
