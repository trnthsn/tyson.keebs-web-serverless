#!/usr/bin/env node

const GITHUB_OWNER = 'trnthsn';
const GITHUB_REPO = 'Tyson.Keebs_PCB';
const GITHUB_BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;
const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

const TOKEN = process.env.GITHUB_TOKEN || '';

async function fetchJson(url, useAuth = false) {
  const headers = {};
  if (TOKEN && useAuth) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function fetchRaw(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function getRepoTree() {
  const data = await fetchJson(`${API_BASE}/git/trees/${GITHUB_BRANCH}?recursive=1`);
  return data.tree;
}

async function extractVendorProductId(rawUrl) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const json = await fetchRaw(rawUrl);
      if (json.vendorId && json.productId) {
        const vendorId = parseInt(json.vendorId, 16);
        const productId = parseInt(json.productId, 16);
        if (!isNaN(vendorId) && !isNaN(productId)) {
          return (vendorId << 16) | productId;
        }
      }
      return null;
    } catch (err) {
      if (attempt === 2) {
        console.error(`  Failed to extract from ${rawUrl}: ${err.message}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

function cleanModelName(name) {
  let base = name.replace(/\.json$/i, '');
  base = base.replace(/^trnthsn_/, '').replace(/_via$/, '');
  return base
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, '');
}

function getFirmwareVariant(model, filename) {
  if (model === 'Tyson80') {
    return filename.includes('blackcore') ? 'Blackcore' : 'Non-Blackcore';
  }
  return undefined;
}

function getFirmwareVersion(model, filename) {
  if (model === 'Tyson80') {
    if (filename.includes('native')) return 'Native';
    if (filename.includes('_via')) return 'VIA';
  }
  return undefined;
}

async function main() {
  console.log(`Fetching repo tree from ${GITHUB_OWNER}/${GITHUB_REPO}...`);
  const tree = await getRepoTree();

  const viaFiles = [];
  const firmwareFiles = [];
  const bootloaderFiles = [];
  const fileSizes = {};

  for (const item of tree) {
    if (item.type !== 'blob') continue;
    fileSizes[item.path] = item.size;
    const path = item.path;

    if (path.startsWith('Via/') && path.endsWith('.json')) {
      viaFiles.push({ name: path.replace('Via/', ''), fullPath: path });
    } else if (path.startsWith('Firmware/')) {
      firmwareFiles.push({ path: path.replace('Firmware/', ''), fullPath: path });
    } else if (path.startsWith('Bootloader/')) {
      bootloaderFiles.push({ path: path.replace('Bootloader/', ''), fullPath: path });
    }
  }

  const resources = [];
  let idCounter = 1;

  const viaPromises = viaFiles.map(async (vf) => {
    const url = `${RAW_BASE}/${vf.fullPath}`;
    const model = cleanModelName(vf.name);
    const size = fileSizes[vf.fullPath]
      ? `${Math.round(fileSizes[vf.fullPath] / 1024)} KB`
      : '';
    const vpid = await extractVendorProductId(url);
    if (!vpid) return null;

    return {
      id: `via-${idCounter++}`,
      name: `${model} VIA Definition`,
      description: `VIA keymap JSON definition for ${model}`,
      category: 'JSON_DEFINITION',
      keyboardModel: model,
      vendorProductId: vpid,
      files: [{ url, format: 'JSON', size }],
    };
  });

  const viaResults = (await Promise.all(viaPromises)).filter(Boolean);
  resources.push(...viaResults);

  const firmwareGroups = {};
  for (const ff of firmwareFiles) {
    const parts = ff.path.split('/');
    const model = parts[0];
    if (!firmwareGroups[model]) firmwareGroups[model] = [];
    firmwareGroups[model].push(ff);
  }

  for (const [model, files] of Object.entries(firmwareGroups)) {
    const fileEntries = [];
    for (const ff of files) {
      const url = `${RAW_BASE}/${ff.fullPath}`;
      const parts = ff.path.split('/');
      const filename = parts[parts.length - 1];
      const mcu =
        parts.length > 2
          ? parts.length === 3 ? parts[1] : parts[parts.length - 2]
          : undefined;
      const format = filename.endsWith('.uf2') ? 'UF2' : filename.endsWith('.bin') ? 'BIN' : 'FILE';
      const variant = getFirmwareVariant(model, filename);
      const version = getFirmwareVersion(model, filename);
      const size = fileSizes[ff.fullPath]
        ? `${Math.round(fileSizes[ff.fullPath] / 1024)} KB`
        : '';

      fileEntries.push({ url, format, mcu, variant, version, size });
    }

    resources.push({
      id: `fw-${idCounter++}`,
      name: `${model} Firmware`,
      description: `VIA-compatible firmware for ${model}`,
      category: 'FIRMWARE',
      keyboardModel: model,
      files: fileEntries,
    });
  }

  for (const bf of bootloaderFiles) {
    const url = `${RAW_BASE}/${bf.fullPath}`;
    const parts = bf.path.split('/');
    const filename = parts[parts.length - 1];
    const format = filename.endsWith('.uf2') ? 'UF2' : filename.endsWith('.bin') ? 'BIN' : 'FILE';
    const size = fileSizes[bf.fullPath]
      ? `${Math.round(fileSizes[bf.fullPath] / 1024)} KB`
      : '';
    const model = parts[0];

    resources.push({
      id: `bl-${idCounter++}`,
      name: filename,
      description: `Bootloader for ${model}`,
      category: 'BOOTLOADER',
      keyboardModel: model,
      files: [{ url, format, size }],
    });
  }

  const fs = await import('fs');
  const path = await import('path');
  const outputPath = path.resolve(process.cwd(), 'src/data/resources.json');
  fs.writeFileSync(outputPath, JSON.stringify(resources, null, 2));
  console.log(`Generated resources.json with ${resources.length} entries → ${outputPath}`);
}

main().catch((err) => {
  console.error('Failed to generate resources:', err);
  process.exit(1);
});
