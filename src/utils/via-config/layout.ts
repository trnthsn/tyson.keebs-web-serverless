import type { VIADefinitionV2, VIADefinitionV3, VIAKey } from '@the-via/reader';
import { getMatrixIndex } from './protocol';

export type Definition = VIADefinitionV2 | VIADefinitionV3;

export type VisibleKey = VIAKey & {
  displayIndex: number;
  matrixIndex: number;
};

export type LayoutOptionControl = {
  index: number;
  label: string;
  choices: { value: number; label: string }[];
};

const KEY_WIDTH = 56;
const KEY_HEIGHT = 58;
const KEY_GAP = 4;
const KEY_STEP_X = KEY_WIDTH + KEY_GAP;
const KEY_STEP_Y = KEY_HEIGHT + KEY_GAP;

const widthToPixels = (units: number) => units * KEY_WIDTH + Math.max(0, units - 1) * KEY_GAP;
const heightToPixels = (units: number) =>
  units * KEY_HEIGHT + Math.max(0, units - 1) * KEY_GAP;

const toPixels = (units: number, step: number) => units * step;

export const getVisibleKeys = (
  definition: Definition,
  layoutOptions: number[],
): VisibleKey[] => {
  const optionKeyGroups = definition.layouts.optionKeys
    ? Object.entries(definition.layouts.optionKeys)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, value]) => value)
    : [];

  const optionKeys = optionKeyGroups.flatMap((group, index) => {
      const selected = layoutOptions[index] ?? 0;
      return group?.[selected] ?? [];
    });

  return definition.layouts.keys
    .concat(optionKeys)
    .map((key, displayIndex) => ({
      ...key,
      displayIndex,
      matrixIndex: getMatrixIndex(definition.matrix.cols, key),
    }));
};

export const getLayoutOptionControls = (definition: Definition): LayoutOptionControl[] => {
  if (!definition.layouts.labels?.length) {
    return [];
  }

  return definition.layouts.labels.map((entry, index) => {
    if (Array.isArray(entry)) {
      return {
        index,
        label: entry[0] ?? `Layout ${index + 1}`,
        choices: entry.slice(1).map((choice, value) => ({ value, label: choice })),
      };
    }

    return {
      index,
      label: entry || `Layout ${index + 1}`,
      choices: [
        { value: 0, label: 'Off' },
        { value: 1, label: 'On' },
      ],
    };
  });
};

type ComboShape = {
  path: string | null;
  textBox: { x: number; y: number; width: number; height: number };
};

const getComboShape = (key: VIAKey): ComboShape => {
  const x = toPixels(key.x, KEY_STEP_X);
  const y = toPixels(key.y, KEY_STEP_Y);
  const w = widthToPixels(key.w);
  const h = heightToPixels(key.h);

  if (
    key.w2 === undefined ||
    key.h2 === undefined ||
    key.x2 === undefined ||
    key.y2 === undefined
  ) {
    return {
      path: `M ${x} ${y} h ${w} v ${h} h ${-w} Z`,
      textBox: { x, y, width: w, height: h },
    };
  }

  const x2 = toPixels(key.x + key.x2, KEY_STEP_X);
  const y2 = toPixels(key.y + key.y2, KEY_STEP_Y);
  const w2 = widthToPixels(key.w2);
  const h2 = heightToPixels(key.h2);

  const boundingWidth = Math.max(key.w, key.w2);
  const boundingHeight = Math.max(key.h, key.h2);
  const minX = Math.min(key.x, key.x + key.x2);
  const minY = Math.min(key.y, key.y + key.y2);
  const [nx, nx2, ny, ny2, nw, nw2, nh, nh2] =
    key.w === boundingWidth
      ? [
          key.x + key.x2 - minX,
          key.x - minX,
          key.y + key.y2 - minY,
          key.y - minY,
          key.w2,
          key.w,
          key.h2,
          key.h,
        ]
      : [
          key.x - minX,
          key.x + key.x2 - minX,
          key.y - minY,
          key.y + key.y2 - minY,
          key.w,
          key.w2,
          key.h,
          key.h2,
        ];

  const corners = [
    [nx2 / boundingWidth, ny2 / boundingHeight],
    [nx / boundingWidth, ny2 / boundingHeight],
    [nx / boundingWidth, ny / boundingHeight],
    [(nx + nw) / boundingWidth, ny / boundingHeight],
    [(nx + nw) / boundingWidth, ny2 / boundingHeight],
    [(nx2 + nw2) / boundingWidth, ny2 / boundingHeight],
    [(nx2 + nw2) / boundingWidth, (ny2 + nh2) / boundingHeight],
    [(nx + nw) / boundingWidth, (ny2 + nh2) / boundingHeight],
    [(nx + nw) / boundingWidth, (ny + nh) / boundingHeight],
    [nx / boundingWidth, (ny + nh) / boundingHeight],
    [nx / boundingWidth, (ny2 + nh2) / boundingHeight],
    [nx2 / boundingWidth, (ny2 + nh2) / boundingHeight],
  ];

  const boxWidth = widthToPixels(boundingWidth);
  const boxHeight = heightToPixels(boundingHeight);
  const points = corners
    .map(([px, py]) => `${x + px * boxWidth} ${y + py * boxHeight}`)
    .join(' L ');

  return {
    path: `M ${points} Z`,
    textBox: {
      x: Math.min(x, x2),
      y: Math.min(y, y2),
      width: Math.max(x + w, x2 + w2) - Math.min(x, x2),
      height: Math.max(y + h, y2 + h2) - Math.min(y, y2),
    },
  };
};

export const getKeyRenderData = (key: VIAKey) => {
  const { path, textBox } = getComboShape(key);
  const rotation = key.r ?? 0;
  const originX = toPixels(key.rx ?? 0, KEY_STEP_X);
  const originY = toPixels(key.ry ?? 0, KEY_STEP_Y);

  return {
    path,
    textBox,
    transform:
      rotation !== 0 ? `rotate(${rotation} ${originX} ${originY})` : undefined,
  };
};

export const getKeyboardBounds = (keys: VIAKey[]) => {
  // The SVG paths use pixel-sized KLE coordinates. Keep the viewBox in that
  // same coordinate system; using raw KLE units here clips the layout at 0,0.
  const boxes = keys.map((key) => getKeyRenderData(key).textBox);
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
  };
};
