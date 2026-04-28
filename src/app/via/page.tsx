'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import type { VIADefinitionV2, VIADefinitionV3 } from '@the-via/reader';
import { requestDevice, disconnectDevice, onDeviceDisconnect } from '@/utils/via-config/hid';
import type { DeviceInfo } from '@/utils/via-config/hid';
import { fetchDefinition } from '@/utils/via-config/definitions';

type DefinitionData =
  | { version: 'v2'; definition: VIADefinitionV2 }
  | { version: 'v3'; definition: VIADefinitionV3 };

type ViaState = {
  deviceInfo: DeviceInfo | null;
  definition: DefinitionData | null;
  isConnecting: boolean;
  error: string | null;
};

type ViaAction =
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_SUCCESS'; deviceInfo: DeviceInfo }
  | { type: 'DEFINITION_LOADED'; definition: DefinitionData }
  | { type: 'CONNECT_ERROR'; error: string }
  | { type: 'DISCONNECT' };

const initialState: ViaState = {
  deviceInfo: null,
  definition: null,
  isConnecting: false,
  error: null,
};

const viaReducer = (state: ViaState, action: ViaAction): ViaState => {
  switch (action.type) {
    case 'CONNECT_START':
      return { ...state, isConnecting: true, error: null };
    case 'CONNECT_SUCCESS':
      return { ...state, deviceInfo: action.deviceInfo, isConnecting: false, error: null };
    case 'DEFINITION_LOADED':
      return { ...state, definition: action.definition };
    case 'CONNECT_ERROR':
      return { ...state, isConnecting: false, error: action.error };
    case 'DISCONNECT':
      return { deviceInfo: null, definition: null, isConnecting: false, error: null };
    default:
      return state;
  }
};

const UnsupportedView = () => {
  const { t } = useTranslation();
  return (
    <div className="px-6 md:px-12 py-12 md:py-20">
      <div className="max-w-[120rem] mx-auto">
        <div className="max-w-2xl">
          <h1
            className="text-[2.8rem] md:text-[3.6rem] text-[#121212] dark:text-white tracking-tight mb-4"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            {t('via.title')}
          </h1>
          <p className="text-[1.6rem] text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)] leading-relaxed mb-8">
            {t('via.unsupported')}
          </p>
          <Link
            href="/resources"
            className="inline-block px-8 py-3 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.4rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200"
          >
            {t('resources.title')}
          </Link>
        </div>
      </div>
    </div>
  );
};

const DisconnectedView = ({ onConnect }: { onConnect: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="px-6 md:px-12 py-12 md:py-20">
      <div className="max-w-[120rem] mx-auto">
        <div className="max-w-2xl">
          <h1
            className="text-[2.8rem] md:text-[3.6rem] text-[#121212] dark:text-white tracking-tight mb-4"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            {t('via.title')}
          </h1>
          <p className="text-[1.6rem] text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)] leading-relaxed mb-8">
            {t('via.description')}
          </p>
          <button
            onClick={onConnect}
            className="px-8 py-3 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.4rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200"
          >
            {t('via.connect')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConnectingView = () => {
  const { t } = useTranslation();
  return (
    <div className="px-6 md:px-12 py-12 md:py-20">
      <div className="max-w-[120rem] mx-auto">
        <div className="text-center py-32">
          <div className="w-8 h-8 border-2 border-[#121212] dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-[1.6rem] text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)]">
            {t('via.connecting')}
          </p>
        </div>
      </div>
    </div>
  );
};

const ErrorView = ({
  message,
  onRetry,
  onCancel,
}: {
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="px-6 md:px-12 py-12 md:py-20">
      <div className="max-w-[120rem] mx-auto">
        <div className="max-w-2xl">
          <h1
            className="text-[2.8rem] md:text-[3.6rem] text-[#121212] dark:text-white tracking-tight mb-4"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            {t('via.error')}
          </h1>
          <p className="text-[1.6rem] text-red-500 leading-relaxed mb-8">{message}</p>
          <button
            onClick={onRetry}
            className="px-8 py-3 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.4rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200 mr-4"
          >
            {t('via.retry')}
          </button>
          <button
            onClick={onCancel}
            className="px-8 py-3 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.4rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200"
          >
            {t('via.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConnectedView = ({
  deviceInfo,
  definition,
  onDisconnect,
}: {
  deviceInfo: DeviceInfo;
  definition: DefinitionData | null;
  onDisconnect: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="px-6 md:px-12 py-12 md:py-20">
      <div className="max-w-[120rem] mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1
              className="text-[2.8rem] md:text-[3.6rem] text-[#121212] dark:text-white tracking-tight mb-2"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              {t('via.title')}
            </h1>
            <p className="text-[1.4rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">
              {deviceInfo.productName}
            </p>
          </div>
          <button
            onClick={onDisconnect}
            className="px-6 py-2 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.3rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200"
          >
            {t('via.disconnect')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="border border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] p-6">
            <h2 className="text-[1.6rem] text-[#121212] dark:text-white mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>
              {t('via.deviceInfo')}
            </h2>
            <dl className="space-y-3 text-[1.4rem]">
              <div className="flex justify-between">
                <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.name')}</dt>
                <dd className="text-[#121212] dark:text-white text-right">{deviceInfo.productName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.vendorId')}</dt>
                <dd className="text-[#121212] dark:text-white font-mono">0x{deviceInfo.vendorId.toString(16).padStart(4, '0')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.productId')}</dt>
                <dd className="text-[#121212] dark:text-white font-mono">0x{deviceInfo.productId.toString(16).padStart(4, '0')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.viaProtocol')}</dt>
                <dd className="text-[#121212] dark:text-white">v{deviceInfo.protocol}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.firmware')}</dt>
                <dd className="text-[#121212] dark:text-white">
                  {deviceInfo.protocol >= 11 ? 'VIA v3' : 'VIA v2'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="border border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] p-6">
            <h2 className="text-[1.6rem] text-[#121212] dark:text-white mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>
              {t('via.keyboardDefinition')}
            </h2>
            {definition ? (
              <dl className="space-y-3 text-[1.4rem]">
                <div className="flex justify-between">
                  <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.name')}</dt>
                  <dd className="text-[#121212] dark:text-white text-right">{definition.definition.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.version')}</dt>
                  <dd className="text-[#121212] dark:text-white">{definition.version.toUpperCase()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.matrix')}</dt>
                  <dd className="text-[#121212] dark:text-white">
                    {definition.definition.matrix.rows} rows &times; {definition.definition.matrix.cols} cols
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.keys')}</dt>
                  <dd className="text-[#121212] dark:text-white">
                    {definition.definition.layouts.keys.length} total
                  </dd>
                </div>
                {'labels' in definition.definition.layouts && definition.definition.layouts.labels ? (
                  <div className="flex justify-between">
                    <dt className="text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">{t('via.layoutOptions')}</dt>
                    <dd className="text-[#121212] dark:text-white">
                      {definition.definition.layouts.labels.length} options
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <div>
                <p className="text-[1.4rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)] mb-4">
                  {t('via.noDefinition')}
                </p>
                <p className="text-[1.3rem] text-[rgba(18,18,18,0.45)] dark:text-[rgba(255,255,255,0.45)]">
                  {t('via.noDefinitionHint')}{' '}
                  <Link href="/resources" className="underline hover:text-[#121212] dark:hover:text-white">
                    {t('resources.title')}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] p-6">
          <h2 className="text-[1.6rem] text-[#121212] dark:text-white mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>
            {t('via.keymapEditor')}
          </h2>
          <p className="text-[1.4rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">
            {t('via.keymapEditorDesc')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ViaConfigPage() {
  const [state, dispatch] = useReducer(viaReducer, initialState);
  const cleanupRef = useRef<(() => void) | null>(null);

  const disconnect = useCallback(async () => {
    if (state.deviceInfo) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      await disconnectDevice(state.deviceInfo.device);
    }
    dispatch({ type: 'DISCONNECT' });
  }, [state.deviceInfo]);

  const connect = useCallback(async () => {
    dispatch({ type: 'CONNECT_START' });
    try {
      const deviceInfo = await requestDevice();

      cleanupRef.current?.();
      cleanupRef.current = onDeviceDisconnect(deviceInfo.device, () => {
        dispatch({ type: 'DISCONNECT' });
      });

      dispatch({ type: 'CONNECT_SUCCESS', deviceInfo });

      const parsed = await fetchDefinition(deviceInfo.vendorProductId);
      if (parsed) {
        dispatch({ type: 'DEFINITION_LOADED', definition: parsed });
      }
    } catch (err: any) {
      dispatch({ type: 'CONNECT_ERROR', error: err.message || 'Failed to connect' });
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const hasHIDSupport = typeof window !== 'undefined' && 'hid' in navigator;

  if (!hasHIDSupport) return <UnsupportedView />;
  if (state.isConnecting) return <ConnectingView />;
  if (state.error) return <ErrorView message={state.error} onRetry={connect} onCancel={disconnect} />;
  if (!state.deviceInfo) return <DisconnectedView onConnect={connect} />;
  return <ConnectedView deviceInfo={state.deviceInfo} definition={state.definition} onDisconnect={disconnect} />;
}
