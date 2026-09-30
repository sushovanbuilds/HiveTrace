import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow loading HMR/runtime chunks when hitting the server from
  // another device on the LAN (e.g. a phone scanning http://192.168.0.112:3000).
  allowedDevOrigins: ["192.168.0.112", "192.168.0.*", "10.*.*.*"],
};

export default nextConfig;
