'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DeviceInfo } from '@/utils/via-config/hid';

type ConnectViewProps = {
  deviceInfo: DeviceInfo | null;
  isConnecting: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export const ConnectView = ({
  deviceInfo,
  isConnecting,
  error,
  onConnect,
  onDisconnect,
}: ConnectViewProps) => {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWebHidAvailable = typeof navigator !== 'undefined' && !!navigator.hid;

  if (mounted && !isWebHidAvailable) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
        <div className="text-[2.4rem] font-medium text-[#222] dark:text-[#d9d9d9]">
          {t('tysonkeeb.webhidUnavailable')}
        </div>
        <p className="text-[1.6rem] text-[#707070] dark:text-[#b9b9b9] max-w-[50rem]">
          {t('tysonkeeb.webhidUnavailableHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
      <div className="text-[2.4rem] font-medium text-[#222] dark:text-[#d9d9d9]">
        {t('tysonkeeb.connectTitle')}
      </div>
      <p className="text-[1.6rem] text-[#707070] dark:text-[#b9b9b9] max-w-[50rem]">
        {t('tysonkeeb.connectHint')}
      </p>

      {error && (
        <div className="py-3 px-4 rounded-[0.4rem] border border-red-400 text-red-500 dark:text-red-400 text-[1.4rem] max-w-[50rem]">
          {error}
        </div>
      )}

      {deviceInfo && (
        <div className="text-[1.4rem] text-[#707070] dark:text-[#b9b9b9]">
          {deviceInfo.device.productName} -{' '}
          {deviceInfo.device.vendorId.toString(16).padStart(4, '0')}:
          {deviceInfo.device.productId.toString(16).padStart(4, '0')}
        </div>
      )}

      <button
        onClick={isConnecting ? undefined : onConnect}
        disabled={isConnecting}
        className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-[1.3rem] tracking-wide rounded-[0.4rem] bg-[#121212] dark:bg-white text-white dark:text-[#121212] transition-opacity ${
          isConnecting ? 'opacity-50 cursor-wait' : 'hover:opacity-90'
        }`}
      >
        {isConnecting
          ? t('tysonkeeb.connecting')
          : deviceInfo
            ? t('tysonkeeb.connected')
            : t('tysonkeeb.connect')}
      </button>

      {deviceInfo && (
        <button
          onClick={onDisconnect}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[1.3rem] tracking-wide border border-[#121212] dark:border-white text-[#121212] dark:text-white hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-150"
        >
          {t('tysonkeeb.disconnect')}
        </button>
      )}
    </div>
  );
};
