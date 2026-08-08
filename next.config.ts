import { readFileSync } from "fs";
import type { NextConfig } from "next";

const getBuildVersion = (): string => {
  try {
    const changelog = JSON.parse(
      readFileSync("src/data/changelog.json", "utf8"),
    ) as { version: string }[];
    return changelog[0]?.version ?? "1.0.0";
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
