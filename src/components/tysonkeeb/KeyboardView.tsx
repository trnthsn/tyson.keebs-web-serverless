'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { VIADefinitionV2, VIADefinitionV3, VIAKey } from '@the-via/reader';
import {
  CSSVarObject,
  calculatePointPosition,
  getComboKeyProps,
  getLabel,
} from '@/utils/via-config/keyboard-rendering';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { TestKeyState } from '@/utils/via-config/test-key-state';

const ARROW_MAP: Record<string, ReactNode> = {
  '↑': <ArrowUp size={14} strokeWidth={2.5} className="inline-block align-middle" />,
  '↓': <ArrowDown size={14} strokeWidth={2.5} className="inline-block align-middle" />,
  '←': <ArrowLeft size={14} strokeWidth={2.5} className="inline-block align-middle" />,
  '→': <ArrowRight size={14} strokeWidth={2.5} className="inline-block align-middle" />,
};

const renderLabelText = (text: string | undefined): ReactNode => {
  if (!text) return text;
  const hasArrow = Object.keys(ARROW_MAP).some((a) => text.includes(a));
  if (!hasArrow) return text;
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const arrowEntry = Object.entries(ARROW_MAP).find(([ch]) => remaining.startsWith(ch));
    if (arrowEntry) {
      parts.push(<span key={key++} className="inline-flex items-center">{arrowEntry[1]}</span>);
      remaining = remaining.slice(arrowEntry[0].length);
    } else {
      const nextArrowIdx = Object.keys(ARROW_MAP)
        .map((ch) => remaining.indexOf(ch))
        .filter((idx) => idx >= 0);
      const cutAt = nextArrowIdx.length > 0 ? Math.min(...nextArrowIdx) : remaining.length;
      parts.push(<span key={key++}>{remaining.slice(0, cutAt)}</span>);
      remaining = remaining.slice(cutAt);
    }
  }
  return <>{parts}</>;
};

const getKeyState = (
  pressedKeys: TestKeyState[] | Set<number> | undefined,
  matrixIndex: number,
): TestKeyState => {
  if (!pressedKeys) return TestKeyState.Initial;
  if (Array.isArray(pressedKeys)) {
    return pressedKeys[matrixIndex] ?? TestKeyState.Initial;
  }
  return pressedKeys.has(matrixIndex)
    ? TestKeyState.KeyDown
    : TestKeyState.Initial;
};

const keyWidth = CSSVarObject.keyWidth;
const keyHeight = CSSVarObject.keyHeight;
const keyXSpacing = CSSVarObject.keyXSpacing;
const keyYSpacing = CSSVarObject.keyYSpacing;
const keyXPos = CSSVarObject.keyXPos;
const keyYPos = CSSVarObject.keyYPos;
const casePadding = 10;

type ComboGeom = {
  clipPath: string;
  shiftX: number;
  boundingW: number;
  boundingH: number;
  r1: [number, number, number, number];
  r2: [number, number, number, number];
};

type KeyData = {
  index: number;
  left: number;
  top: number;
  outerWidth: number;
  outerHeight: number;
  rotation: number;
  matrixIndex: number | null;
  isEncoder: boolean;
  isMatrixKey: boolean;
  combo: ComboGeom | null;
  label: ReturnType<typeof getLabel> | null;
};

const keycapBgClass = (isKeyDown: boolean, selected: boolean) =>
  `relative rounded-[0.6rem] transition-transform duration-100 ${
    isKeyDown ? 'scale-[0.95]' : selected ? 'scale-[0.96]' : ''
  } ${
    selected ? 'bg-[#c9c9c9] dark:bg-[#4a4a4a]' : 'bg-[#bdbdbd] dark:bg-[#3f3f3f]'
  }`;

const faceBgClass = (selected: boolean, highlight: boolean) =>
  `w-full h-full rounded-[0.35rem] relative overflow-hidden transition-colors duration-300 ${
    highlight ? 'text-[#ffffff]' : 'text-[#363434] dark:text-[#d9d9d9]'
  } ${
    selected ? 'bg-[#ffffff] dark:bg-[#484848]' : 'bg-[#f0f0f0] dark:bg-[#363434]'
  }`;

const stateOverlayClass = (_isKeyDown: boolean, _isKeyUp: boolean) =>
  _isKeyDown || _isKeyUp ? 'bg-[#e57373]/70' : '';

const KeyFrame = memo(function KeyFrame({
  data,
  keyState,
  selectable,
  selected,
  onKeyClick,
}: {
  data: KeyData;
  keyState: TestKeyState;
  selectable: boolean;
  selected: boolean;
  onKeyClick: (index: number) => void;
}) {
  const isKeyDown = keyState === TestKeyState.KeyDown;
  const isKeyUp = keyState === TestKeyState.KeyUp;
  const isHighlighted = isKeyDown || isKeyUp;
  const pressable = selectable && !data.isEncoder && data.isMatrixKey;
  const lab = data.label;

  const renderFace = (
    primary: boolean,
    shiftLegend = false,
    squareBottomRight = false,
  ) => (
    <div
      className={faceBgClass(selected, isHighlighted)}
      style={squareBottomRight ? { borderBottomRightRadius: 0 } : undefined}
    >
      {(isKeyDown || isKeyUp) && (
        <div
          className={`absolute inset-0 ${stateOverlayClass(isKeyDown, isKeyUp)} pointer-events-none`}
          style={squareBottomRight ? { borderBottomRightRadius: 0 } : undefined}
        />
      )}
      {primary && (
        <div className="absolute inset-0 z-10">
          {data.isEncoder ? (
            <div className="absolute inset-0 flex items-center justify-center text-[1.6rem]">
              ↻
            </div>
          ) : lab?.topLabel != null && lab?.bottomLabel != null ? (
            <>
              <div
                className="absolute leading-none"
                style={{
                  left: 4,
                  top: 4 + (lab.offset?.[0] || 0) * 12,
                  fontSize: 16,
                }}
              >
                {renderLabelText(lab.topLabel)}
              </div>
              <div
                className="absolute leading-none"
                style={{
                  left: 4,
                  bottom: 4 + (lab.offset?.[1] || 0) * 12,
                  fontSize: 16,
                }}
              >
                {renderLabelText(lab.bottomLabel)}
              </div>
            </>
          ) : lab?.centerLabel != null ? (
            <div
              className="absolute inset-y-0 flex items-center font-bold"
              style={{
                left: 3,
                fontSize: 13 * (lab.size || 1),
                transform: shiftLegend ? 'translateY(-1em)' : undefined,
              }}
            >
              <span
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {renderLabelText(lab.label)}
              </span>
            </div>
          ) : (
            <div className="absolute leading-none" style={{ left: 4, top: 4, fontSize: 22 }}>
              {renderLabelText(lab?.label ?? '')}
            </div>
          )}
        </div>
      )}
      {selected && (
        <div className="absolute inset-0 rounded-[0.35rem] bg-[#bdbdbd] dark:bg-[#8a8a8a] keymap-selected-blink pointer-events-none" />
      )}
    </div>
  );

  return (
    <div
      onClick={(evt) => {
        evt.stopPropagation();
        if (pressable) {
          onKeyClick(data.index);
        }
      }}
      title={lab?.tooltipLabel || undefined}
      className={[
        'absolute select-none',
        pressable ? 'cursor-pointer' : '',
        selected ? 'z-10' : '',
      ].join(' ')}
      style={{
        left: data.left,
        top: data.top,
        width: data.outerWidth,
        height: data.outerHeight,
        transform: `rotate(${data.rotation}deg)`,
      }}
    >
      {data.combo ? (
        <ComboFace
          combo={data.combo}
          isKeyDown={isKeyDown}
          isKeyUp={isKeyUp}
          selected={selected}
          renderFace={renderFace}
        />
      ) : (
        <div
          className={`w-full h-full transition-transform duration-100 ${keycapBgClass(isKeyDown, selected)}${
            selectable && !data.isEncoder && data.isMatrixKey ? ' hover:scale-[1.02]' : ''
          }`}
          style={{
            padding: '2px 6px 8px 6px',
            boxShadow:
              'inset -1px -1px 0 rgb(0 0 0 / 20%), inset 1px 1px 0 rgb(255 255 255 / 20%)',
          }}
        >
          {renderFace(true)}
          {(isKeyDown || isKeyUp) && (
            <div
              className={`absolute inset-0 rounded-[0.6rem] ${stateOverlayClass(isKeyDown, isKeyUp)} pointer-events-none`}
            />
          )}
        </div>
      )}
    </div>
  );
});

const ComboFace = memo(function ComboFace({
  combo,
  isKeyDown,
  isKeyUp,
  selected,
  renderFace,
}: {
  combo: ComboGeom;
  isKeyDown: boolean;
  isKeyUp: boolean;
  selected: boolean;
  renderFace: (primary: boolean, shiftLegend?: boolean, squareBottomRight?: boolean) => ReactNode;
}) {
  const overlayClass = stateOverlayClass(isKeyDown, isKeyUp);
  return (
    <div
      className="relative"
      style={{
        width: combo.boundingW,
        height: combo.boundingH,
        transform: `translateX(${combo.shiftX}px)${selected ? ' scale(0.96)' : ''}`,
        clipPath: combo.clipPath,
      }}
    >
      {[combo.r1, combo.r2].map((r, ri) => (
        <div
          key={ri}
          className="absolute"
          style={{
            left: r[0] * keyXPos,
            top: r[1] * keyYPos,
            width: r[2] * keyXPos - keyXSpacing,
            height: r[3] * keyYPos - keyYSpacing,
          }}
        >
          <div
            className={`relative w-full h-full ${
              selected ? 'scale-[0.96]' : isKeyDown ? 'scale-[0.95]' : ''
            } rounded-[0.6rem] bg-[#bdbdbd] dark:bg-[#3f3f3f]`}
            style={{
              padding: '2px 6px 8px 6px',
              boxShadow: 'inset -1px -1px 0 rgb(0 0 0 / 20%), inset 1px 1px 0 rgb(255 255 255 / 20%)',
            }}
          >
            {(isKeyDown || isKeyUp) && (
              <div className={`absolute inset-0 rounded-[0.6rem] ${overlayClass} pointer-events-none`} />
            )}
          </div>
        </div>
      ))}
      <div
        className="absolute"
        style={{
          left: combo.r2[0] * keyXPos,
          top: combo.r2[1] * keyYPos,
          width: combo.r2[2] * keyXPos - keyXSpacing,
          height: combo.r2[3] * keyYPos - keyYSpacing,
        }}
      >
        <div
          className={`w-full h-full ${
            selected ? 'scale-[0.96]' : isKeyDown ? 'scale-[0.95]' : ''
          }`}
          style={{ padding: '2px 6px 8px 6px' }}
        >
          {renderFace(false)}
        </div>
      </div>
      <div
        className="absolute"
        style={{
          left: combo.r1[0] * keyXPos,
          top: combo.r1[1] * keyYPos,
          width: combo.r1[2] * keyXPos - keyXSpacing,
          height: combo.r1[3] * keyYPos - keyYSpacing,
        }}
      >
        <div
          className={`w-full h-full ${
            selected ? 'scale-[0.96]' : isKeyDown ? 'scale-[0.95]' : ''
          }`}
          style={{ padding: '2px 6px 8px 6px' }}
        >
          {renderFace(true, true, true)}
        </div>
      </div>
    </div>
  );
});

type KeyboardViewProps = {
  keys: VIAKey[];
  cols: number;
  keymap: number[] | null;
  selectedKey: number | null;
  selectable: boolean;
  pressedKeys?: TestKeyState[] | Set<number>;
  definition: VIADefinitionV2 | VIADefinitionV3;
  basicKeyToByte: Record<string, number>;
  byteToKey: Record<number, string>;
  onKeyClick: (keyIndex: number) => void;
};

export const KeyboardView = ({
  keys,
  cols,
  keymap,
  selectedKey,
  selectable,
  pressedKeys,
  definition,
  basicKeyToByte,
  byteToKey,
  onKeyClick,
}: KeyboardViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const { layout, keyboardWidth, keyboardHeight } = useMemo(() => {
    const geoms = keys.map((k) => {
      if (k.d) return null;
      const [x, y] = calculatePointPosition(k);
      const outerWidth = k.w * keyWidth + (k.w - 1) * keyXSpacing;
      const outerHeight = k.h * keyHeight + (k.h - 1) * keyYSpacing;
      const left = x - outerWidth / 2;
      const top = y - outerHeight / 2;
      const combo = getComboKeyProps(k);
      let comboGeom: ComboGeom | null = null;
      if (combo.clipPath) {
        const [r1, r2] = combo.normalizedRects as [
          [number, number, number, number],
          [number, number, number, number],
        ];
        const shiftX = (-Math.abs(r1[0] - r2[0]) * keyXPos) / 2;
        const boundingW = Math.max(r1[2], r2[2]) * keyXPos - keyXSpacing;
        const boundingH = Math.max(r1[3], r2[3]) * keyYPos - keyYSpacing;
        comboGeom = { clipPath: combo.clipPath, shiftX, boundingW, boundingH, r1, r2 };
      }
      return { left, top, outerWidth, outerHeight, combo: comboGeom };
    });

    let leftEdge = Infinity;
    let topEdge = Infinity;
    let rightEdge = -Infinity;
    let bottomEdge = -Infinity;
    geoms.forEach((geom) => {
      if (!geom) return;
      leftEdge = Math.min(leftEdge, geom.left);
      topEdge = Math.min(topEdge, geom.top);
      rightEdge = Math.max(rightEdge, geom.left + geom.outerWidth);
      bottomEdge = Math.max(bottomEdge, geom.top + geom.outerHeight);
    });

    const layout: KeyData[] = [];
    keys.forEach((k, i) => {
      if (k.d) return;
      const geom = geoms[i];
      if (!geom) return;
      const isMatrixKey = k.row >= 0 && k.col >= 0;
      const matrixIndex = isMatrixKey ? k.row * cols + k.col : null;
      const keycode =
        keymap != null && matrixIndex != null ? keymap[matrixIndex] : undefined;
      const label =
        keymap != null && keycode != null
          ? getLabel(keycode, k.w, [], definition, basicKeyToByte, byteToKey)
          : null;
      layout.push({
        index: i,
        left: geom.left - leftEdge + 5,
        top: geom.top - topEdge + 5,
        outerWidth: geom.outerWidth,
        outerHeight: geom.outerHeight,
        rotation: k.r,
        matrixIndex,
        isEncoder: k.ei !== undefined,
        isMatrixKey,
        combo: geom.combo,
        label,
      });
    });

    return {
      layout,
      keyboardWidth: rightEdge - leftEdge,
      keyboardHeight: bottomEdge - topEdge,
    };
  }, [keys, cols, keymap, definition, basicKeyToByte, byteToKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setScale(
          Math.min(
            width / (keyboardWidth + 2 * casePadding + 80),
            height / (keyboardHeight + 2 * casePadding + 40),
            1,
          ),
        );
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [keyboardWidth, keyboardHeight]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
    >
      <div
        className="rounded-[0.8rem] bg-[#afb0ae] flex items-center justify-center"
        style={{
          padding: casePadding,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        <div
          style={{
            width: keyboardWidth + 10,
            height: keyboardHeight + 10,
            position: 'relative',
            background: 'linear-gradient(200deg,#1a1a1a 40%,#2c2c2c,#232323 80%)',
            borderRadius: 8,
            boxShadow:
              'inset -1px -1px 0 rgb(0 0 0 / 20%), inset 1px 1px 0 rgb(255 255 255 / 20%)',
          }}
        >
          {layout.map((data) => (
            <KeyFrame
              key={data.index}
              data={data}
              keyState={
                data.matrixIndex != null
                  ? getKeyState(pressedKeys, data.matrixIndex)
                  : TestKeyState.Initial
              }
              selectable={selectable}
              selected={selectedKey === data.index}
              onKeyClick={onKeyClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};