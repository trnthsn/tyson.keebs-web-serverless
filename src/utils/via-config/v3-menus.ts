import { commonMenus } from '@the-via/reader';

export type MenuControl = {
  name: string;
  channel: number;
  id: number;
  type: 'range' | 'dropdown' | 'color' | 'toggle' | 'keycode' | 'button' | 'label' | 'color-palette';
  label: string;
  options?: unknown;
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
    bytes: node.type === 'color' ? 2 : node.type === 'keycode' ? 2 : 1,
  };
  if (node.type === 'dropdown' && Array.isArray(node.options)) {
    control.options = node.options;
  }
  if (node.type === 'range' && Array.isArray(node.options)) {
    control.min = node.options[0];
    control.max = node.options[1];
    control.options = node.options as [number, number];
  }
  if (node.type === 'button' && Array.isArray(node.options)) {
    control.options = node.options as [number];
  }
  if (node.type === 'toggle' && Array.isArray(node.options)) {
    control.options = node.options as [number, number][];
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

export const isCustomMenuCommandContent = (
  content: unknown,
): content is [string, number, number, ...number[]] =>
  Array.isArray(content) &&
  content.length >= 3 &&
  typeof content[0] === 'string' &&
  content.slice(1).every((value) => typeof value === 'number');
