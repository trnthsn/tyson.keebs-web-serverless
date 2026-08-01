'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VIAKey } from '@the-via/reader';
import type { ParsedDefinition } from '@/utils/via-config/definitions';
import { getMatrixState, type DeviceInfo } from '@/utils/via-config/hid';
import { KeyboardView } from '@/components/tysonkeeb/KeyboardView';

type KeyTesterViewProps = {
  deviceInfo: DeviceInfo;
  definition: ParsedDefinition;
  keys: VIAKey[];
  basicKeyToByte: Record<string, number>;
  byteToKey: Record<number, string>;
};

export const KeyTesterView = ({
  deviceInfo,
  definition,
  keys,
  basicKeyToByte,
  byteToKey,
}: KeyTesterViewProps) => {
  const { t } = useTranslation();
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());

  const { rows, cols } = definition.definition.matrix;
  const bytesPerRow = Math.ceil(cols / 8);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const state = await getMatrixState(deviceInfo, { rows, cols });
        if (cancelled) return;
        const pressed = new Set<number>();
        for (let i = 0; i < rows * cols; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const byteIndex = row * bytesPerRow + Math.floor(col / 8);
          const bit = 7 - (col % 8);
          if (state[byteIndex] !== undefined && (state[byteIndex] >> bit) & 1) {
            pressed.add(i);
          }
        }
        setPressedKeys(pressed);
      } catch {
        return;
      }
      timer = setTimeout(poll, 30);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [deviceInfo, rows, cols, bytesPerRow]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 text-[1.6rem] text-[#222] dark:text-[#d9d9d9] border-b border-[#796c6c] dark:border-[#414141]">
        {t('tysonkeeb.keyTester')} -{' '}
        <span className="text-red-500">{pressedKeys.size}</span>{' '}
        {t('tysonkeeb.keysPressed')}
      </div>
      <div className="flex-1 min-h-0">
        <KeyboardView
          keys={keys}
          cols={cols}
          keymap={null}
          selectedKey={null}
          selectable={false}
          pressedKeys={pressedKeys}
          definition={definition.definition}
          basicKeyToByte={basicKeyToByte}
          byteToKey={byteToKey}
          onKeyClick={() => {}}
        />
      </div>
    </div>
  );
};
