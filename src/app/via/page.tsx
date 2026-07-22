'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CircleDot,
  FileText,
  Grid2X2,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  Usb,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VIADefinitionV2, VIADefinitionV3 } from '@the-via/reader';
import { KeyboardPreview } from './components/KeyboardPreview';
import { KeycodePicker } from './components/KeycodePicker';
import { fetchDefinition } from '@/utils/via-config/definitions';
import { disconnectDevice, onDeviceDisconnect, requestDevice } from '@/utils/via-config/hid';
import type { DeviceInfo } from '@/utils/via-config/hid';
import { getLayoutOptionControls, getVisibleKeys } from '@/utils/via-config/layout';
import { getKeycodeLabel } from '@/utils/via-config/keycodes';
import {
  getLayerCount,
  getMatrixIndex,
  readAllLayers,
  readLayoutOptions,
  setKeycode,
  writeLayoutOptions,
} from '@/utils/via-config/protocol';

type DefinitionData =
  | { version: 'v2'; definition: VIADefinitionV2 }
  | { version: 'v3'; definition: VIADefinitionV3 };

type ViaState = {
  deviceInfo: DeviceInfo | null;
  definition: DefinitionData | null;
  layerCount: number;
  layers: number[][];
  layoutOptions: number[];
  selectedLayer: number;
  selectedKeyIndex: number | null;
  isConnecting: boolean;
  isLoadingKeymap: boolean;
  isSaving: boolean;
  error: string | null;
  saveError: string | null;
};

type ViaAction =
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_SUCCESS'; deviceInfo: DeviceInfo }
  | { type: 'DEFINITION_LOADED'; definition: DefinitionData | null }
  | { type: 'KEYMAP_LOADING'; value: boolean }
  | { type: 'KEYMAP_LOADED'; layerCount: number; layers: number[][]; layoutOptions: number[] }
  | { type: 'SELECT_LAYER'; layer: number }
  | { type: 'SELECT_KEY'; keyIndex: number | null }
  | { type: 'UPDATE_KEY'; layer: number; matrixIndex: number; value: number }
  | { type: 'UPDATE_LAYOUT_OPTIONS'; layoutOptions: number[] }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_SAVE_ERROR'; error: string | null }
  | { type: 'CONNECT_ERROR'; error: string }
  | { type: 'DISCONNECT' };

const initialState: ViaState = {
  deviceInfo: null,
  definition: null,
  layerCount: 0,
  layers: [],
  layoutOptions: [],
  selectedLayer: 0,
  selectedKeyIndex: null,
  isConnecting: false,
  isLoadingKeymap: false,
  isSaving: false,
  error: null,
  saveError: null,
};

const viaReducer = (state: ViaState, action: ViaAction): ViaState => {
  switch (action.type) {
    case 'CONNECT_START':
      return { ...initialState, isConnecting: true };
    case 'CONNECT_SUCCESS':
      return { ...state, deviceInfo: action.deviceInfo, isConnecting: false, error: null };
    case 'DEFINITION_LOADED':
      return { ...state, definition: action.definition };
    case 'KEYMAP_LOADING':
      return { ...state, isLoadingKeymap: action.value };
    case 'KEYMAP_LOADED':
      return {
        ...state,
        layerCount: action.layerCount,
        layers: action.layers,
        layoutOptions: action.layoutOptions,
        selectedLayer: 0,
        selectedKeyIndex: null,
        isLoadingKeymap: false,
      };
    case 'SELECT_LAYER':
      return { ...state, selectedLayer: action.layer, selectedKeyIndex: null, saveError: null };
    case 'SELECT_KEY':
      return { ...state, selectedKeyIndex: action.keyIndex, saveError: null };
    case 'UPDATE_KEY': {
      const nextLayers = state.layers.map((layer, layerIndex) =>
        layerIndex === action.layer
          ? layer.map((value, matrixIndex) =>
              matrixIndex === action.matrixIndex ? action.value : value
            )
          : layer
      );
      return { ...state, layers: nextLayers, saveError: null };
    }
    case 'UPDATE_LAYOUT_OPTIONS':
      return { ...state, layoutOptions: action.layoutOptions, selectedKeyIndex: null, saveError: null };
    case 'SET_SAVING':
      return { ...state, isSaving: action.value };
    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.error };
    case 'CONNECT_ERROR':
      return { ...state, isConnecting: false, isLoadingKeymap: false, isSaving: false, error: action.error };
    case 'DISCONNECT':
      return initialState;
    default:
      return state;
  }
};

const UnsupportedView = () => {
  const { t } = useTranslation();
  return (
    <div className="px-6 py-12 md:px-12 md:py-20">
      <div className="mx-auto max-w-[120rem]">
        <div className="max-w-2xl">
          <h1 className="mb-4 text-[2.8rem] tracking-tight text-[#121212] dark:text-white md:text-[3.6rem]" style={{ fontFamily: "'Jost', sans-serif" }}>
            {t('via.title')}
          </h1>
          <p className="mb-8 text-[1.6rem] leading-relaxed text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)]">
            {t('via.unsupported')}
          </p>
          <Link
            href="/resources"
            className="inline-block border border-[#121212] px-8 py-3 text-[1.4rem] tracking-wide text-[#121212] transition-colors duration-200 hover:bg-[#121212] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-[#121212]"
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
    <div className="px-6 py-12 md:px-12 md:py-20">
      <div className="mx-auto max-w-[120rem]">
        <div className="max-w-2xl">
          <h1 className="mb-4 text-[2.8rem] tracking-tight text-[#121212] dark:text-white md:text-[3.6rem]" style={{ fontFamily: "'Jost', sans-serif" }}>
            {t('via.title')}
          </h1>
          <p className="mb-8 text-[1.6rem] leading-relaxed text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)]">
            {t('via.description')}
          </p>
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-2 bg-[#121212] px-8 py-3 text-[1.4rem] tracking-wide text-white transition-colors duration-200 hover:bg-[#333] dark:bg-white dark:text-[#121212] dark:hover:bg-[#e0e0e0]"
          >
            <Usb size={16} strokeWidth={1.8} />
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
    <div className="px-6 py-12 md:px-12 md:py-20">
      <div className="mx-auto max-w-[120rem]">
        <div className="py-32 text-center">
          <LoaderCircle className="mx-auto mb-6 animate-spin text-[#121212] dark:text-white" size={32} strokeWidth={1.5} />
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
    <div className="px-6 py-12 md:px-12 md:py-20">
      <div className="mx-auto max-w-[120rem]">
        <div className="max-w-2xl">
          <h1 className="mb-4 text-[2.8rem] tracking-tight text-[#121212] dark:text-white md:text-[3.6rem]" style={{ fontFamily: "'Jost', sans-serif" }}>
            {t('via.error')}
          </h1>
          <p className="mb-8 text-[1.6rem] leading-relaxed text-red-500">{message}</p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={onRetry}
              className="bg-[#121212] px-8 py-3 text-[1.4rem] tracking-wide text-white transition-colors duration-200 hover:bg-[#333] dark:bg-white dark:text-[#121212] dark:hover:bg-[#e0e0e0]"
            >
              {t('via.retry')}
            </button>
            <button
              onClick={onCancel}
              className="border border-[#121212] px-8 py-3 text-[1.4rem] tracking-wide text-[#121212] transition-colors duration-200 hover:bg-[#121212] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-[#121212]"
            >
              {t('via.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectedView = ({
  state,
  onDisconnect,
  onLayerChange,
  onSelectKey,
  onUpdateKey,
  onUpdateLayoutOption,
  onReconnect,
}: {
  state: ViaState;
  onDisconnect: () => void;
  onLayerChange: (layer: number) => void;
  onSelectKey: (keyIndex: number) => void;
  onUpdateKey: (value: number) => Promise<void>;
  onUpdateLayoutOption: (index: number, value: number) => Promise<void>;
  onReconnect: () => void;
}) => {
  const { t } = useTranslation();
  const { deviceInfo, definition, layers, layerCount, selectedLayer, selectedKeyIndex, layoutOptions, isLoadingKeymap, isSaving, saveError } = state;

  if (!deviceInfo) {
    return null;
  }

  const visibleKeys = definition ? getVisibleKeys(definition.definition, layoutOptions) : [];
  const layoutControls = definition ? getLayoutOptionControls(definition.definition) : [];
  const activeLayer = layers[selectedLayer] ?? [];
  const selectedKey = selectedKeyIndex === null ? null : visibleKeys[selectedKeyIndex] ?? null;
  const selectedKeycode = selectedKey ? activeLayer[selectedKey.matrixIndex] ?? 0 : null;

  const tools = [
    { label: 'Keymap', icon: FileText },
    { label: 'Layouts', icon: Grid2X2 },
    { label: 'Macros', icon: CircleDot },
    { label: 'Layers', icon: LockKeyhole },
    { label: 'Lighting', icon: Lightbulb },
  ];

  return (
    <div className="px-6 py-8 text-[#121212] dark:text-white md:px-10 md:py-10">
      <div className="mx-auto max-w-[138rem] overflow-hidden border border-[rgba(18,18,18,0.1)] bg-[#fbfbfb] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a1a]">
        <div className="flex min-h-[calc(100vh-15rem)] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(18,18,18,0.1)] px-4 py-2 text-[1.35rem] dark:border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wide text-[rgba(18,18,18,0.6)] dark:text-[rgba(255,255,255,0.65)]">Layer</span>
            {Array.from({ length: layerCount }, (_, layer) => (
              <button
                key={layer}
                onClick={() => onLayerChange(layer)}
                className={`min-w-[2.5rem] px-2 py-1 transition-colors ${
                  selectedLayer === layer ? 'bg-[#d0d0d0] text-[#333] dark:bg-[#555] dark:text-white' : 'hover:bg-[#e5e5e5] dark:hover:bg-[#2a2a2a]'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select aria-label="Keyboard" className="max-w-[18rem] border border-[rgba(18,18,18,0.2)] bg-transparent px-3 py-1 text-[#121212] outline-none dark:border-[rgba(255,255,255,0.2)] dark:text-white">
              <option>{definition?.definition.name ?? deviceInfo.productName}</option>
            </select>
            <button onClick={onReconnect} title="Reload keymap" className="p-2 hover:bg-[#e5e5e5] dark:hover:bg-[#2a2a2a]">
              <RefreshCcw size={16} strokeWidth={1.8} />
            </button>
            <button onClick={onDisconnect} title={t('via.disconnect')} className="p-2 hover:bg-[#e5e5e5] dark:hover:bg-[#2a2a2a]">
              <Usb size={16} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        {!definition ? (
          <div className="border border-[rgba(18,18,18,0.1)] p-8 dark:border-[rgba(255,255,255,0.1)]">
            <div className="flex min-h-[28rem] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle size={30} strokeWidth={1.6} className="text-[rgba(18,18,18,0.35)] dark:text-[rgba(255,255,255,0.35)]" />
              <p className="max-w-[42rem] text-[1.5rem] text-[rgba(18,18,18,0.6)] dark:text-[rgba(255,255,255,0.6)]">
                {t('via.noDefinitionHint')}{' '}
                <Link href="/resources" className="underline hover:text-[#121212] dark:hover:text-white">
                  {t('resources.title')}
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-1 items-center justify-center bg-[#f1f1f1] px-4 py-8 dark:bg-[#242424] md:min-h-[42rem]">
              <div className="w-full max-w-[86rem]">
                <KeyboardPreview
                  keys={visibleKeys}
                  layer={activeLayer}
                  selectedKeyIndex={selectedKeyIndex}
                  onSelectKey={onSelectKey}
                />
              </div>
            </div>

            <div className="grid grid-cols-[5.6rem_minmax(0,16rem)_minmax(0,1fr)] border-t border-[rgba(18,18,18,0.1)] bg-[#fbfbfb] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a1a]">
              <nav className="flex flex-col items-center gap-4 border-r border-[rgba(18,18,18,0.1)] py-4 dark:border-[rgba(255,255,255,0.1)]">
                {tools.map(({ label, icon: Icon }, index) => (
                  <button key={label} title={label} className={`p-2 ${index === 0 ? 'bg-[#d0d0d0] text-[#333] dark:bg-[#555] dark:text-white' : 'text-[#888] hover:text-[#333] dark:hover:text-white'}`}>
                    <Icon size={18} strokeWidth={1.7} />
                  </button>
                ))}
              </nav>

              <div className="border-r border-[rgba(18,18,18,0.1)] p-3 dark:border-[rgba(255,255,255,0.1)]">
                <div className="mb-4 rounded-sm bg-[#d0d0d0] px-3 py-2 text-[1.35rem] uppercase tracking-wide text-[#333] dark:bg-[#555] dark:text-white">Basic</div>
                {['Media', 'Macro', 'Layers', 'Special', 'Lighting'].map((name) => (
                  <button key={name} className="block w-full px-3 py-2 text-left text-[1.3rem] uppercase text-[#777] hover:text-[#333] dark:hover:text-white">
                    {name}
                  </button>
                ))}
              </div>

              <div className="min-w-0 p-5 md:p-6">
                {layoutControls.length ? (
                  <div className="mb-5 space-y-2 border-b border-[#444] pb-4">
                    {layoutControls.map((control) => (
                      <label key={control.index} className="flex items-center justify-between gap-4 border-b border-[rgba(18,18,18,0.1)] py-2 text-[1.35rem] text-[rgba(18,18,18,0.6)] dark:border-[rgba(255,255,255,0.1)] dark:text-[rgba(255,255,255,0.6)]">
                        <span>{control.label}</span>
                        <select value={layoutOptions[control.index] ?? 0} onChange={(event) => void onUpdateLayoutOption(control.index, Number(event.target.value))} disabled={isSaving} className="min-w-[14rem] border border-[rgba(18,18,18,0.15)] bg-transparent px-3 py-2 text-[#121212] outline-none dark:border-[rgba(255,255,255,0.15)] dark:text-white">
                          {control.choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : null}

                {selectedKey ? <KeycodePicker currentCode={selectedKeycode} disabled={isSaving} onApply={onUpdateKey} /> : <div className="flex min-h-[16rem] items-center justify-center text-[1.4rem] text-[#888]">Select a key to edit its keycode.</div>}
                {isLoadingKeymap || isSaving ? <div className="mt-4 inline-flex items-center gap-2 text-[1.25rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]"><LoaderCircle size={15} className="animate-spin" />{isLoadingKeymap ? 'Loading keymap...' : 'Writing to keyboard...'}</div> : null}
                {saveError ? <p className="mt-4 text-[1.3rem] text-red-400">{saveError}</p> : null}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

const ViaConfigPage = () => {
  const [state, dispatch] = useReducer(viaReducer, initialState);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const disconnect = useCallback(async () => {
    if (state.deviceInfo) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      await disconnectDevice(state.deviceInfo.device);
    }
    dispatch({ type: 'DISCONNECT' });
  }, [state.deviceInfo]);

  const loadKeymap = useCallback(async (deviceInfo: DeviceInfo, definitionData: DefinitionData) => {
    dispatch({ type: 'KEYMAP_LOADING', value: true });
    const [layerCount, layoutOptions] = await Promise.all([
      getLayerCount(deviceInfo.device, deviceInfo.protocol),
      readLayoutOptions(deviceInfo.device, definitionData.definition),
    ]);
    const layers = await readAllLayers(
      deviceInfo.device,
      definitionData.definition,
      deviceInfo.protocol,
      layerCount,
    );

    const visibleKeys = getVisibleKeys(definitionData.definition, layoutOptions);
    console.log('[Tyson VIA] HID keymap configuration', {
      device: {
        productName: deviceInfo.productName,
        vendorId: `0x${deviceInfo.vendorId.toString(16).padStart(4, '0')}`,
        productId: `0x${deviceInfo.productId.toString(16).padStart(4, '0')}`,
        vendorProductId: deviceInfo.vendorProductId,
      },
      protocol: deviceInfo.protocol,
      matrix: definitionData.definition.matrix,
      layerCount,
      layoutOptions,
      rawLayers: layers,
      visibleKeys: visibleKeys.map((key, index) => {
        const keycode = layers[0]?.[key.matrixIndex] ?? 0;
        return {
          index,
          row: key.row,
          col: key.col,
          matrixIndex: key.matrixIndex,
          keycode,
          label: getKeycodeLabel(keycode),
          optionalLayoutKey: index >= definitionData.definition.layouts.keys.length,
          x: key.x,
          y: key.y,
          width: key.w,
          height: key.h,
        };
      }),
    });

    console.log('[Tyson VIA] HID keymap layers', layers.map((keymap, layer) => ({
      layer,
      keycodes: keymap,
      labels: keymap.map((keycode) => getKeycodeLabel(keycode)),
    })));

    if (isMountedRef.current) {
      dispatch({
        type: 'KEYMAP_LOADED',
        layerCount,
        layers,
        layoutOptions,
      });
    }
  }, []);

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
      dispatch({ type: 'DEFINITION_LOADED', definition: parsed });

      if (parsed) {
        await loadKeymap(deviceInfo, parsed);
      }
    } catch (error: unknown) {
      dispatch({
        type: 'CONNECT_ERROR',
        error: error instanceof Error ? error.message : 'Failed to connect',
      });
    }
  }, [loadKeymap]);

  useEffect(() => {
    isMountedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      setHasMounted(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      isMountedRef.current = false;
      cleanupRef.current?.();
    };
  }, []);

  const visibleKeys = useMemo(
    () => (state.definition ? getVisibleKeys(state.definition.definition, state.layoutOptions) : []),
    [state.definition, state.layoutOptions],
  );

  const handleUpdateKey = useCallback(
    async (value: number) => {
      if (!state.deviceInfo || !state.definition || state.selectedKeyIndex === null) {
        return;
      }

      const key = visibleKeys[state.selectedKeyIndex];
      if (!key) {
        return;
      }

      dispatch({ type: 'SET_SAVING', value: true });
      dispatch({ type: 'SET_SAVE_ERROR', error: null });

      try {
        await setKeycode(
          state.deviceInfo.device,
          state.selectedLayer,
          key.row,
          key.col,
          value,
        );
        dispatch({
          type: 'UPDATE_KEY',
          layer: state.selectedLayer,
          matrixIndex: getMatrixIndex(state.definition.definition.matrix.cols, key),
          value,
        });
      } catch (error: unknown) {
        dispatch({
          type: 'SET_SAVE_ERROR',
          error: error instanceof Error ? error.message : 'Failed to write keycode',
        });
      } finally {
        dispatch({ type: 'SET_SAVING', value: false });
      }
    },
    [state.deviceInfo, state.definition, state.selectedKeyIndex, state.selectedLayer, visibleKeys],
  );

  const handleUpdateLayoutOption = useCallback(
    async (index: number, value: number) => {
      if (!state.deviceInfo || !state.definition) {
        return;
      }

      const nextOptions = state.layoutOptions.map((option, optionIndex) =>
        optionIndex === index ? value : option
      );
      if (nextOptions.length <= index) {
        nextOptions[index] = value;
      }

      dispatch({ type: 'SET_SAVING', value: true });
      dispatch({ type: 'SET_SAVE_ERROR', error: null });

      try {
        console.log('[Tyson VIA] Applying layout options', {
          previous: state.layoutOptions,
          next: nextOptions,
          labels: state.definition.definition.layouts.labels,
        });
        await writeLayoutOptions(state.deviceInfo.device, state.definition.definition, nextOptions);
        dispatch({ type: 'UPDATE_LAYOUT_OPTIONS', layoutOptions: nextOptions });
      } catch (error: unknown) {
        dispatch({
          type: 'SET_SAVE_ERROR',
          error: error instanceof Error ? error.message : 'Failed to update layout option',
        });
      } finally {
        dispatch({ type: 'SET_SAVING', value: false });
      }
    },
    [state.definition, state.deviceInfo, state.layoutOptions],
  );

  const handleReload = useCallback(async () => {
    if (!state.deviceInfo || !state.definition) {
      return;
    }
    dispatch({ type: 'SET_SAVE_ERROR', error: null });
    try {
      await loadKeymap(state.deviceInfo, state.definition);
      setReloadKey((value) => value + 1);
    } catch (error: unknown) {
      dispatch({
        type: 'SET_SAVE_ERROR',
        error: error instanceof Error ? error.message : 'Failed to reload keymap',
      });
    }
  }, [loadKeymap, state.definition, state.deviceInfo]);

  if (!hasMounted) {
    return <ConnectingView />;
  }

  const hasHIDSupport = 'hid' in navigator;

  if (!hasHIDSupport) return <UnsupportedView />;
  if (state.isConnecting) return <ConnectingView />;
  if (state.error) return <ErrorView message={state.error} onRetry={connect} onCancel={disconnect} />;
  if (!state.deviceInfo) return <DisconnectedView onConnect={connect} />;

  return (
    <ConnectedView
      key={reloadKey}
      state={state}
      onDisconnect={() => void disconnect()}
      onLayerChange={(layer) => dispatch({ type: 'SELECT_LAYER', layer })}
      onSelectKey={(keyIndex) => dispatch({ type: 'SELECT_KEY', keyIndex })}
      onUpdateKey={handleUpdateKey}
      onUpdateLayoutOption={handleUpdateLayoutOption}
      onReconnect={() => void handleReload()}
    />
  );
};

export default ViaConfigPage;
