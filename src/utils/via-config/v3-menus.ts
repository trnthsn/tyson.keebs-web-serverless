import { commonMenus } from '@the-via/reader';

// V3 definitions express lighting (and other features) as menus. Common
// menus (e.g. qmk_rgblight) are resolved from the reader and rendered
// generically; values are read/written via the custom menu protocol
// commands (0x08/0x07/0x09) using [channel, id] addressing.

export type MenuControl = {
  name: string;
  channel: number;
  id: number;
  type: 'range' | 'dropdown' | 'color' | 'toggle';
  label: string;
  options?: string[];
  min?: number;
  max?: number;
  showIf?: string;
  bytes: number;
};

export type FlattenedMenu = {
  menuLabel: string;
  submenuLabel: string | null;
  control: MenuControl;
};

type MenuNode = {
  label?: string;
  type?: string;
  content?: unknown;
  options?: unknown;
  showIf?: string;
};

export const resolveV3Menus = (menus: unknown): MenuNode[] => {
  if (!Array.isArray(menus)) return [];
  return menus.flatMap((menu) =>
    typeof menu === 'string'
      ? (commonMenus as Record<string, MenuNode[]>)[menu] ?? []
      : [menu as MenuNode],
  );
};

const isControlNode = (node: MenuNode): boolean =>
  !!node && typeof node === 'object' && typeof node.type === 'string';

const toMenuControl = (node: MenuNode): MenuControl | null => {
  if (!isControlNode(node) || !Array.isArray(node.content)) return null;
  const [name, channel, id] = node.content;
  if (
    typeof name !== 'string' ||
    typeof channel !== 'number' ||
    typeof id !== 'number'
  ) {
    return null;
  }
  const control: MenuControl = {
    name,
    channel,
    id,
    type: node.type as MenuControl['type'],
    label: node.label ?? name,
    showIf: node.showIf,
    bytes: node.type === 'color' ? 2 : 1,
  };
  if (node.type === 'dropdown' && Array.isArray(node.options)) {
    control.options = node.options.map((o) =>
      typeof o === 'string' ? o : Array.isArray(o) ? String(o[0]) : String(o),
    );
  }
  if (node.type === 'range' && Array.isArray(node.options)) {
    control.min = node.options[0];
    control.max = node.options[1];
  }
  return control;
};

export const flattenV3Menus = (menus: MenuNode[]): FlattenedMenu[] => {
  const out: FlattenedMenu[] = [];
  const walk = (
    nodes: MenuNode[],
    menuLabel: string,
    submenuLabel: string | null,
  ) => {
    for (const node of nodes ?? []) {
      if (isControlNode(node)) {
        const control = toMenuControl(node);
        if (control) {
          out.push({ menuLabel, submenuLabel, control });
        }
        continue;
      }
      if (node && typeof node === 'object' && Array.isArray(node.content)) {
        walk(
          node.content as MenuNode[],
          menuLabel,
          typeof node.label === 'string' ? node.label : submenuLabel,
        );
      }
    }
  };
  for (const menu of menus) {
    if (menu && typeof menu === 'object' && Array.isArray(menu.content)) {
      walk(
        menu.content as MenuNode[],
        typeof menu.label === 'string' ? menu.label : 'Menu',
        null,
      );
    }
  }
  return out;
};

export const evalShowIf = (
  expr: string | undefined,
  values: Record<string, number[] | undefined>,
): boolean => {
  if (!expr) return true;
  try {
    const compiled = expr.replace(/\{[a-zA-Z0-9_]+\}/g, (match) => {
      const value = values[match.slice(1, -1)]?.[0];
      return String(value ?? 0);
    });
    // eslint-disable-next-line no-new-func
    return !!new Function(`return (${compiled});`)();
  } catch {
    return true;
  }
};
