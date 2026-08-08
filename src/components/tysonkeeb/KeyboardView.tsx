'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { VIADefinitionV2, VIADefinitionV3, VIAKey } from '@the-via/reader';
import {
  CSSVarObject,
  calculatePointPosition,
  getComboKeyProps,
  getLabel,
} from '@/utils/via-config/keyboard-rendering';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const ARROW_MAP: Record<string, ReactNode> = {
  '↑': <ArrowUp size={14} strokeWidth={2.5} className="inline-block align-middle" />,
  '↓': <ArrowDown size={14} strokeWidth={2.5} className="inline-block align-middle" />,
  '←': <ArrowLeft size={14} strokeWidth={2.5} className="inline-block align-middle" />,
  '→': <ArrowRight size={14} strokeWidth={2.5} className="inline-block align-middle" />,
};

const renderLabel = (text: string | undefined): ReactNode => {
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

const keyWidth = CSSVarObject.keyWidth;
const keyHeight = CSSVarObject.keyHeight;
const keyXSpacing = CSSVarObject.keyXSpacing;
const keyYSpacing = CSSVarObject.keyYSpacing;
const keyXPos = CSSVarObject.keyXPos;
const keyYPos = CSSVarObject.keyYPos;
const casePadding = 10;

type KeyGeom = {
  left: number;
  top: number;
  outerWidth: number;
  outerHeight: number;
  combo: {
    clipPath: string;
    shiftX: number;
    boundingW: number;
    boundingH: number;
    r1: [number, number, number, number];
    r2: [number, number, number, number];
  } | null;
  rects: { left: number; top: number; width: number; height: number }[];
};

type KeyboardViewProps = {
  keys: VIAKey[];
  cols: number;
  keymap: number[] | null;
  selectedKey: number | null;
  selectable: boolean;
  pressedKeys?: Set<number>;
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

  const { geoms, leftEdge, topEdge, keyboardWidth, keyboardHeight } = useMemo(() => {
    const geoms = keys.map((k): KeyGeom | null => {
      if (k.d) return null;
      const [x, y] = calculatePointPosition(k);
      const outerWidth = k.w * keyWidth + (k.w - 1) * keyXSpacing;
      const outerHeight = k.h * keyHeight + (k.h - 1) * keyYSpacing;
      const left = x - outerWidth / 2;
      const top = y - outerHeight / 2;
      const combo = getComboKeyProps(k);
      let rects: { left: number; top: number; width: number; height: number }[];
      let comboGeom: KeyGeom['combo'] = null;
      if (!combo.clipPath) {
        rects = [{ left, top, width: outerWidth, height: outerHeight }];
      } else {
        const [r1, r2] = combo.normalizedRects as [
          [number, number, number, number],
          [number, number, number, number],
        ];
        const shiftX = (-Math.abs(r1[0] - r2[0]) * keyXPos) / 2;
        const boundingW = Math.max(r1[2], r2[2]) * keyXPos - keyXSpacing;
        const boundingH = Math.max(r1[3], r2[3]) * keyYPos - keyYSpacing;
        rects = [r1, r2].map((r) => ({
          left: left + shiftX + r[0] * keyXPos,
          top: top + r[1] * keyYPos,
          width: r[2] * keyXPos - keyXSpacing,
          height: r[3] * keyYPos - keyYSpacing,
        }));
        comboGeom = {
          clipPath: combo.clipPath,
          shiftX,
          boundingW,
          boundingH,
          r1,
          r2,
        };
      }
      return { left, top, outerWidth, outerHeight, combo: comboGeom, rects };
    });
    let leftEdge = Infinity;
    let topEdge = Infinity;
    let rightEdge = -Infinity;
    let bottomEdge = -Infinity;
    geoms.forEach((geom) => {
      if (!geom) return;
      geom.rects.forEach((r) => {
        leftEdge = Math.min(leftEdge, r.left);
        topEdge = Math.min(topEdge, r.top);
        rightEdge = Math.max(rightEdge, r.left + r.width);
        bottomEdge = Math.max(bottomEdge, r.top + r.height);
      });
    });
    return {
      geoms,
      leftEdge,
      topEdge,
      keyboardWidth: rightEdge - leftEdge,
      keyboardHeight: bottomEdge - topEdge,
    };
  }, [keys]);

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
  }, [keys, keyboardWidth, keyboardHeight]);

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
        {keys.map((k, i) => {
          if (k.d) return null;
          const geom = geoms[i];
          if (!geom) return null;
          const left = geom.left - leftEdge + 5;
          const top = geom.top - topEdge + 5;
          const isSelected = selectedKey === i;
          const isEncoder = k.ei !== undefined;
          const isMatrixKey = k.row >= 0 && k.col >= 0;
          const keycode =
            keymap != null && isMatrixKey && k.row * cols + k.col >= 0
              ? keymap[k.row * cols + k.col]
              : undefined;
          const label =
            keymap != null && keycode != null
              ? getLabel(
                  keycode,
                  k.w,
                  [],
                  definition,
                  basicKeyToByte,
                  byteToKey,
                )
              : null;
          const keycapBgClass = `rounded-[0.6rem] ${
            isSelected ? 'scale-[0.96] bg-[#c9c9c9] dark:bg-[#4a4a4a]' : 'bg-[#bdbdbd] dark:bg-[#3f3f3f]'
          }`;
          const renderFace = (
            primary: boolean,
            shiftLegend = false,
            squareBottomRight = false,
          ) => (
            <div
              className={`w-full h-full rounded-[0.35rem] relative overflow-hidden ${
                isSelected
                  ? 'bg-[#ffffff] dark:bg-[#484848] text-[#363434] dark:text-[#d9d9d9]'
                  : 'bg-[#f0f0f0] dark:bg-[#363434] text-[#363434] dark:text-[#d9d9d9]'
              }`}
              style={squareBottomRight ? { borderBottomRightRadius: 0 } : undefined}
            >
              {primary &&
                (isEncoder ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[1.6rem]">
                    ↻
                  </div>
                ) : label?.topLabel != null && label?.bottomLabel != null ? (
                  <>
                    <div
                      className="absolute leading-none"
                      style={{
                        left: 4,
                        top: 4 + (label.offset?.[0] || 0) * 12,
                        fontSize: 16,
                      }}
                    >
                      {renderLabel(label.topLabel)}
                    </div>
                    <div
                      className="absolute leading-none"
                      style={{
                        left: 4,
                        bottom: 4 + (label.offset?.[1] || 0) * 12,
                        fontSize: 16,
                      }}
                    >
                      {renderLabel(label.bottomLabel)}
                    </div>
                  </>
                ) : label?.centerLabel != null ? (
                  <div
                    className="absolute inset-y-0 flex items-center font-bold"
                    style={{
                      left: 3,
                      fontSize: 13 * (label.size || 1),
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
                      {renderLabel(label.label)}
                    </span>
                  </div>
                ) : (
                  <div
                    className="absolute leading-none"
                    style={{ left: 4, top: 4, fontSize: 22 }}
                  >
                    {renderLabel(label?.label ?? '')}
                  </div>
                ))}
              {isSelected && (
                <div className="absolute inset-0 rounded-[0.35rem] bg-[#bdbdbd] dark:bg-[#8a8a8a] keymap-selected-blink pointer-events-none" />
              )}
            </div>
          );
          return (
            <div
              key={i}
              onClick={(evt) => {
                evt.stopPropagation();
                if (selectable && !isEncoder && isMatrixKey) {
                  onKeyClick(i);
                }
              }}
              title={label?.tooltipLabel || undefined}
              className={`
                absolute select-none
                ${pressedKeys && isMatrixKey && pressedKeys.has(k.row * cols + k.col) ? 'ring-[0.3rem] ring-red-500/80' : ''}
                ${selectable && !isEncoder && isMatrixKey ? 'cursor-pointer' : ''}
                ${isSelected ? 'z-10' : ''}
              `}
              style={{
                left,
                top,
                width: geom.outerWidth,
                height: geom.outerHeight,
                transform: `rotate(${k.r}deg)`,
              }}
            >
              {geom.combo ? (
                <div
                  className="relative"
                  style={{
                    width: geom.combo.boundingW,
                    height: geom.combo.boundingH,
                    transform: `translateX(${geom.combo.shiftX}px)${
                      isSelected ? ' scale(0.96)' : ''
                    }`,
                    clipPath: geom.combo.clipPath,
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      left: geom.combo.r2[0] * keyXPos,
                      top: geom.combo.r2[1] * keyYPos,
                      width: geom.combo.r2[2] * keyXPos - keyXSpacing,
                      height: geom.combo.r2[3] * keyYPos - keyYSpacing,
                    }}
                  >
                    <div
                      className={`w-full h-full ${keycapBgClass}`}
                      style={{
                        padding: '2px 6px 8px 6px',
                        boxShadow:
                          'inset -1px -1px 0 rgb(0 0 0 / 20%), inset 1px 1px 0 rgb(255 255 255 / 20%)',
                      }}
                    />
                  </div>
                  <div
                    className="absolute"
                    style={{
                      left: geom.combo.r1[0] * keyXPos,
                      top: geom.combo.r1[1] * keyYPos,
                      width: geom.combo.r1[2] * keyXPos - keyXSpacing,
                      height: geom.combo.r1[3] * keyYPos - keyYSpacing,
                    }}
                  >
                    <div
                      className={`w-full h-full ${keycapBgClass}`}
                      style={{
                        padding: '2px 6px 8px 6px',
                        boxShadow:
                          'inset -1px -1px 0 rgb(0 0 0 / 20%), inset 1px 1px 0 rgb(255 255 255 / 20%)',
                      }}
                    />
                  </div>
                  <div
                    className="absolute"
                    style={{
                      left: geom.combo.r2[0] * keyXPos,
                      top: geom.combo.r2[1] * keyYPos,
                      width: geom.combo.r2[2] * keyXPos - keyXSpacing,
                      height: geom.combo.r2[3] * keyYPos - keyYSpacing,
                    }}
                  >
                    <div
                      className={`w-full h-full ${isSelected ? 'scale-[0.96]' : ''}`}
                      style={{ padding: '2px 6px 8px 6px' }}
                    >
                      {renderFace(false)}
                    </div>
                  </div>
                  <div
                    className="absolute"
                    style={{
                      left: geom.combo.r1[0] * keyXPos,
                      top: geom.combo.r1[1] * keyYPos,
                      width: geom.combo.r1[2] * keyXPos - keyXSpacing,
                      height: geom.combo.r1[3] * keyYPos - keyYSpacing,
                    }}
                  >
                    <div
                      className={`w-full h-full ${isSelected ? 'scale-[0.96]' : ''}`}
                      style={{ padding: '2px 6px 8px 6px' }}
                    >
                      {renderFace(true, true, true)}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`w-full h-full transition-transform duration-100 ${keycapBgClass} ${
                    selectable && !isEncoder && isMatrixKey ? 'hover:scale-[1.02]' : ''
                  }`}
                  style={{
                    padding: '2px 6px 8px 6px',
                    boxShadow:
                      'inset -1px -1px 0 rgb(0 0 0 / 20%), inset 1px 1px 0 rgb(255 255 255 / 20%)',
                  }}
                >
                  {renderFace(true)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
