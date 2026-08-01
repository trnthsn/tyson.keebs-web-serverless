'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { VIADefinitionV2, VIADefinitionV3, VIAKey } from '@the-via/reader';
import {
  CSSVarObject,
  calculatePointPosition,
  getLabel,
} from '@/utils/via-config/keyboard-rendering';

const keyWidth = CSSVarObject.keyWidth;
const keyHeight = CSSVarObject.keyHeight;
const keyXSpacing = CSSVarObject.keyXSpacing;
const keyYSpacing = CSSVarObject.keyYSpacing;
const casePadding = 36;

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

  const { positions, bounds } = useMemo(() => {
    const positions = keys.map(calculatePointPosition);
    const xs = positions.map(([x]) => x);
    const ys = positions.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      positions,
      bounds: { minX, minY, maxX, maxY },
    };
  }, [keys]);

  const keyboardWidth = bounds.maxX - bounds.minX;
  const keyboardHeight = bounds.maxY - bounds.minY;

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
        className="rounded-[1.4rem] bg-[linear-gradient(200deg,#8f8f8f_40%,#737373,#636363_80%)] dark:bg-[linear-gradient(200deg,#3a3a3a_40%,#2f2f2f,#282828_80%)]"
        style={{
          padding: casePadding,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          boxShadow:
            '0 0 0 1px rgba(0,0,0,0.4), 0 0.8rem 2rem rgba(0,0,0,0.35), inset -2px -2px 0 rgba(0,0,0,0.2), inset 2px 2px 0 rgba(255,255,255,0.2)',
        }}
      >
        <div
          style={{
            width: keyboardWidth,
            height: keyboardHeight,
            position: 'relative',
          }}
        >
        {keys.map((k, i) => {
          if (k.d) return null;
          const [x, y] = positions[i];
          const left = x - (k.w2 || k.w) * (keyWidth / 2) - (k.w2 || k.w - 1) * (keyXSpacing / 2) - bounds.minX;
          const top = y - k.h * (keyHeight / 2) - (k.h - 1) * (keyYSpacing / 2) - bounds.minY;
          const width = (k.w2 || k.w) * keyWidth + ((k.w2 || k.w) - 1) * keyXSpacing;
          const height = k.h * keyHeight + (k.h - 1) * keyYSpacing;
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
                width,
                height,
                transform: `rotate(${k.r}deg)`,
              }}
            >
              <div
                className={`w-full h-full rounded-[0.6rem] transition-transform duration-100 ${
                  isSelected
                    ? 'scale-[0.96] bg-[#c9c9c9] dark:bg-[#4a4a4a]'
                    : 'bg-[#bdbdbd] dark:bg-[#3f3f3f]'
                } ${selectable && !isEncoder && isMatrixKey ? 'hover:scale-[1.02]' : ''}`}
                style={{
                  padding: '2px 6px 8px 6px',
                  boxShadow:
                    'inset -2px -2px 0 rgba(0,0,0,0.2), inset 2px 2px 0 rgba(255,255,255,0.25)',
                }}
              >
                <div
                  className={`w-full h-full rounded-[0.35rem] relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#ffffff] dark:bg-[#484848] text-[#363434] dark:text-[#d9d9d9]'
                      : 'bg-[#f0f0f0] dark:bg-[#363434] text-[#363434] dark:text-[#d9d9d9]'
                  }`}
                  style={{
                    boxShadow:
                      'inset -1px -1px 0 rgba(0,0,0,0.15), inset 1px 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  {isEncoder ? (
                    <div className="absolute inset-0 flex items-center justify-center text-[1.6rem]">
                      ↻
                    </div>
                  ) : label?.topLabel != null && label?.bottomLabel != null ? (
                    <>
                      <div
                        className="absolute left-[0.8rem] top-[0.6rem] text-[1.1rem] leading-none"
                        style={{ transform: `translateY(${(label.offset?.[0] || 0) * 1.1}rem)` }}
                      >
                        {label.topLabel}
                      </div>
                      <div
                        className="absolute left-[0.8rem] bottom-[0.6rem] text-[1.1rem] leading-none"
                        style={{ transform: `translateY(${-(label.offset?.[1] || 0) * 1.1}rem)` }}
                      >
                        {label.bottomLabel}
                      </div>
                    </>
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-center font-medium leading-tight"
                      style={{
                        fontSize: `${1.4 * (label?.size || 1)}rem`,
                        padding: '0 0.4rem',
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
                        {label?.label ?? ''}
                      </span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 rounded-[0.35rem] bg-[#bdbdbd] dark:bg-[#8a8a8a] keymap-selected-blink pointer-events-none" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
