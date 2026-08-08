import { execSync } from "child_process";
import type { NextConfig } from "next";

const getBuildVersion = (): string => {
  try {
    const count = execSync("git rev-list --count --first-parent HEAD", {
      encoding: "utf8",
    }).trim();
    return `1.0.${count}`;
  } catch {
    return "1.0.0";
  }
};

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BUILD_VERSION: getBuildVersion(),
  },
};

export default nextConfig;
