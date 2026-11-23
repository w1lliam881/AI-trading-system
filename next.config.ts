import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paket med inbyggda binärer / Node-specifik kod ska inte bundlas av Next.
  serverExternalPackages: ["better-sqlite3", "yahoo-finance2", "rss-parser"],
  devIndicators: false,
};

export default nextConfig;
