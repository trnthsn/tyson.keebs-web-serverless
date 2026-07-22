'use client';

import { useMemo, useState } from 'react';
import { COMMON_KEYCODES, formatKeycode, getKeycodeLabel, parseKeycodeInput, searchKeycodes } from '@/utils/via-config/keycodes';

type KeycodePickerProps = {
  currentCode: number | null;
  disabled?: boolean;
  onApply: (value: number) => Promise<void> | void;
};

export const KeycodePicker = ({ currentCode, disabled, onApply }: KeycodePickerProps) => {
  const [query, setQuery] = useState('');
  const [manualValue, setManualValue] = useState('');
  const filtered = useMemo(() => searchKeycodes(query).slice(0, 24), [query]);
  const common = COMMON_KEYCODES.slice(0, 18);
  const parsedManual = parseKeycodeInput(manualValue);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-[1.3rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">
          Current keycode
        </p>
        <p className="text-[1.8rem] text-[#121212] dark:text-white" style={{ fontFamily: "'Jost', sans-serif" }}>
          {currentCode === null ? 'No key selected' : `${getKeycodeLabel(currentCode)} (${formatKeycode(currentCode)})`}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-[1.3rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">
          Search common keycodes
        </label>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type Enter, Esc, A, Space, 0x0028..."
          className="w-full border border-[rgba(18,18,18,0.15)] dark:border-[rgba(255,255,255,0.15)] bg-transparent px-4 py-3 text-[1.4rem] text-[#121212] dark:text-white outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(query ? filtered : common).map((option) => (
          <button
            key={option.code}
            disabled={disabled}
            onClick={() => void onApply(option.code)}
            className="min-h-[4.4rem] border border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.12)] px-3 py-2 text-left text-[1.25rem] text-[#121212] dark:text-white hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors disabled:opacity-50"
          >
            <div>{option.label}</div>
            <div className="text-[1.05rem] opacity-70">{formatKeycode(option.code)}</div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-[1.3rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">
          Enter raw keycode
        </label>
        <div className="flex gap-2">
          <input
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            placeholder="0x5001 or 20481"
            className="min-w-0 flex-1 border border-[rgba(18,18,18,0.15)] dark:border-[rgba(255,255,255,0.15)] bg-transparent px-4 py-3 text-[1.4rem] text-[#121212] dark:text-white outline-none"
          />
          <button
            disabled={disabled || parsedManual === null}
            onClick={() => {
              if (parsedManual !== null) {
                void onApply(parsedManual);
              }
            }}
            className="border border-[#121212] dark:border-white px-5 py-3 text-[1.3rem] text-[#121212] dark:text-white transition-colors hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
