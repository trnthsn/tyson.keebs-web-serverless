import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  devIndicators: false,
  async redirects() {
    return [{ source: "/via", destination: "/keymap", permanent: true }];
  },
};

export default nextConfig;