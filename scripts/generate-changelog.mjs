#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const GITHUB_OWNER = 'trnthsn';
const GITHUB_REPO = 'Tyson.Keebs_PCB';

const firstParentLog = () => {
  return execSync('git log --first-parent --format=%H%x1f%s%x1f%ad --date=short', {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, subject, date] = line.split('\x1f');
      const cleaned = subject.replace(/^TSK-\d+\s*:\s*/i, '');
      return { hash, subject: cleaned, date };
    });
};

const main = () => {
  const commits = firstParentLog();
  const total = commits.length;
  const entries = commits.map((c, i) => ({
    version: `1.0.${total - i}`,
    hash: c.hash,
    subject: c.subject,
    date: c.date,
    url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commit/${c.hash}`,
  }));

  const outputPath = resolve(process.cwd(), 'src/data/changelog.json');
  writeFileSync(outputPath, JSON.stringify(entries, null, 2));
  console.log(`Generated changelog.json with ${entries.length} entries → ${outputPath}`);
};

main();