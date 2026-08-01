'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VIAKey } from '@the-via/reader';
import type { ParsedDefinition } from '@/utils/via-config/definitions';
import type { KeymapStore, LightingData } from '@/components/tysonkeeb/useTysonKeebDevice';
import { KeyboardView } from '@/components/tysonkeeb/KeyboardView';
import { LayerControl } from '@/components/tysonkeeb/LayerControl';
import { KeycodePicker } from '@/components/tysonkeeb/KeycodePicker';
import { LightingPane } from '@/components/tysonkeeb/LightingPane';
import { SaveLoadView } from '@/components/tysonkeeb/SaveLoadView';
import { LayoutOptionsPane } from '@/components/tysonkeeb/LayoutOptionsPane';

type ConfigViewProps = {
  definition: ParsedDefinition;
  keymapStore: KeymapStore;
  lightingData: LightingData | null;
  keys: VIAKey[];
  cols: number;
  layoutOptions: number[] | null;
  updateLayoutOption: (index: number, val: number) => Promise<void>;
  basicKeyToByte: Record<string, number>;
  byteToKey: Record<number, string>;
  updateBacklightValue: (command: number, ...rest: number[]) => Promise<void>;
  updateCustomColor: (idx: number, hue: number, sat: number) => Promise<void>;
  onDisconnect: () => void;
};

type Tab = 'keymap' | 'layouts' | 'lighting' | 'save';

export const ConfigView = ({
  definition,
  keymapStore,
  lightingData,
  keys,
  cols,
  layoutOptions,
  updateLayoutOption,
  basicKeyToByte,
  byteToKey,
  updateBacklightValue,
  updateCustomColor,
  onDisconnect,
}: ConfigViewProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('keymap');

  const { layers, layerCount, selectedLayer, selectedKey, isSelectable, loadProgress } = keymapStore;

  const displayKeymap = useMemo(() => {
    if (!layers || layers.length === 0) return null;
    return layers[Math.min(selectedLayer, layers.length - 1)] ?? null;
  }, [layers, selectedLayer]);

  const usedKeycodes = useMemo(() => {
    const set = new Set<number>();
    (layers || []).forEach((layer) => layer.forEach((byte) => set.add(byte)));
    return set;
  }, [layers]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'keymap', label: t('tysonkeeb.keymap') },
    ...(definition.definition.layouts.labels?.length
      ? [{ id: 'layouts' as Tab, label: t('tysonkeeb.layouts') }]
      : []),
    { id: 'lighting', label: t('tysonkeeb.lighting') },
    { id: 'save', label: t('tysonkeeb.saveLoad') },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="relative h-[50rem] shrink-0 border-b border-[#796c6c] dark:border-[#414141]">
        <div className="absolute top-0 left-0 z-10 p-4">
          <LayerControl
            layerCount={layerCount}
            selectedLayer={selectedLayer}
            onSelectLayer={keymapStore.setSelectedLayer}
          />
        </div>
        <div className="absolute top-0 right-0 z-10 p-4">
          <button
            onClick={onDisconnect}
            className="px-4 py-2 text-[1.6rem] uppercase text-[#222] dark:text-[#d9d9d9] hover:bg-[#ebe4e4] dark:hover:bg-[#333] transition-colors duration-150"
          >
            {t('tysonkeeb.disconnect')}
          </button>
        </div>
        <KeyboardView
          keys={keys}
          cols={cols}
          keymap={displayKeymap}
          selectedKey={selectedKey}
          selectable={isSelectable}
          definition={definition.definition}
          basicKeyToByte={basicKeyToByte}
          byteToKey={byteToKey}
          onKeyClick={(i) => keymapStore.setSelectedKey(i)}
        />
        {loadProgress < 1 && (
          <div className="absolute inset-0 z-20 bg-white/70 dark:bg-black/70 flex flex-col items-center justify-center gap-4">
            <div className="w-[4rem] h-[4rem] border-4 border-[#E8C4B8] border-t-transparent rounded-full animate-spin" />
            <div className="text-[1.6rem] text-[#222] dark:text-[#d9d9d9] tabular-nums">
              {t('tysonkeeb.loadingKeymap')}{' '}
              {Math.round(loadProgress * 100)}%
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-[18rem] shrink-0 flex flex-col gap-1 p-4 bg-white dark:bg-[#282626] overflow-y-auto">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-3 text-[1.6rem] uppercase text-left rounded-[0.4rem] transition-colors duration-150 ${
                tab === id
                  ? 'bg-[#E8C4B8] text-[#363434]'
                  : 'text-[#222] dark:text-[#d9d9d9] hover:bg-[#ebe4e4] dark:hover:bg-[#333]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 border-l border-[#796c6c] dark:border-[#414141] overflow-y-auto">
          {tab === 'keymap' && (
            <KeycodePicker
              definition={definition.definition}
              selectedKey={selectedKey}
              keymap={displayKeymap}
              usedKeycodes={usedKeycodes}
              basicKeyToByte={basicKeyToByte}
              byteToKey={byteToKey}
              onUpdateKey={keymapStore.updateKey}
            />
          )}
          {tab === 'layouts' && (
            <LayoutOptionsPane
              definition={definition.definition}
              layoutOptions={layoutOptions}
              updateLayoutOption={updateLayoutOption}
            />
          )}
          {tab === 'lighting' && (
            <LightingPane
              definition={definition}
              lightingData={lightingData}
              updateBacklightValue={updateBacklightValue}
              updateCustomColor={updateCustomColor}
            />
          )}
          {tab === 'save' && (
            <SaveLoadView
              definition={definition}
              layers={layers}
              basicKeyToByte={basicKeyToByte}
              byteToKey={byteToKey}
              onSave={keymapStore.saveKeymap}
            />
          )}
        </div>
      </div>
    </div>
  );
};
