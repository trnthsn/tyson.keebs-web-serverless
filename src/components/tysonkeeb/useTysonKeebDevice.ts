'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  requestDevice,
  disconnectDevice,
  onDeviceDisconnect,
  getLayerCount,
  readRawMatrix,
  setKeycode,
  writeRawMatrix,
  getBacklightValue,
  setBacklightValue,
  saveLighting,
  getCustomColor,
  setCustomColor,
  type DeviceInfo,
} from '@/utils/via-config/hid';
import {
  fetchDefinition,
  type ParsedDefinition,
} from '@/utils/via-config/definitions';
import { getBasicKeyDict } from '@/utils/via-config/key-to-byte/dictionary-store';
import { getByteToKey } from '@/utils/via-config/key';
import { getNextKey, getRenderedKeys } from '@/utils/via-config/keyboard-rendering';
import {
  getKeyboardValue,
  setKeyboardValue,
  KeyboardValue,
} from '@/utils/via-config/hid';
import {
  packBits,
  numIntoBytes,
  bytesIntoNum,
  unpackBits,
} from '@/utils/via-config/bit-pack';
import { getLightingDefinition, LightingValue } from '@the-via/reader';

export type LightingData = {
  [command: number]: number[];
  customColors?: { hue: number; sat: number }[];
};

const commandParamLengths: Record<number, number> = {
  [LightingValue.BACKLIGHT_COLOR_1]: 2,
  [LightingValue.BACKLIGHT_COLOR_2]: 2,
  [LightingValue.QMK_RGBLIGHT_COLOR]: 2,
  [LightingValue.BACKLIGHT_CUSTOM_COLOR]: 2,
  [LightingValue.BACKLIGHT_CAPS_LOCK_INDICATOR_COLOR]: 2,
  [LightingValue.BACKLIGHT_CAPS_LOCK_INDICATOR_ROW_COL]: 2,
  [LightingValue.BACKLIGHT_LAYER_1_INDICATOR_COLOR]: 2,
  [LightingValue.BACKLIGHT_LAYER_2_INDICATOR_COLOR]: 2,
  [LightingValue.BACKLIGHT_LAYER_3_INDICATOR_COLOR]: 2,
  [LightingValue.BACKLIGHT_LAYER_1_INDICATOR_ROW_COL]: 2,
  [LightingValue.BACKLIGHT_LAYER_2_INDICATOR_ROW_COL]: 2,
  [LightingValue.BACKLIGHT_LAYER_3_INDICATOR_ROW_COL]: 2,
  [LightingValue.BACKLIGHT_EFFECT_SPEED]: 1,
  [LightingValue.BACKLIGHT_USE_7U_SPACEBAR]: 1,
  [LightingValue.BACKLIGHT_USE_ISO_ENTER]: 1,
  [LightingValue.BACKLIGHT_USE_SPLIT_BACKSPACE]: 1,
  [LightingValue.BACKLIGHT_USE_SPLIT_LEFT_SHIFT]: 1,
  [LightingValue.BACKLIGHT_USE_SPLIT_RIGHT_SHIFT]: 1,
  [LightingValue.BACKLIGHT_DISABLE_AFTER_TIMEOUT]: 1,
  [LightingValue.BACKLIGHT_DISABLE_HHKB_BLOCKER_LEDS]: 1,
  [LightingValue.BACKLIGHT_DISABLE_WHEN_USB_SUSPENDED]: 1,
};

export type KeymapStore = {
  layers: number[][] | null;
  layerCount: number;
  selectedLayer: number;
  selectedKey: number | null;
  isSelectable: boolean;
  loadProgress: number;
  setSelectedLayer: (layer: number) => void;
  setSelectedKey: (key: number | null) => void;
  setIsSelectable: (selectable: boolean) => void;
  updateKey: (keyIndex: number, value: number) => Promise<void>;
  saveKeymap: (keymap: number[][]) => Promise<void>;
};

export const useTysonKeebDevice = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [definition, setDefinition] = useState<ParsedDefinition | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // keymap state (mirrors via-app keymapSlice)
  const [layers, setLayers] = useState<number[][] | null>(null);
  const [layerCount, setLayerCount] = useState(4);
  const [loadedLayerCount, setLoadedLayerCount] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [selectedKey, setSelectedKeyState] = useState<number | null>(null);
  const [isSelectable, setIsSelectable] = useState(false);

  // lighting state (mirrors via-app lightingSlice)
  const [lightingData, setLightingData] = useState<LightingData | null>(null);

  // layout options state (mirrors via-app definitionsSlice layoutOptionsMap)
  const [layoutOptions, setLayoutOptions] = useState<number[] | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);
  const selectedKeyRef = useRef<number | null>(null);
  selectedKeyRef.current = selectedKey;

  const loadKeymap = useCallback(
    async (deviceInfo: DeviceInfo, definition: ParsedDefinition) => {
      const count = await getLayerCount(deviceInfo);
      setLayerCount(count);
      const { rows, cols } = definition.definition.matrix;
      const keymapLayers: number[][] = [];
      for (let layer = 0; layer < count; layer++) {
        const keymap = await readRawMatrix(deviceInfo, { rows, cols }, layer);
        keymapLayers.push(keymap);
        setLoadedLayerCount(layer + 1);
      }
      setLayers(keymapLayers);
    },
    [],
  );

  const loadLayoutOptions = useCallback(
    async (deviceInfo: DeviceInfo, definition: ParsedDefinition) => {
      const labels = definition.definition.layouts.labels;
      if (!labels || labels.length === 0) {
        setLayoutOptions(null);
        return;
      }
      try {
        const res = await getKeyboardValue(
          deviceInfo,
          KeyboardValue.LAYOUT_OPTIONS,
          [],
          4,
        );
        const optionCounts = labels.map((label) =>
          Array.isArray(label) ? label.slice(1).length : 2,
        );
        setLayoutOptions(unpackBits(bytesIntoNum(res), optionCounts));
      } catch {
        setLayoutOptions(labels.map(() => 0));
      }
    },
    [],
  );

  const updateLayoutOption = useCallback(
    async (index: number, val: number) => {
      if (!deviceInfo || !definition) return;
      const labels = definition.definition.layouts.labels;
      if (!labels) return;
      const optionCounts = labels.map((label) =>
        Array.isArray(label) ? label.slice(1).length : 2,
      );
      const options = [...(layoutOptions ?? labels.map(() => 0))];
      options[index] = val;
      try {
        await setKeyboardValue(
          deviceInfo,
          KeyboardValue.LAYOUT_OPTIONS,
          ...numIntoBytes(packBits(options.map((option, idx) => [option, optionCounts[idx]]))),
        );
      } catch {
        console.warn('Setting layout option command not working');
      }
      setLayoutOptions(options);
    },
    [deviceInfo, definition, layoutOptions],
  );

  const loadLighting = useCallback(
    async (deviceInfo: DeviceInfo, definition: ParsedDefinition) => {
      if (definition.version !== 'v2') return;
      const { supportedLightingValues, effects } = getLightingDefinition(
        definition.definition.lighting,
      );
      if (supportedLightingValues.length === 0) return;

      let props: LightingData = {};

      if (
        supportedLightingValues.indexOf(LightingValue.BACKLIGHT_CUSTOM_COLOR) !==
        -1
      ) {
        const count = Math.max(...effects.map(([, num]) => num));
        const customColors = await Promise.all(
          Array(count)
            .fill(0)
            .map((_, idx) => getCustomColor(deviceInfo, idx)),
        );
        props = { customColors };
      }

      const res = await Promise.all(
        supportedLightingValues.map((command) =>
          getBacklightValue(
            deviceInfo,
            +command,
            commandParamLengths[command as keyof typeof commandParamLengths] ?? 1,
          ),
        ),
      );
      const values = res.reduce(
        (acc: LightingData, val, idx) => ({
          ...acc,
          [supportedLightingValues[idx]]: val,
        }),
        props,
      );
      setLightingData(values);
    },
    [],
  );

  const disconnect = useCallback(async () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setDeviceInfo((current) => {
      if (current) {
        void disconnectDevice(current.device);
      }
      return null;
    });
    setDefinition(null);
    setLayers(null);
    setLoadedLayerCount(0);
    setSelectedLayer(0);
    setSelectedKeyState(null);
    setLightingData(null);
    setLayoutOptions(null);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const info = await requestDevice();

      cleanupRef.current?.();
      cleanupRef.current = onDeviceDisconnect(info.device, () => {
        disconnect();
      });

      setDeviceInfo(info);
      const parsed = await fetchDefinition(info.vendorProductId);
      if (parsed) {
        setDefinition(parsed);
        await Promise.all([loadKeymap(info, parsed), loadLighting(info, parsed)]);
        await loadLayoutOptions(info, parsed);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }, [disconnect, loadKeymap, loadLighting, loadLayoutOptions]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const { keys, cols } = useMemo(() => {
    if (!definition) return { keys: [], cols: 0 };
    return {
      keys: getRenderedKeys(
        definition.definition.layouts.keys,
        definition.definition.layouts.optionKeys,
        layoutOptions,
      ),
      cols: definition.definition.matrix.cols,
    };
  }, [definition, layoutOptions]);

  const basicKeyToByte = useMemo(
    () => getBasicKeyDict(deviceInfo ? deviceInfo.protocol : 0),
    [deviceInfo],
  );
  const byteToKey = useMemo(
    () => getByteToKey(basicKeyToByte),
    [basicKeyToByte],
  );

  const updateKey = useCallback(
    async (keyIndex: number, value: number) => {
      if (!deviceInfo || !definition || !layers) return;
      const { row, col } = keys[keyIndex];
      await setKeycode(deviceInfo, selectedLayer, row, col, value);

      const next = layers.map((layer, idx) =>
        idx === selectedLayer
          ? layer.map((v, i) => (i === row * cols + col ? value : v))
          : layer,
      );
      setLayers(next);

      const nextKey = getNextKey(keyIndex, keys);
      if (nextKey !== null) {
        setSelectedKeyState(nextKey);
      }
    },
    [deviceInfo, definition, layers, keys, cols, selectedLayer],
  );

  const saveKeymap = useCallback(
    async (keymap: number[][]) => {
      if (!deviceInfo) return;
      await writeRawMatrix(deviceInfo, keymap);
      setLayers(keymap);
    },
    [deviceInfo],
  );

  const updateBacklightValue = useCallback(
    async (command: number, ...rest: number[]) => {
      if (!deviceInfo) return;
      setLightingData((current) => ({
        ...current,
        [command]: [...rest],
      }));
      await setBacklightValue(deviceInfo, command, ...rest);
      await saveLighting(deviceInfo);
    },
    [deviceInfo],
  );

  const updateCustomColor = useCallback(
    async (idx: number, hue: number, sat: number) => {
      if (!deviceInfo) return;
      setLightingData((current) => ({
        ...current,
        customColors: (current?.customColors || []).map((c, i) =>
          i === idx ? { hue, sat } : c,
        ),
      }));
      await setCustomColor(deviceInfo, idx, hue, sat);
      await saveLighting(deviceInfo);
    },
    [deviceInfo],
  );

  const keymapStore: KeymapStore = {
    layers,
    layerCount,
    selectedLayer,
    selectedKey,
    isSelectable,
    loadProgress: layerCount ? loadedLayerCount / layerCount : 0,
    setSelectedLayer,
    setSelectedKey: setSelectedKeyState,
    setIsSelectable,
    updateKey,
    saveKeymap,
  };

  return {
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
  };
};
