export type KeycodeOption = {
  code: number;
  label: string;
  aliases?: string[];
};

export type KeycodeLegend = {
  label?: string;
  topLabel?: string;
  bottomLabel?: string;
  centerLabel?: string;
};

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

const alphaLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const digitLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const alphaKeys = range(0x04, 0x1d).map((code, index) => ({
  code,
  label: alphaLabels[index] ?? `KC_${code.toString(16).toUpperCase()}`,
}));

const digitKeys = range(0x1e, 0x27).map((code, index) => ({
  code,
  label: digitLabels[index] ?? `${index}`,
}));

export const COMMON_KEYCODES: KeycodeOption[] = [
  { code: 0x0000, label: 'None', aliases: ['KC_NO', 'none'] },
  { code: 0x0001, label: 'Trans', aliases: ['KC_TRNS', 'transparent'] },
  ...alphaKeys,
  ...digitKeys,
  { code: 0x0028, label: 'Enter' },
  { code: 0x0029, label: 'Esc', aliases: ['Escape'] },
  { code: 0x002a, label: 'Bspc', aliases: ['Backspace'] },
  { code: 0x002b, label: 'Tab' },
  { code: 0x002c, label: 'Space' },
  { code: 0x002d, label: '-' },
  { code: 0x002e, label: '=' },
  { code: 0x002f, label: '[' },
  { code: 0x0030, label: ']' },
  { code: 0x0031, label: '\\' },
  { code: 0x0033, label: ';' },
  { code: 0x0034, label: "'" },
  { code: 0x0035, label: '`' },
  { code: 0x0036, label: ',' },
  { code: 0x0037, label: '.' },
  { code: 0x0038, label: '/' },
  { code: 0x0039, label: 'Caps' },
  ...range(0x003a, 0x0045).map((code, index) => ({
    code,
    label: `F${index + 1}`,
  })),
  { code: 0x0046, label: 'PrtSc' },
  { code: 0x0047, label: 'Scroll' },
  { code: 0x0048, label: 'Pause' },
  { code: 0x0049, label: 'Ins' },
  { code: 0x004a, label: 'Home' },
  { code: 0x004b, label: 'PgUp' },
  { code: 0x004c, label: 'Del' },
  { code: 0x004d, label: 'End' },
  { code: 0x004e, label: 'PgDn' },
  { code: 0x004f, label: 'Right' },
  { code: 0x0050, label: 'Left' },
  { code: 0x0051, label: 'Down' },
  { code: 0x0052, label: 'Up' },
  { code: 0x0053, label: 'Num' },
  { code: 0x0054, label: 'KP /' },
  { code: 0x0055, label: 'KP *' },
  { code: 0x0056, label: 'KP -' },
  { code: 0x0057, label: 'KP +' },
  { code: 0x0058, label: 'KP Enter' },
  ...range(0x0059, 0x0061).map((code, index) => ({
    code,
    label: `KP ${index + 1}`,
  })),
  { code: 0x0062, label: 'KP 0' },
  { code: 0x0063, label: 'KP .' },
  { code: 0x00e0, label: 'LCtrl' },
  { code: 0x00e1, label: 'LShift' },
  { code: 0x00e2, label: 'LAlt' },
  { code: 0x00e3, label: 'LGui' },
  { code: 0x00e4, label: 'RCtrl' },
  { code: 0x00e5, label: 'RShift' },
  { code: 0x00e6, label: 'RAlt' },
  { code: 0x00e7, label: 'RGui' },
];

const byCode = new Map(COMMON_KEYCODES.map((option) => [option.code, option]));

export const formatKeycode = (code: number) => `0x${code.toString(16).toUpperCase().padStart(4, '0')}`;

export const getKeycodeLabel = (code: number) =>
  byCode.get(code)?.label ?? formatKeycode(code);

const shiftedLegends: Record<number, [string, string]> = {
  0x1e: ['!', '1'],
  0x1f: ['@', '2'],
  0x20: ['#', '3'],
  0x21: ['$', '4'],
  0x22: ['%', '5'],
  0x23: ['^', '6'],
  0x24: ['&', '7'],
  0x25: ['*', '8'],
  0x26: ['(', '9'],
  0x27: [')', '0'],
  0x2d: ['_', '-'],
  0x2e: ['+', '='],
  0x2f: ['{', '['],
  0x30: ['}', ']'],
  0x31: ['|', '\\'],
  0x33: [':', ';'],
  0x34: ['"', "'"],
  0x35: ['~', '`'],
  0x36: ['<', ','],
  0x37: ['>', '.'],
  0x38: ['?', '/'],
};

export const getKeycodeLegend = (code: number): KeycodeLegend | undefined => {
  if (code === 0) {
    return undefined;
  }

  const shifted = shiftedLegends[code];
  if (shifted) {
    return { topLabel: shifted[0], bottomLabel: shifted[1] };
  }

  const label = getKeycodeLabel(code);
  return { label, centerLabel: label };
};

export const searchKeycodes = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return COMMON_KEYCODES;
  }

  return COMMON_KEYCODES.filter((option) => {
    const haystack = [option.label, formatKeycode(option.code), ...(option.aliases ?? [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
};

export const parseKeycodeInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = trimmed.startsWith('0x') || trimmed.startsWith('0X')
    ? Number.parseInt(trimmed, 16)
    : Number.parseInt(trimmed, 10);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffff) {
    return null;
  }

  return parsed;
};
