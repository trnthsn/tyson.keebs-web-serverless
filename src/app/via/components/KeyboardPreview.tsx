'use client';

import type { VisibleKey } from '@/utils/via-config/layout';
import { getKeyboardBounds, getKeyRenderData } from '@/utils/via-config/layout';
import { getKeycodeLegend } from '@/utils/via-config/keycodes';

type KeyboardPreviewProps = {
  keys: VisibleKey[];
  layer: number[];
  selectedKeyIndex: number | null;
  onSelectKey: (index: number) => void;
};

export const KeyboardPreview = ({
  keys,
  layer,
  selectedKeyIndex,
  onSelectKey,
}: KeyboardPreviewProps) => {
  if (!keys.length) {
    return null;
  }

  const bounds = getKeyboardBounds(keys);

  return (
    <div className="w-full overflow-auto rounded-sm border border-[rgba(18,18,18,0.12)] bg-[#f1f1f1] p-4 dark:border-[rgba(255,255,255,0.12)] dark:bg-[#242424]">
      <svg
        viewBox={bounds.viewBox}
        className="w-full min-w-[64rem]"
        role="img"
        aria-label="Keyboard layout"
      >
        {keys.map((key) => {
          const { path, textBox, transform } = getKeyRenderData(key);
          const keycode = layer[key.matrixIndex] ?? 0;
          const legend = getKeycodeLegend(keycode);
          const isSelected = selectedKeyIndex === key.displayIndex;

          return (
            <g key={`${key.displayIndex}-${key.row}-${key.col}`}>
              <path
                d={path ?? ''}
                transform={transform}
                onClick={() => onSelectKey(key.displayIndex)}
                className={`cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? 'fill-[#c9c9c9] stroke-[#121212] dark:fill-[#777] dark:stroke-white'
                    : 'fill-[#dedede] stroke-[rgba(18,18,18,0.12)] dark:fill-[#555] dark:stroke-[rgba(255,255,255,0.12)]'
                }`}
                strokeWidth={2}
              />
              {legend ? (
                <text
                  transform={transform}
                  pointerEvents="none"
                  className="fill-[#121212] dark:fill-white"
                  fontFamily="Jost, sans-serif"
                  fontSize={legend.topLabel ? 16 : legend.label && legend.label.length > 7 ? 16 : 18}
                  fontWeight="600"
                  style={{ userSelect: 'none' }}
                >
                  {legend.topLabel && legend.bottomLabel ? (
                    <>
                      <tspan x={textBox.x + 8} y={textBox.y + 21} textAnchor="start">
                        {legend.topLabel}
                      </tspan>
                      <tspan x={textBox.x + 8} y={textBox.y + textBox.height - 9} textAnchor="start">
                        {legend.bottomLabel}
                      </tspan>
                    </>
                  ) : (
                    <tspan
                      x={textBox.x + textBox.width / 2}
                      y={textBox.y + textBox.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {legend.centerLabel}
                    </tspan>
                  )}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
