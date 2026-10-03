import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/app.css";

export const metadata: Metadata = {
  title: "DecisionDB",
  description: "Self-hosted logging and outcome grading for the Jev API, backed by Postgres.",
};

// Wraps every page. Next.js adds the <head> tags from `metadata` automatically.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..600&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
