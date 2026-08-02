import type { Resource, ResourceCategory, ResourceFile } from './types';

export const categoryOrder: ResourceCategory[] = ['All', 'JSON_DEFINITION', 'FIRMWARE', 'BOOTLOADER'];

export const categoryLabel = (category: ResourceCategory) => {
  if (category === 'All') return 'All';
  if (category === 'JSON_DEFINITION') return 'JSON';
  return category;
};

export const formatBadge = (format: string) => {
  const base = 'bg-[#fbfbfb] dark:bg-[#1a1a1a] text-[#121212] dark:text-white border';
  const border = ['JSON', 'UF2', 'BIN'].includes(format)
    ? 'border-[#121212] dark:border-white'
    : 'border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)]';
  return `${base} ${border}`;
};

export const computeVendorProductId = (vendorId: number, productId: number) =>
  (vendorId << 16) | productId;

export const firmwareFileLabel = (file: ResourceFile) => {
  const target = file.mcu ? `${file.mcu} (${file.format})` : file.format;
  const version = file.version ? ` ${file.version}` : '';
  return file.variant ? `${file.variant}${version} - ${target}` : `${target}${version}`;
};

export const getHid = () => {
  if (!('hid' in navigator)) return null;
  return navigator.hid as HID;
};

const keyboardModelAliases: Record<string, string> = {
  s6xty5hs: 'S6xty5HS',
  s6xty5neor2: 'S6xty5Neo R2',
  s6xtyneo: 'S6xtyNeo',
  s6xtyr2: 'S6xtyR2',
  s7venty5jelly: 'S7venty5Jelly',
  tysons100: 'TysonS100',
};

const normalizeKeyboardName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const resolveModelWithinCandidates = (productName: string, candidates: Resource[]) => {
  const normalizedProductName = normalizeKeyboardName(productName);

  const exactCandidate = candidates.find(
    (resource) => normalizedProductName === normalizeKeyboardName(resource.keyboardModel)
  );
  if (exactCandidate) return exactCandidate.keyboardModel;

  const matchingCandidate = [...candidates]
    .sort(
      (a, b) =>
        normalizeKeyboardName(b.keyboardModel).length - normalizeKeyboardName(a.keyboardModel).length
    )
    .find((resource) => normalizedProductName.includes(normalizeKeyboardName(resource.keyboardModel)));
  if (matchingCandidate) return matchingCandidate.keyboardModel;

  const matchingAlias = Object.entries(keyboardModelAliases).find(([alias]) =>
    normalizedProductName.includes(alias)
  );
  if (matchingAlias) {
    const aliasCandidate = candidates.find(
      (resource) =>
        normalizeKeyboardName(resource.keyboardModel) === normalizeKeyboardName(matchingAlias[1])
    );
    if (aliasCandidate) return aliasCandidate.keyboardModel;
  }

  return candidates[0].keyboardModel;
};

export type KeyboardLookupResult = {
  model: string;
  definition: Resource;
  firmware: Resource | null;
};

export const lookupKeyboard = (
  detected: { vendorId: number; productId: number; productName: string },
  resources: Resource[]
): KeyboardLookupResult | null => {
  const vendorProductId = computeVendorProductId(detected.vendorId, detected.productId);

  const definitions = resources.filter(
    (resource) =>
      resource.category === 'JSON_DEFINITION' && resource.vendorProductId === vendorProductId
  );
  if (definitions.length === 0) return null;

  const model = resolveModelWithinCandidates(detected.productName, definitions);
  const definition = definitions.find(
    (resource) => resource.keyboardModel === model
  ) ?? definitions[0];
  const firmware =
    resources.find(
      (resource) =>
        resource.category === 'FIRMWARE' &&
        resource.keyboardModel.toLowerCase() === definition.keyboardModel.toLowerCase()
    ) ?? null;

  return { model: definition.keyboardModel, definition, firmware };
};
