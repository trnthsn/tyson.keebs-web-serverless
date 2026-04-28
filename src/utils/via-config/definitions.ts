import Dexie from 'dexie';
import {
  isVIADefinitionV2,
  isVIADefinitionV3,
  isKeyboardDefinitionV2,
  isKeyboardDefinitionV3,
  keyboardDefinitionV2ToVIADefinitionV2,
  keyboardDefinitionV3ToVIADefinitionV3,
} from '@the-via/reader';
import type { VIADefinitionV2, VIADefinitionV3 } from '@the-via/reader';
import resourcesData from '@/data/resources.json';

type ParsedDefinition =
  | { version: 'v2'; definition: VIADefinitionV2 }
  | { version: 'v3'; definition: VIADefinitionV3 };

interface CachedDefinition {
  vendorProductId: number;
  data: ParsedDefinition;
  name: string;
  cachedAt: number;
}

interface ResourceFile {
  url: string;
  format: string;
  mcu?: string;
  size?: string;
}

interface Resource {
  id: string;
  name: string;
  description: string;
  category: string;
  keyboardModel: string;
  vendorProductId?: number;
  files: ResourceFile[];
}

const resources = resourcesData as Resource[];

const db = new Dexie('ViaDefinitions');
db.version(1).stores({
  definitions: 'vendorProductId',
});

const inMemoryCache = new Map<number, ParsedDefinition>();

const parseDefinition = (json: unknown): ParsedDefinition | null => {
  if (isVIADefinitionV2(json)) {
    return { version: 'v2', definition: json };
  }
  if (isVIADefinitionV3(json)) {
    return { version: 'v3', definition: json };
  }
  if (isKeyboardDefinitionV2(json)) {
    return { version: 'v2', definition: keyboardDefinitionV2ToVIADefinitionV2(json) };
  }
  if (isKeyboardDefinitionV3(json)) {
    return { version: 'v3', definition: keyboardDefinitionV3ToVIADefinitionV3(json) };
  }
  return null;
};

export const fetchDefinition = async (
  vendorProductId: number
): Promise<ParsedDefinition | null> => {
  if (inMemoryCache.has(vendorProductId)) {
    return inMemoryCache.get(vendorProductId)!;
  }

  try {
    const cached = await db.table<CachedDefinition>('definitions').get(vendorProductId);
    if (cached) {
      inMemoryCache.set(vendorProductId, cached.data);
      return cached.data;
    }
  } catch {
    // IndexedDB unavailable
  }

  const matchingResources = resources.filter(
    (r) => r.category === 'JSON_DEFINITION' && r.vendorProductId === vendorProductId
  );

  for (const resource of matchingResources) {
    for (const file of resource.files) {
      try {
        const res = await fetch(file.url);
        const json = await res.json();
        const parsed = parseDefinition(json);
        if (parsed) {
          inMemoryCache.set(vendorProductId, parsed);
          try {
            await db.table<CachedDefinition>('definitions').put({
              vendorProductId,
              data: parsed,
              name: resource.name,
              cachedAt: Date.now(),
            });
          } catch {
            // IndexedDB unavailable
          }
          return parsed;
        }
      } catch {
        // fetch or parse error
      }
    }
  }

  return null;
};

export const getCachedDefinition = async (
  vendorProductId: number
): Promise<ParsedDefinition | null> => {
  if (inMemoryCache.has(vendorProductId)) {
    return inMemoryCache.get(vendorProductId)!;
  }
  try {
    const cached = await db.table<CachedDefinition>('definitions').get(vendorProductId);
    if (cached) {
      inMemoryCache.set(vendorProductId, cached.data);
      return cached.data;
    }
  } catch {}
  return null;
};

export const clearDefinitionCache = async () => {
  inMemoryCache.clear();
  try {
    await db.table('definitions').clear();
  } catch {}
};
