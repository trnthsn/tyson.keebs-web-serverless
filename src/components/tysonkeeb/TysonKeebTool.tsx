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

  useEffect(() => {
    if (connected && tab === 'connect') {
      setTab('config');
    } else if (!connected && tab === 'config') {
      setTab('connect');
    }
  }, [connected, tab]);

  const tabs: { id: Tab; label: string }[] = [
    ...(connected
      ? [{ id: 'config' as Tab, label: t('tysonkeeb.config') }]
      : []),
    // { id: 'keytester', label: t('tysonkeeb.keyTester') },
  ];

  return (
    <div className="min-h-[60rem] flex flex-col bg-white dark:bg-[#222]">
      <div className="flex-1 min-h-0 flex flex-col">
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
        {tab === 'keytester' && connected && (
          <KeyTesterView
            deviceInfo={deviceInfo}
            definition={definition}
            keys={keys}
            basicKeyToByte={basicKeyToByte}
            byteToKey={byteToKey}
          />
        )}
        {tab === 'keytester' && !connected && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
            <div className="text-[2.4rem] font-medium text-[#222] dark:text-[#d9d9d9]">
              {t('tysonkeeb.connectTitle')}
            </div>
            <p className="text-[1.6rem] text-[#707070] dark:text-[#b9b9b9] max-w-[50rem]">
              {t('tysonkeeb.connectHint')}
            </p>
            <button
              onClick={isConnecting ? undefined : () => void connect()}
              disabled={isConnecting}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-[1.3rem] tracking-wide bg-[#121212] dark:bg-white text-white dark:text-[#121212] transition-opacity ${
                isConnecting ? 'opacity-50 cursor-wait' : 'hover:opacity-90'
              }`}
            >
              {isConnecting ? t('tysonkeeb.connecting') : t('tysonkeeb.connect')}
            </button>
          </div>
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
