'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTysonKeebDevice } from '@/components/tysonkeeb/useTysonKeebDevice';
import { ConnectView } from '@/components/tysonkeeb/ConnectView';
import { ConfigView } from '@/components/tysonkeeb/ConfigView';
import { KeyTesterView } from '@/components/tysonkeeb/KeyTesterView';

type Tab = 'connect' | 'config' | 'keytester';

export const TysonKeebTool = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('connect');
  const {
    deviceInfo,
    definition,
    isConnecting,
    error,
    connect,
    disconnect,
    keymapStore,
    lightingData,
    customColors,
    perKeyRGB,
    updateBacklightValue,
    updateCustomColor,
    updateMenuValue,
    updatePerKeyRGB,
    layoutOptions,
    updateLayoutOption,
    keys,
    cols,
    basicKeyToByte,
    byteToKey,
  } = useTysonKeebDevice();

  const connected = !!deviceInfo && !!definition;
  const activeTab: Tab = connected
    ? tab === 'keytester'
      ? 'keytester'
      : 'config'
    : 'connect';

  const tabs: { id: Tab; label: string }[] = [
    ...(connected
      ? [{ id: 'config' as Tab, label: t('tysonkeeb.config') }]
      : []),
    { id: 'keytester', label: t('tysonkeeb.keyTester') },
  ];

  return (
    <div className="min-h-[60rem] flex flex-col bg-white dark:bg-[#222]">
      <div className="flex-1 min-h-0 flex flex-col">
        {connected && activeTab !== 'connect' && (
          <div className="shrink-0 flex items-center justify-between border-b border-[#796c6c] dark:border-[#414141]">
            <div className="flex gap-1 pt-2">
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-6 py-3 text-[1.6rem] uppercase tracking-wide transition-colors duration-150 ${
                    activeTab === id
                      ? 'bg-[#e0e0e0] text-[#363434] dark:bg-[#414141] dark:text-[#d9d9d9]'
                      : 'text-[#222] dark:text-[#d9d9d9] hover:bg-[#e0e0e0] dark:hover:bg-[#333]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'connect' && (
          <ConnectView
            deviceInfo={deviceInfo}
            isConnecting={isConnecting}
            error={error}
            onConnect={() => void connect()}
            onDisconnect={() => void disconnect()}
          />
        )}
        {activeTab === 'config' && connected && (
          <ConfigView
            definition={definition}
            keymapStore={keymapStore}
            lightingData={lightingData}
            customColors={customColors}
            perKeyRGB={perKeyRGB}
            keys={keys}
            cols={cols}
            layoutOptions={layoutOptions}
            updateLayoutOption={updateLayoutOption}
            basicKeyToByte={basicKeyToByte}
            byteToKey={byteToKey}
            updateBacklightValue={updateBacklightValue}
            updateCustomColor={updateCustomColor}
            updateMenuValue={updateMenuValue}
            updatePerKeyRGB={updatePerKeyRGB}
            deviceName={deviceInfo ? deviceInfo.productName : ''}
            onDisconnect={() => void disconnect()}
          />
        )}
        {activeTab === 'keytester' && connected && (
          <KeyTesterView
            deviceInfo={deviceInfo}
            definition={definition}
            keys={keys}
            keymap={keymapStore.layers?.[keymapStore.selectedLayer] ?? null}
            basicKeyToByte={basicKeyToByte}
            byteToKey={byteToKey}
          />
        )}
        {deviceInfo && !definition && !isConnecting && !error && (
          <div className="flex-1 flex items-center justify-center text-[1.6rem] text-[#707070] dark:text-[#b9b9b9]">
            {t('tysonkeeb.definitionNotFound')}
          </div>
        )}
      </div>
    </div>
  );
};
