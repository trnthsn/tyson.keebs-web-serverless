import { execSync } from "child_process";
import type { NextConfig } from "next";

const GITHUB_OWNER = "trnthsn";
const GITHUB_REPO = "Tyson.Keebs_PCB";

type ChangelogEntry = {
  version: string;
  hash: string;
  subject: string;
  date: string;
  url: string;
};

const generateChangelog = (): ChangelogEntry[] => {
  try {
    const raw = execSync(
      "git log --first-parent --format=%H%x1f%s%x1f%ad --date=short",
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, subject, date] = line.split("\x1f");
        const cleaned = subject.replace(/^TSK-\d+\s*:\s*/i, "");
        return { hash, subject: cleaned, date };
      });

    const total = raw.length;
    return raw.map((c, i) => ({
      version: `1.0.${total - i}`,
      hash: c.hash,
      subject: c.subject,
      date: c.date,
      url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commit/${c.hash}`,
    }));
  } catch {
    return [];
  }
};

const changelog = generateChangelog();

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BUILD_VERSION: changelog[0]?.version ?? "1.0.0",
    NEXT_PUBLIC_CHANGELOG: JSON.stringify(changelog),
  },
};

export default nextConfig;