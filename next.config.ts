import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["watch.local", "watch.localhost", "localhost"],
  reactStrictMode: true,
};

export default nextConfig;
