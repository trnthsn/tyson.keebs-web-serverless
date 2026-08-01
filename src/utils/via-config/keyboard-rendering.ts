import type { VIADefinitionV2, VIADefinitionV3, VIAKey } from '@the-via/reader';
import {
  getLabelForByte,
  getShortNameForKeycode,
  getCustomKeycodeIndex,
  type IKeycode,
  isAlpha,
  isNumpadNumber,
  isNumpadSymbol,
  isMultiLegend,
  isCustomKeycodeByte,
  isArrowKey,
  isMacroKeycodeByte,
  getMacroKeycodeIndex,
} from './key';

export const CSSVarObject = {
  keyWidth: 52,
  keyXSpacing: 2,
  keyHeight: 54,
  keyYSpacing: 2,
  keyXPos: 52 + 2,
  keyYPos: 54 + 2,
  faceXPadding: [6, 6],
  faceYPadding: [2, 10],
  insideBorder: 10,
};

// Mirrors via-app getSelectedKeyDefinitions:
// base keys + the option keys of every layout group at its selected option
export const getRenderedKeys = (
  keys: VIAKey[],
  optionKeys: { [g: string]: { [o: string]: VIAKey[] } } | undefined,
  layoutOptions: number[] | null,
): VIAKey[] => {
  if (!layoutOptions || !optionKeys) return keys;
  return keys.concat(
    layoutOptions.flatMap((option, idx) => optionKeys[idx]?.[option] ?? []),
  );
};

export function calculatePointPosition({
  x = 0,
  x2 = 0,
  y = 0,
  r = 0,
  rx = 0,
  ry = 0,
  w = 0,
  w2 = 0,
  h = 0,
}: VIAKey) {
  const rRadian = (r * (2 * Math.PI)) / 360;
  const cosR = Math.cos(rRadian);
  const sinR = Math.sin(rRadian);
  const originX = CSSVarObject.keyXPos * rx;
  const originY = CSSVarObject.keyYPos * ry;
  const xPos =
    CSSVarObject.keyXPos * (x + x2) +
    (Math.max(w2, w) * CSSVarObject.keyWidth) / 2 +
    ((Math.max(w2, w) - 1) * CSSVarObject.keyXSpacing) / 2;
  const yPos =
    CSSVarObject.keyYPos * y +
    (h * CSSVarObject.keyHeight) / 2 +
    ((h - 1) * CSSVarObject.keyYSpacing) / 2;
  const transformedXPos =
    xPos * cosR - yPos * sinR - originX * cosR + originY * sinR + originX;
  const transformedYPos =
    xPos * sinR + yPos * cosR - originX * sinR - originY * cosR + originY;

  return [transformedXPos, transformedYPos] as [number, number];
}

const sortByX = (a: VIAKey, b: VIAKey) => {
  const aPoint = calculatePointPosition(a);
  const bPoint = calculatePointPosition(b);
  return aPoint[0] - bPoint[0];
};

const sortByYX = (a: VIAKey, b: VIAKey) => {
  const aPoint = calculatePointPosition(a);
  const bPoint = calculatePointPosition(b);
  return aPoint[1] - bPoint[1] === 0
    ? aPoint[0] - bPoint[0]
    : aPoint[1] - bPoint[1];
};

const withinChain = (a: VIAKey, b: VIAKey) => {
  const aPoint = calculatePointPosition(a);
  const bPoint = calculatePointPosition(b);

  const yDiff = Math.abs(aPoint[1] - bPoint[1]);
  return yDiff < CSSVarObject.keyYPos * 0.9;
};

const getTraversalOrder = (arr: VIAKey[]): VIAKey[] => {
  const [car, ...cdr] = [...arr].sort(sortByYX);
  if (car === undefined) {
    return cdr;
  } else {
    const chain = [car, ...arr.filter((a) => a !== car && withinChain(car, a))];
    const rest = arr.filter((a) => !chain.includes(a));
    return [...chain.sort(sortByX), ...getTraversalOrder(rest)];
  }
};

export const getNextKey = (
  currIndex: number,
  keys: VIAKey[],
): number | null => {
  const displayedKeys = keys.filter((k) => !k.d);
  const currKey = keys[currIndex];
  const sortedKeys = getTraversalOrder([...displayedKeys]);
  const sortedIndex = sortedKeys.indexOf(currKey);
  return sortedIndex === sortedKeys.length - 1
    ? null
    : keys.indexOf(sortedKeys[(sortedIndex + 1) % sortedKeys.length]);
};

export const getKeyId = (k: VIAKey) =>
  `${k.w}-${k.h}-${k.col}-${k.row}-${k.w2}-${k.h2}`;

const getLabelOffsets = (
  topLabel: string,
  bottomLabel: string,
): [number, number] => {
  let topLabelOffset = 0.0;
  let bottomLabelOffset = 0.0;

  if (topLabel.length == 1) {
    if ('^*"'.split('').includes(topLabel[0])) {
      topLabelOffset = 0.2;
    }
  }

  if (bottomLabel.length == 1) {
    if (',.'.split('').includes(bottomLabel[0])) {
      bottomLabelOffset = 0.4;
    } else if ("/\\;'[]".split('').includes(bottomLabel[0])) {
      bottomLabelOffset = 0.3;
    } else if ('-'.split('').includes(bottomLabel[0])) {
      bottomLabelOffset = 0.1;
    }
  }

  return [topLabelOffset, bottomLabelOffset];
};

export type KeyLabel = {
  label?: string;
  topLabel?: string;
  bottomLabel?: string;
  centerLabel?: string;
  tooltipLabel?: string;
  macroExpression?: string;
  key?: string;
  size?: number;
  offset?: [number, number];
};

export const getLabel = (
  keycodeByte: number,
  width: number,
  macroExpressions: string[],
  selectedDefinition: VIADefinitionV2 | VIADefinitionV3 | null,
  basicKeyToByte: Record<string, number>,
  byteToKey: Record<number, string>,
): KeyLabel => {
  let label: string = '';
  let size: number = 1.0;
  let offset: [number, number] = [0, 0];

  let tooltipLabel: string = '';
  if (
    isCustomKeycodeByte(keycodeByte, basicKeyToByte) &&
    selectedDefinition?.customKeycodes &&
    selectedDefinition.customKeycodes[
      getCustomKeycodeIndex(keycodeByte, basicKeyToByte)
    ] !== undefined
  ) {
    const customKeycodeIdx = getCustomKeycodeIndex(keycodeByte, basicKeyToByte);
    label = getShortNameForKeycode(
      selectedDefinition.customKeycodes[customKeycodeIdx] as IKeycode,
    );
    tooltipLabel = getShortNameForKeycode(
      selectedDefinition.customKeycodes[customKeycodeIdx] as IKeycode,
      700,
    );
  } else if (keycodeByte) {
    label =
      getLabelForByte(keycodeByte, width * 100, basicKeyToByte, byteToKey) ??
      '';
    tooltipLabel =
      getLabelForByte(keycodeByte, 700, basicKeyToByte, byteToKey) ?? '';
  }
  let macroExpression: string | undefined;
  if (isMacroKeycodeByte(keycodeByte, basicKeyToByte)) {
    const macroKeycodeIdx = getMacroKeycodeIndex(keycodeByte, basicKeyToByte);
    macroExpression = macroExpressions[macroKeycodeIdx];
    tooltipLabel = macroExpression || '';
  }

  if (isAlpha(label) || isNumpadNumber(label)) {
    return (
      (label && {
        label: label.toUpperCase(),
        macroExpression,
        key: (label || '') + (macroExpression || ''),
        size: size,
        offset: offset,
      }) as KeyLabel
    );
  } else if (isMultiLegend(label)) {
    const topLabel = label[0];
    const bottomLabel = label[label.length - 1];
    return (
      (bottomLabel && {
        topLabel,
        bottomLabel,
        macroExpression,
        key: (label || '') + (macroExpression || ''),
        size: size,
        offset: getLabelOffsets(topLabel, bottomLabel),
      }) as KeyLabel
    );
  } else {
    if (isNumpadSymbol(label)) {
      size = 2.0;
    }
    if (isArrowKey(label)) {
      size = 1.5;
    }
    return {
      label,
      centerLabel: label,
      tooltipLabel,
      macroExpression,
      key: (label || '') + (macroExpression || ''),
      size: size,
      offset: offset,
    };
  }
};
