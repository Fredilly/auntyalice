import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { authInterrupts: true },
  // The dev overlay badge was floating over the mobile bottom nav in screenshots.
  devIndicators: false,
};
export default config;
