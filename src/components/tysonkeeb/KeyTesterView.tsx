'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VIAKey } from '@the-via/reader';
import type { ParsedDefinition } from '@/utils/via-config/definitions';
import { getMatrixState, type DeviceInfo } from '@/utils/via-config/hid';
import { TestKeyState } from '@/utils/via-config/test-key-state';
import { KeyboardView } from '@/components/tysonkeeb/KeyboardView';

type KeyTesterViewProps = {
  deviceInfo: DeviceInfo;
  definition: ParsedDefinition;
  keys: VIAKey[];
  keymap: number[] | null;
  basicKeyToByte: Record<string, number>;
  byteToKey: Record<number, string>;
};

const blockedKeys = new Set(['Space', ' ', 'Tab', 'PageUp', 'PageDown', 'Home', 'End']);

export const KeyTesterView = ({
  deviceInfo,
  definition,
  keys,
  keymap,
  basicKeyToByte,
  byteToKey,
}: KeyTesterViewProps) => {
  const { t } = useTranslation();
  const [keyStates, setKeyStates] = useState<TestKeyState[]>([]);
  const statesRef = useRef<TestKeyState[]>([]);

  const { rows, cols } = definition.definition.matrix;
  const bytesPerRow = Math.ceil(cols / 8);
  const keyCount = rows * cols;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (blockedKeys.has(event.code) || blockedKeys.has(event.key)) {
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let prevBytes: number[] = [];
    const states: TestKeyState[] = Array(keyCount).fill(TestKeyState.Initial);
    statesRef.current = states;

    const poll = async () => {
      try {
        const state = await getMatrixState(deviceInfo, { rows, cols });
        if (cancelled) return;

        let changed = false;

        for (let byteIdx = 0; byteIdx < state.length; byteIdx++) {
          const xor = state[byteIdx] ^ (prevBytes[byteIdx] ?? 0);
          if (xor === 0) continue;
          const row = Math.floor(byteIdx / bytesPerRow);
          const colOffset = 8 * (bytesPerRow - 1 - (byteIdx % bytesPerRow));
          for (let idx = 0; idx < Math.min(8, cols - colOffset); idx++) {
            if (((xor >> idx) & 1) === 1) {
              const matrixIdx = row * cols + idx + colOffset;
              states[matrixIdx] =
                states[matrixIdx] === TestKeyState.KeyDown
                  ? TestKeyState.KeyUp
                  : TestKeyState.KeyDown;
              changed = true;
            }
          }
        }
        prevBytes = Array.from(state);

        if (changed) {
          setKeyStates([...states]);
        }
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
  }, [deviceInfo, rows, cols, bytesPerRow, keyCount]);

  const resetTestKeys = useCallback(() => {
    const states = statesRef.current;
    states.fill(TestKeyState.Initial);
    setKeyStates([...states]);
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="relative h-[50rem] shrink-0">
        <div className="w-full h-full">
          <KeyboardView
            keys={keys}
            cols={cols}
            keymap={keymap}
            selectedKey={null}
            selectable={false}
            pressedKeys={keyStates}
            definition={definition.definition}
            basicKeyToByte={basicKeyToByte}
            byteToKey={byteToKey}
            onKeyClick={() => {}}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 py-4 px-6 border-t border-[#796c6c] dark:border-[#414141]">
        <div className="text-[1.6rem] text-[#222] dark:text-[#d9d9d9]">
          {t('tysonkeeb.resetKeyboard')}
        </div>
        <button
          onClick={resetTestKeys}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[1.3rem] tracking-wide border border-[#121212] dark:border-white text-[#121212] dark:text-white hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-150"
        >
          {t('tysonkeeb.reset')}
        </button>
      </div>
    </div>
  );
};