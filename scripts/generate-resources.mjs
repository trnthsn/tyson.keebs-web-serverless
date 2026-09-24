#!/usr/bin/env node
/**
 * generate-resources.mjs
 *
 * Builds `src/data/resources.json` (+ `src/data/resources.meta.json`) from the
 * Tyson.Keebs PCB library repo on GitHub.
 *
 * Design goals:
 * - Deterministic output: stable slug-based IDs, sorted entries. Two runs
 *   against the same repo state produce byte-identical `resources.json`.
 * - Resilient networking: auth on every GitHub call, timeouts, retries with
 *   exponential backoff, rate-limit awareness, bounded concurrency.
 * - Validated data: VIA definitions without a usable vendor/product pair are
 *   skipped with a logged reason; manual resources are schema-validated.
 * - Backward compatible: every field the web app consumes keeps its shape and
 *   semantics (`id`, `name`, `description`, `category`, `keyboardModel`,
 *   `vendorProductId`, `files[].url/format/mcu/variant/version/size`).
 *   Enrichment fields (`sizeBytes`, `keyboardModelSlug`) are additive only.
 *
 * Usage:
 *   node scripts/generate-resources.mjs [--dry-run] [--verbose] [--limit=N] [--check]
 *
 * Env overrides:
 *   GITHUB_OWNER / GITHUB_REPO / GITHUB_BRANCH / GITHUB_TOKEN
 */

const CONFIG = {
  owner: process.env.GITHUB_OWNER || 'trnthsn',
  repo: process.env.GITHUB_REPO || 'Tyson.Keebs_PCB',
  branch: process.env.GITHUB_BRANCH || 'main',
  token: process.env.GITHUB_TOKEN || '',
  concurrency: 8,
  timeoutMs: 15000,
  attempts: 3,
};

const CATEGORY_ORDER = ['JSON_DEFINITION', 'FIRMWARE', 'BOOTLOADER'];
const KNOWN_CATEGORIES = new Set(CATEGORY_ORDER);
// Folders in the library repo that hold VIA/JSON keymap definitions.
// `Via/` is the current canonical folder; `Keymap/` is accepted so a future
// rename of that folder keeps working (matches the `/keymap` app route).
const DEFINITION_PREFIXES = ['Via/', 'Keymap/', 'via/', 'keymap/'];
const MCU_DIR_PATTERN = /^(F0\d{2}|F1\d{2}|RP2040|STM32\w*|AT32\w*|GD32\w*)$/i;
const HEX_PATTERN = /^(0x)?[0-9a-fA-F]+$/;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flags = {
  dryRun: argv.includes('--dry-run'),
  verbose: argv.includes('--verbose'),
  check: argv.includes('--check'),
  help: argv.includes('--help') || argv.includes('-h'),
  limit: null,
};
for (const arg of argv) {
  if (arg.startsWith('--limit=')) {
    const n = parseInt(arg.split('=')[1], 10);
    if (Number.isFinite(n) && n > 0) flags.limit = n;
  }
}

if (flags.help) {
  console.log(`Usage: node scripts/generate-resources.mjs [options]

Options:
  --dry-run    Fetch and validate, but do not write any files
  --check      Validate existing src/data/resources.json + manual-resources.json (no network)
  --limit=N    Only process the first N keymap definitions (for quick testing)
  --verbose    Log every processed file
  --help       Show this help

Env: GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = (...args) => console.log(...args);
const verbose = (...args) => {
  if (flags.verbose) console.log(...args);
};
const warn = (...args) => console.warn('warning:', ...args);

/** URL-safe stable slug, e.g. "S6xty5Neo R2" -> "s6xty5neo-r2". */
const slugify = (value) => {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
};

/** Human-readable size that never prints "0 KB" for non-empty files. */
const formatSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 10) return `${kb.toFixed(1)} KB`;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const formatOf = (filename) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.uf2')) return 'UF2';
  if (lower.endsWith('.bin')) return 'BIN';
  if (lower.endsWith('.hex')) return 'HEX';
  if (lower.endsWith('.zip')) return 'ZIP';
  if (lower.endsWith('.json')) return 'JSON';
  return 'FILE';
};

/**
 * Display model name from a definition filename.
 * e.g. "trnthsn_s6xty5hs.json" -> "S6xty5hs", "trnthsn_tyson60tsangan_via.json" -> "Tyson60tsangan".
 */
const cleanModelName = (filename) => {
  let base = String(filename).replace(/\.json$/i, '');
  base = base
    .replace(/^trnthsn_/, '')
    .replace(/_via$/i, '')
    .replace(/_keymap$/i, '');
  const model = base
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, '');
  return model || 'Unknown';
};

/** MCU/target folder segment, e.g. ["E8ghty","F072","file.bin"] -> "F072". */
const mcuFromParts = (parts) => {
  if (parts.length <= 2) return undefined;
  const segment = parts[parts.length - 2];
  return MCU_DIR_PATTERN.test(segment) ? segment : undefined;
};

/** Variant label (currently only Tyson80 ships Blackcore / Non-Blackcore builds). */
const getFirmwareVariant = (model, filename) => {
  if (model === 'Tyson80') {
    return filename.includes('blackcore') ? 'Blackcore' : 'Non-Blackcore';
  }
  return undefined;
};

/** Version label (currently only Tyson80 distinguishes Native / VIA builds). */
const getFirmwareVersion = (model, filename) => {
  if (model === 'Tyson80') {
    if (filename.includes('native')) return 'Native';
    if (filename.includes('_via') || filename.includes('_keymap')) return 'VIA';
  }
  return undefined;
};

// ---------------------------------------------------------------------------
// Resilient GitHub fetching
// ---------------------------------------------------------------------------

const githubHeaders = () => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tysonkeebs-resource-generator',
  };
  if (CONFIG.token) headers.Authorization = `Bearer ${CONFIG.token}`;
  return headers;
};

const rateLimitDelayMs = (res) => {
  const retryAfter = Number(res.headers.get('retry-after') || 0);
  if (Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter < 300) {
    return retryAfter * 1000;
  }
  const reset = Number(res.headers.get('x-ratelimit-reset') || 0);
  if (Number.isFinite(reset) && reset > 0) {
    const waitMs = reset * 1000 - Date.now() + 1000;
    if (waitMs > 0 && waitMs < 5 * 60 * 1000) return waitMs;
  }
  return 0;
};

/**
 * Fetch with timeout, retries (exponential backoff + jitter) and GitHub
 * rate-limit awareness. Returns the raw Response for the caller to parse.
 */
const fetchWithRetry = async (url, { attempts = CONFIG.attempts } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: githubHeaders(),
        signal: AbortSignal.timeout(CONFIG.timeoutMs),
      });
      if (res.status === 403 || res.status === 429) {
        const waitMs = rateLimitDelayMs(res);
        if (attempt < attempts) {
          await sleep(waitMs || 2000 * attempt);
          continue;
        }
      }
      if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await sleep(500 * 2 ** (attempt - 1) + Math.random() * 250);
      }
    }
  }
  throw lastError;
};

const API_BASE = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}`;
const RAW_BASE = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}`;

const getRepoTree = async () => {
  const res = await fetchWithRetry(`${API_BASE}/git/trees/${CONFIG.branch}?recursive=1`);
  const data = await res.json();
  if (!Array.isArray(data.tree)) throw new Error('Unexpected repo tree response');
  return data.tree;
};

/** HEAD commit of the branch (best-effort provenance for the meta file). */
const getBranchHeadSha = async () => {
  try {
    const res = await fetchWithRetry(`${API_BASE}/commits/${CONFIG.branch}`);
    const data = await res.json();
    return typeof data.sha === 'string' ? data.sha : null;
  } catch (err) {
    warn(`could not resolve branch HEAD sha: ${err.message}`);
    return null;
  }
};

/** Bounded-concurrency pool that preserves input order in the results. */
const runPool = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (next < items.length) {
        const index = next++;
        try {
          results[index] = await fn(items[index], index);
        } catch (err) {
          results[index] = { __error: err };
        }
      }
    },
  );
  await Promise.all(workers);
  return results;
};

/**
 * Extract the combined vendor:product id from a VIA definition JSON.
 * Returns { vendorProductId } on success or { skipped } with a reason.
 */
const extractVendorProductId = async (rawUrl) => {
  let lastError;
  for (let attempt = 1; attempt <= CONFIG.attempts; attempt++) {
    try {
      const res = await fetchWithRetry(rawUrl);
      const json = await res.json();
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        return { skipped: 'definition is not a JSON object' };
      }
      const { vendorId, productId } = json;
      if (typeof vendorId !== 'string' || typeof productId !== 'string') {
        return { skipped: 'missing vendorId/productId' };
      }
      const v = vendorId.trim();
      const p = productId.trim();
      if (!HEX_PATTERN.test(v) || !HEX_PATTERN.test(p)) {
        return { skipped: `non-hex vendorId/productId (${vendorId}/${productId})` };
      }
      const vendor = parseInt(v, 16);
      const product = parseInt(p, 16);
      if (!Number.isFinite(vendor) || !Number.isFinite(product)) {
        return { skipped: 'unparsable vendorId/productId' };
      }
      if (vendor < 0 || vendor > 0xffff || product < 0 || product > 0xffff) {
        return { skipped: 'vendorId/productId out of 16-bit range' };
      }
      return { vendorProductId: (vendor << 16) | product };
    } catch (err) {
      lastError = err;
    }
  }
  return { skipped: `fetch failed: ${lastError ? lastError.message : 'unknown error'}` };
};

// ---------------------------------------------------------------------------
// Validation (shared by generation and --check)
// ---------------------------------------------------------------------------

const validateResource = (resource, index) => {
  const problems = [];
  const where = `resources[${index}]${resource && resource.id ? ` (${resource.id})` : ''}`;
  if (!resource || typeof resource !== 'object') return [`${where}: not an object`];
  for (const field of ['id', 'name', 'description', 'category', 'keyboardModel']) {
    if (typeof resource[field] !== 'string' || resource[field].length === 0) {
      problems.push(`${where}: missing/invalid "${field}"`);
    }
  }
  if (!KNOWN_CATEGORIES.has(resource.category)) {
    problems.push(`${where}: unknown category "${resource.category}"`);
  }
  if (!Array.isArray(resource.files) || resource.files.length === 0) {
    problems.push(`${where}: "files" must be a non-empty array`);
  } else {
    resource.files.forEach((file, i) => {
      if (!file || typeof file.url !== 'string' || typeof file.format !== 'string') {
        problems.push(`${where}.files[${i}]: missing url/format`);
      }
    });
  }
  if (
    resource.category === 'JSON_DEFINITION' &&
    !Number.isInteger(resource.vendorProductId)
  ) {
    problems.push(`${where}: JSON_DEFINITION without integer vendorProductId`);
  }
  return problems;
};

const validateManualResources = (manual) => {
  if (!Array.isArray(manual)) throw new Error('manual-resources.json must be an array');
  const problems = [];
  const seen = new Set();
  manual.forEach((resource, i) => {
    problems.push(...validateResource(resource, i));
    if (resource && typeof resource.id === 'string') {
      if (seen.has(resource.id)) problems.push(`manual-resources[${i}]: duplicate id "${resource.id}"`);
      seen.add(resource.id);
    }
  });
  if (problems.length > 0) {
    throw new Error(`Invalid manual-resources.json:\n- ${problems.join('\n- ')}`);
  }
};

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

const stripDefinitionPrefix = (path) => {
  for (const prefix of DEFINITION_PREFIXES) {
    if (path.startsWith(prefix)) return path.slice(prefix.length);
  }
  return path;
};

const isDefinitionPath = (path) =>
  path.endsWith('.json') && DEFINITION_PREFIXES.some((p) => path.startsWith(p));

/** Assign stable slug IDs after sorting, so output is deterministic. */
const assignIds = (entries, prefix) => {
  const used = new Set();
  for (const entry of entries) {
    const base = `${prefix}-${slugify(entry.keyboardModel)}`;
    let id = base;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    entry.id = id;
  }
};

const generate = async () => {
  const startedAt = Date.now();
  log(`Fetching repo tree from ${CONFIG.owner}/${CONFIG.repo}@${CONFIG.branch}...`);
  const [tree, commitSha] = await Promise.all([getRepoTree(), getBranchHeadSha()]);

  const keymapFiles = [];
  const firmwareFiles = [];
  const bootloaderFiles = [];
  const fileSizes = {};

  for (const item of tree) {
    if (!item || item.type !== 'blob' || typeof item.path !== 'string') continue;
    if (typeof item.size === 'number') fileSizes[item.path] = item.size;
    const path = item.path;
    if (isDefinitionPath(path)) {
      keymapFiles.push({ name: stripDefinitionPrefix(path), fullPath: path });
    } else if (path.startsWith('Firmware/')) {
      firmwareFiles.push({ path: path.slice('Firmware/'.length), fullPath: path });
    } else if (path.startsWith('Bootloader/')) {
      bootloaderFiles.push({ path: path.slice('Bootloader/'.length), fullPath: path });
    }
  }
  keymapFiles.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
  log(`Found ${keymapFiles.length} definitions, ${firmwareFiles.length} firmware files, ${bootloaderFiles.length} bootloader files.`);

  const limited =
    flags.limit != null ? keymapFiles.slice(0, flags.limit) : keymapFiles;
  if (flags.limit != null) log(`--limit: processing ${limited.length}/${keymapFiles.length} definitions.`);

  // Resolve vendor/product ids with bounded concurrency. Order of `limited`
  // is sorted, and results preserve input order, so IDs stay deterministic.
  const vpidResults = await runPool(limited, CONFIG.concurrency, (file) =>
    extractVendorProductId(`${RAW_BASE}/${file.fullPath}`),
  );

  const definitions = [];
  const skipped = [];
  limited.forEach((file, i) => {
    const result = vpidResults[i];
    const model = cleanModelName(file.name);
    if (result && result.__error) {
      skipped.push({ path: file.fullPath, reason: `error: ${result.__error.message}` });
      return;
    }
    if (!result || result.skipped) {
      skipped.push({ path: file.fullPath, reason: result ? result.skipped : 'unknown' });
      return;
    }
    const sizeBytes = fileSizes[file.fullPath];
    verbose(`  definition: ${model} <- ${file.fullPath}`);
    definitions.push({
      // id assigned deterministically after sorting
      id: '',
      name: `${model} VIA Definition`,
      description: `VIA keymap JSON definition for ${model}`,
      category: 'JSON_DEFINITION',
      keyboardModel: model,
      keyboardModelSlug: slugify(model),
      vendorProductId: result.vendorProductId,
      files: [
        {
          url: `${RAW_BASE}/${file.fullPath}`,
          format: 'JSON',
          size: formatSize(sizeBytes),
          ...(Number.isFinite(sizeBytes) ? { sizeBytes } : {}),
        },
      ],
    });
  });
  definitions.sort((a, b) => a.keyboardModel.localeCompare(b.keyboardModel));
  assignIds(definitions, 'via');

  // Firmware, grouped by top-level model folder.
  const firmwareGroups = new Map();
  for (const file of firmwareFiles) {
    const parts = file.path.split('/');
    if (parts.length < 2) {
      skipped.push({ path: file.fullPath, reason: 'unexpected firmware layout' });
      continue;
    }
    const model = parts[0];
    if (!firmwareGroups.has(model)) firmwareGroups.set(model, []);
    firmwareGroups.get(model).push(file);
  }
  const firmware = [...firmwareGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([model, files]) => {
      const fileEntries = files
        .map((file) => {
          const parts = file.path.split('/');
          const filename = parts[parts.length - 1];
          const sizeBytes = fileSizes[file.fullPath];
          return {
            url: `${RAW_BASE}/${file.fullPath}`,
            format: formatOf(filename),
            ...(mcuFromParts(parts) ? { mcu: mcuFromParts(parts) } : {}),
            ...(getFirmwareVariant(model, filename)
              ? { variant: getFirmwareVariant(model, filename) }
              : {}),
            ...(getFirmwareVersion(model, filename)
              ? { version: getFirmwareVersion(model, filename) }
              : {}),
            size: formatSize(sizeBytes),
            ...(Number.isFinite(sizeBytes) ? { sizeBytes } : {}),
          };
        })
        .sort((a, b) =>
          (a.mcu || '').localeCompare(b.mcu || '') ||
          a.format.localeCompare(b.format) ||
          a.url.localeCompare(b.url),
        );
      verbose(`  firmware: ${model} (${fileEntries.length} files)`);
      return {
        id: '',
        name: `${model} Firmware`,
        description: `VIA-compatible firmware for ${model}`,
        category: 'FIRMWARE',
        keyboardModel: model,
        keyboardModelSlug: slugify(model),
        files: fileEntries,
      };
    });
  assignIds(firmware, 'fw');

  // Bootloader files live directly under Bootloader/ — they are board-agnostic.
  const bootloaders = bootloaderFiles
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => {
      const parts = file.path.split('/');
      const filename = parts[parts.length - 1];
      const sizeBytes = fileSizes[file.fullPath];
      verbose(`  bootloader: ${filename}`);
      return {
        id: '',
        name: filename,
        description: `Bootloader file ${filename} for Tyson.Keebs keyboards`,
        category: 'BOOTLOADER',
        keyboardModel: 'Bootloader',
        keyboardModelSlug: 'bootloader',
        files: [
          {
            url: `${RAW_BASE}/${file.fullPath}`,
            format: formatOf(filename),
            size: formatSize(sizeBytes),
            ...(Number.isFinite(sizeBytes) ? { sizeBytes } : {}),
          },
        ],
      };
    });
  assignIds(bootloaders, 'bl');

  // Manual (curated) resources: validated, slug backfilled, override on collision.
  const fs = await import('fs');
  const path = await import('path');
  const manualPath = path.resolve(process.cwd(), 'src/data/manual-resources.json');
  const manualResources = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
  validateManualResources(manualResources);

  const resources = [...definitions, ...firmware, ...bootloaders];
  const byId = new Map(resources.map((r) => [r.id, r]));
  let manualCount = 0;
  for (const manual of manualResources) {
    const entry = {
      ...manual,
      keyboardModelSlug: manual.keyboardModelSlug || slugify(manual.keyboardModel),
    };
    if (byId.has(entry.id)) {
      warn(`manual resource "${entry.id}" overrides generated entry`);
    }
    byId.set(entry.id, entry);
    manualCount++;
  }

  const merged = [...byId.values()].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.keyboardModel.localeCompare(b.keyboardModel) ||
      a.id.localeCompare(b.id),
  );

  const problems = merged.flatMap((resource, i) => validateResource(resource, i));
  if (problems.length > 0) {
    throw new Error(`Generated invalid resources:\n- ${problems.join('\n- ')}`);
  }

  const finalCounts = {};
  for (const r of merged) finalCounts[r.category] = (finalCounts[r.category] || 0) + 1;

  const meta = {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/generate-resources.mjs',
    source: {
      owner: CONFIG.owner,
      repo: CONFIG.repo,
      branch: CONFIG.branch,
      commitSha,
    },
    counts: {
      total: merged.length,
      definitions: finalCounts.JSON_DEFINITION || 0,
      firmware: finalCounts.FIRMWARE || 0,
      bootloader: finalCounts.BOOTLOADER || 0,
      manual: manualCount,
      skipped: skipped.length,
    },
    skipped: skipped.slice(0, 50),
  };

  const outputPath = path.resolve(process.cwd(), 'src/data/resources.json');
  const metaPath = path.resolve(process.cwd(), 'src/data/resources.meta.json');

  if (flags.dryRun) {
    log(`[dry-run] would write ${merged.length} entries -> ${outputPath}`);
  } else {
    fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
    fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
    log(`Wrote ${merged.length} entries -> ${outputPath}`);
    log(`Wrote generation meta -> ${metaPath}`);
  }

  if (skipped.length > 0) {
    warn(`${skipped.length} file(s) skipped:`);
    for (const s of skipped.slice(0, 20)) warn(`  ${s.path}: ${s.reason}`);
    if (skipped.length > 20) warn(`  ...and ${skipped.length - 20} more`);
  }
  log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`);
};

// ---------------------------------------------------------------------------
// --check: offline validation of the committed data files
// ---------------------------------------------------------------------------

const runCheck = async () => {
  const fs = await import('fs');
  const path = await import('path');
  const resourcesPath = path.resolve(process.cwd(), 'src/data/resources.json');
  const manualPath = path.resolve(process.cwd(), 'src/data/manual-resources.json');
  const resources = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));
  const manual = JSON.parse(fs.readFileSync(manualPath, 'utf8'));

  if (!Array.isArray(resources) || resources.length === 0) {
    throw new Error('resources.json must be a non-empty array');
  }
  const problems = resources.flatMap((r, i) => validateResource(r, i));
  const ids = new Set();
  for (const r of resources) {
    if (ids.has(r.id)) problems.push(`duplicate id "${r.id}"`);
    ids.add(r.id);
  }
  validateManualResources(manual);

  // Determinism guards: sorted output + slug IDs.
  const sorted = [...resources].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.keyboardModel.localeCompare(b.keyboardModel) ||
      a.id.localeCompare(b.id),
  );
  if (JSON.stringify(sorted.map((r) => r.id)) !== JSON.stringify(resources.map((r) => r.id))) {
    problems.push('resources.json is not in canonical sort order (category, model, id)');
  }
  const nonSlug = resources.filter((r) => !/^(via|fw|bl)-[a-z0-9]+(-[a-z0-9]+)*$/.test(r.id));
  if (nonSlug.length > 0) {
    problems.push(`non-slug ids: ${nonSlug.slice(0, 5).map((r) => r.id).join(', ')}${nonSlug.length > 5 ? '...' : ''}`);
  }

  if (problems.length > 0) {
    console.error(`check failed (${problems.length} problem(s)):\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  const counts = {};
  for (const r of resources) counts[r.category] = (counts[r.category] || 0) + 1;
  log(`check ok: ${resources.length} resources ${JSON.stringify(counts)}, ${manual.length} manual entries.`);
};

// ---------------------------------------------------------------------------

const main = async () => {
  if (flags.check) return runCheck();
  return generate();
};

main().catch((err) => {
  console.error('Failed to generate resources:', err.message || err);
  process.exit(1);
});
