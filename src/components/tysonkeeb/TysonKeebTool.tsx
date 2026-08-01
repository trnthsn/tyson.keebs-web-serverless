'use client';

import { useEffect, useState } from 'react';
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
    updateBacklightValue,
    updateCustomColor,
    layoutOptions,
    updateLayoutOption,
    keys,
    cols,
    basicKeyToByte,
    byteToKey,
  } = useTysonKeebDevice();

  const connected = !!deviceInfo && !!definition;

  useEffect(() => {
    if (connected && tab === 'connect') {
      setTab('config');
    }
    if (!connected && tab !== 'connect') {
      setTab('connect');
    }
  }, [connected, tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'connect', label: t('tysonkeeb.connect') },
    ...(connected
      ? [
          { id: 'config' as Tab, label: t('tysonkeeb.config') },
          { id: 'keytester' as Tab, label: t('tysonkeeb.keyTester') },
        ]
      : []),
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#222]">
      <div className="h-[6rem] shrink-0 flex items-center px-6 border-b border-[#796c6c] dark:border-[#414141]">
        <div className="text-[2.4rem] font-medium text-[#222] dark:text-[#d9d9d9] mr-8">
          {t('tysonkeeb.title')}
        </div>
        <div className="flex gap-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-[1.6rem] uppercase tracking-wide transition-colors duration-150 ${
                tab === id
                  ? 'bg-[#E8C4B8] text-[#363434]'
                  : 'text-[#222] dark:text-[#d9d9d9] hover:bg-[#ebe4e4] dark:hover:bg-[#333]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'connect' && (
          <ConnectView
            deviceInfo={deviceInfo}
            isConnecting={isConnecting}
            error={error}
            onConnect={() => void connect()}
            onDisconnect={() => void disconnect()}
          />
        )}
        {tab === 'config' && connected && (
          <ConfigView
            definition={definition}
            keymapStore={keymapStore}
            lightingData={lightingData}
            keys={keys}
            cols={cols}
            layoutOptions={layoutOptions}
            updateLayoutOption={updateLayoutOption}
            basicKeyToByte={basicKeyToByte}
            byteToKey={byteToKey}
            updateBacklightValue={updateBacklightValue}
            updateCustomColor={updateCustomColor}
            onDisconnect={() => void disconnect()}
          />
        )}
        {tab === 'keytester' && connected && (
          <KeyTesterView
            deviceInfo={deviceInfo}
            definition={definition}
            keys={keys}
            basicKeyToByte={basicKeyToByte}
            byteToKey={byteToKey}
          />
        )}
        {deviceInfo && !definition && !isConnecting && !error && (
          <div className="h-full flex items-center justify-center text-[1.6rem] text-[#707070] dark:text-[#b9b9b9]">
            {t('tysonkeeb.definitionNotFound')}
          </div>
        )}
      </div>
    </div>
  );
};
