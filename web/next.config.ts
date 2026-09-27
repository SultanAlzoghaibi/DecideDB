import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundles only the files the server needs into .next/standalone, so the Cloud Run image stays small.
  output: "standalone",
};

export default nextConfig;
