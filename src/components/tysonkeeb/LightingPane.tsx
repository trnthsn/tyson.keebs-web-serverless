'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LightingValue,
  getLightingDefinition,
  isVIADefinitionV2,
  type VIADefinitionV2,
  type VIADefinitionV3,
} from '@the-via/reader';
import { evalExpr } from '@the-via/pelpi';
import type { ParsedDefinition } from '@/utils/via-config/definitions';
import type {
  CustomColor,
  LightingData,
} from '@/components/tysonkeeb/useTysonKeebDevice';
import {
  flattenV3Menus,
  resolveV3Menus,
  type FlattenedMenu,
  type MenuControl,
} from '@/utils/via-config/v3-menus';
import { shiftFrom16Bit, shiftTo16Bit } from '@/utils/via-config/hid';
import { getRGB, getHex, get256HSV } from '@/utils/color-math';

type ControlMeta = {
  command: LightingValue;
  label: string | (() => string);
  type: 'slider' | 'range' | 'color' | 'select' | 'row_col';
  min?: number;
  max?: number;
  getOptions?: (definition: VIADefinitionV2 | VIADefinitionV3) => string[];
};

type LightingPaneProps = {
  definition: ParsedDefinition;
  lightingData: LightingData | null;
  customColors: CustomColor[] | null;
  perKeyRGB: number[][] | null;
  updateBacklightValue: (
    command: number,
    ...rest: number[]
  ) => Promise<void>;
  updateCustomColor: (idx: number, hue: number, sat: number) => Promise<void>;
  updateMenuValue: (
    name: string,
    channel: number,
    id: number,
    ...rest: number[]
  ) => Promise<void>;
  updatePerKeyRGB: (index: number, hue: number, sat: number) => Promise<void>;
};

const hsvToRgbString = (hue: number, sat: number): string => {
  const h = (hue / 255) * 360;
  const s = sat / 255;
  const v = 1;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const ColorPicker = ({
  color,
  setColor,
}: {
  color: { hue: number; sat: number };
  setColor: (hue: number, sat: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(getHex(color));
  const squareRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    setHexInput(getHex(color));
  }, [color.hue, color.sat]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        thumbRef.current &&
        !thumbRef.current.contains(e.target as Node)
      ) {
        if (!dragging.current) setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const updateFromPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!squareRef.current) return;
      const rect = squareRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
      const hue = Math.round((255 * x) / rect.width);
      const sat = Math.round(255 * (1 - y / rect.height));
      setColor(hue, sat);
    },
    [setColor],
  );

  const onSquareMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    updateFromPosition(e.clientX, e.clientY);
    const onMove = (ev: MouseEvent) => updateFromPosition(ev.clientX, ev.clientY);
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = (e.target as HTMLInputElement).value.trim();
    const hex = val.startsWith('#') ? val : `#${val}`;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
      const [h, s] = get256HSV(hex);
      setColor(h, s);
      setHexInput(getHex({ hue: h, sat: s }));
    } else {
      setHexInput(getHex(color));
    }
  };

  const lensX = (color.hue / 255) * 100;
  const lensY = (1 - color.sat / 255) * 100;
  const rgbString = getRGB(color);

  return (
    <div className="relative flex flex-row-reverse items-center">
      <div
        ref={thumbRef}
        onClick={() => setOpen((o) => !o)}
        className="w-[2.8rem] h-[2.8rem] rounded-full border-[3px] border-[#796c6c] dark:border-[#414141] cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: rgbString }}
      />
      {open && (
        <div
          ref={popupRef}
          className="absolute right-[3.6rem] top-[-0.8rem] z-50 flex flex-col items-center bg-white dark:bg-[#1e1e1e] border-[3px] border-[#796c6c] dark:border-[#414141] shadow-lg"
          style={{ width: '18rem' }}
        >
          <div className="w-full px-2 py-1 text-center border-b border-[#796c6c] dark:border-[#414141]">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onKeyDown={onHexKeyDown}
              className="w-full text-center bg-transparent text-[1.6rem] font-light text-[#222] dark:text-[#d9d9d9] outline-none"
            />
          </div>
          <div className="w-full h-[2rem]" style={{ background: rgbString }} />
          <div
            ref={squareRef}
            onMouseDown={onSquareMouseDown}
            className="relative w-full h-[18rem] cursor-crosshair select-none"
            style={{
              background: `linear-gradient(to right, red, yellow, lime, aqua, blue, magenta, red)`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to top, white, rgba(0,0,0,0))',
              }}
            />
            <div
              className="absolute w-[1rem] h-[1rem] rounded-full border-2 border-black opacity-70 bg-white/20 pointer-events-none"
              style={{
                left: `${lensX}%`,
                top: `${lensY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ControlRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="py-4 flex items-center justify-between gap-8 border-b border-[#796c6c]/40 dark:border-[#414141]/40">
    <span className="text-[1.6rem] text-[#222] dark:text-[#d9d9d9]">
      {label}
    </span>
    <div className="min-w-[20rem]">{children}</div>
  </div>
);

const decodeNullTerminatedUTF8 = (value?: number[]): string => {
  if (!value || value.length === 0) return '';
  const terminatorIdx = value.indexOf(0);
  const bytes = value.slice(
    0,
    terminatorIdx === -1 ? undefined : terminatorIdx,
  );
  return new TextDecoder().decode(new Uint8Array(bytes));
};

const PerKeyColorPalette = ({
  perKeyRGB,
  updatePerKeyRGB,
}: {
  perKeyRGB: number[][];
  updatePerKeyRGB: (index: number, hue: number, sat: number) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentColor = perKeyRGB[selectedIndex] ?? [0, 0];

  const presetColors = Array(10)
    .fill(0)
    .map((_, i) => ({
      hue: Math.round((i * 255) / 10),
      sat: 255,
    }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {perKeyRGB.map((color, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className={`w-[2.5rem] h-[2.5rem] rounded-full border-2 transition-transform ${
              idx === selectedIndex ? 'border-[#9c9c9c] scale-110' : 'border-transparent scale-90'
            }`}
            style={{ backgroundColor: hsvToRgbString(color[0], color[1]) }}
            title={`LED ${idx}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[1.2rem] uppercase text-[#707070] dark:text-[#b9b9b9]">
          {t('tysonkeeb.ledIndex')}
        </span>
        <input
          type="number"
          min={0}
          max={perKeyRGB.length - 1}
          value={selectedIndex}
          onChange={(e) =>
            setSelectedIndex(
              Math.max(0, Math.min(perKeyRGB.length - 1, +e.target.value)),
            )
          }
          className="w-[6rem] bg-[#f0f0f0] dark:bg-[#222] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9] text-[1.4rem] px-2 py-1"
        />
      </div>
      <ColorPicker
        color={{ hue: currentColor[0], sat: currentColor[1] }}
        setColor={(hue, sat) => updatePerKeyRGB(selectedIndex, hue, sat)}
      />
      <div className="flex items-center gap-2">
        <span className="text-[1.2rem] uppercase text-[#707070] dark:text-[#b9b9b9]">
          {t('tysonkeeb.presets')}
        </span>
        <div className="flex gap-1">
          {presetColors.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => updatePerKeyRGB(selectedIndex, preset.hue, preset.sat)}
              className="w-[2rem] h-[2rem] rounded-full border border-[#796c6c]/40 dark:border-[#414141]/40 hover:scale-110 transition-transform"
              style={{ backgroundColor: hsvToRgbString(preset.hue, preset.sat) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const LightingPane = ({
  definition,
  lightingData,
  customColors,
  perKeyRGB,
  updateBacklightValue,
  updateCustomColor,
  updateMenuValue,
  updatePerKeyRGB,
}: LightingPaneProps) => {
  const { t } = useTranslation();
  const [category, setCategory] = useState<'general' | 'layout' | 'advanced'>(
    'general',
  );

  if (definition.version === 'v3') {
    return (
      <V3MenuPane
        menus={resolveV3Menus(definition.definition.menus)}
        lightingData={lightingData}
        perKeyRGB={perKeyRGB}
        updateMenuValue={updateMenuValue}
        updatePerKeyRGB={updatePerKeyRGB}
        t={t}
      />
    );
  }

  const v2Definition = isVIADefinitionV2(definition.definition)
    ? definition.definition
    : null;

  if (!v2Definition || !lightingData) {
    return (
      <div className="h-full flex items-center justify-center text-[1.6rem] text-[#707070] dark:text-[#b9b9b9]">
        {t('tysonkeeb.lightingUnavailable')}
      </div>
    );
  }

  const supported = getLightingDefinition(v2Definition.lighting).supportedLightingValues;

  const lightingDefinition = getLightingDefinition(v2Definition.lighting);
  const { effects, underglowEffects } = lightingDefinition;

  const supportedControls = (
    metas: ControlMeta[],
  ): ControlMeta[] =>
    metas.filter((meta) => supported.includes(meta.command));

  const renderControl = (meta: ControlMeta) => {
    const valArr = lightingData[meta.command];
    if (!valArr) return null;
    const label =
      typeof meta.label === 'function' ? meta.label() : meta.label;

    switch (meta.type) {
      case 'slider':
        return (
          <ControlRow key={meta.command} label={label}>
            <input
              type="checkbox"
              checked={!!valArr[0]}
              onChange={(e) => updateBacklightValue(meta.command, +e.target.checked)}
              className="w-[4rem] h-[2rem] accent-[#9c9c9c]"
            />
          </ControlRow>
        );
      case 'range':
        return (
          <ControlRow key={meta.command} label={label}>
            <input
              type="range"
              min={meta.min}
              max={meta.max}
              value={valArr[0]}
              onChange={(e) => updateBacklightValue(meta.command, +e.target.value)}
              className="w-full accent-[#9c9c9c]"
            />
          </ControlRow>
        );
      case 'color':
        return (
          <ControlRow key={meta.command} label={label}>
            <ColorPicker
              color={{ hue: valArr[0], sat: valArr[1] }}
              setColor={(hue, sat) =>
                updateBacklightValue(meta.command, hue, sat)
              }
            />
          </ControlRow>
        );
      case 'select': {
        const options = meta.getOptions?.(v2Definition) ?? [];
        return (
          <ControlRow key={meta.command} label={label}>
            <select
              value={valArr[0]}
              onChange={(e) =>
                updateBacklightValue(meta.command, +e.target.value)
              }
              className="w-full bg-[#f0f0f0] dark:bg-[#222] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9] text-[1.6rem] px-3 py-2"
            >
              {options.map((option, idx) => (
                <option key={idx} value={idx}>
                  {option}
                </option>
              ))}
            </select>
          </ControlRow>
        );
      }
      case 'row_col':
        return (
          <ControlRow key={meta.command} label={label}>
            <input
              type="checkbox"
              checked={valArr[0] !== 255}
              onChange={(e) => {
                const args = e.target.checked ? [254, 254] : [255, 255];
                updateBacklightValue(meta.command, args[0], args[1]);
              }}
              className="w-[4rem] h-[2rem] accent-[#9c9c9c]"
            />
          </ControlRow>
        );
    }
  };

  const BacklightControls: ControlMeta[] = [
    {
      command: LightingValue.BACKLIGHT_BRIGHTNESS,
      label: t('tysonkeeb.brightness'),
      type: 'range',
      min: 0,
      max: 255,
    },
    {
      command: LightingValue.BACKLIGHT_EFFECT,
      label: t('tysonkeeb.effect'),
      type: 'select',
      getOptions: (d) =>
        getLightingDefinition((d as VIADefinitionV2).lighting).effects.map(
          ([label]) => label,
        ),
    },
    {
      command: LightingValue.BACKLIGHT_EFFECT_SPEED,
      label: t('tysonkeeb.effectSpeed'),
      type: 'range',
      min: 0,
      max: 3,
    },
  ];

  const UnderglowControls: ControlMeta[] = [
    {
      command: LightingValue.QMK_RGBLIGHT_BRIGHTNESS,
      label: t('tysonkeeb.underglowBrightness'),
      type: 'range',
      min: 0,
      max: 255,
    },
    {
      command: LightingValue.QMK_RGBLIGHT_EFFECT,
      label: t('tysonkeeb.underglowEffect'),
      type: 'select',
      getOptions: (d) =>
        getLightingDefinition((d as VIADefinitionV2).lighting).underglowEffects.map(
          ([label]) => label,
        ),
    },
    {
      command: LightingValue.QMK_RGBLIGHT_EFFECT_SPEED,
      label: t('tysonkeeb.underglowEffectSpeed'),
      type: 'range',
      min: 0,
      max: 3,
    },
  ];

  const LayoutControls: ControlMeta[] = [
    {
      command: LightingValue.BACKLIGHT_USE_7U_SPACEBAR,
      label: '7U Spacebar LEDs',
      type: 'slider',
    },
    {
      command: LightingValue.BACKLIGHT_USE_ISO_ENTER,
      label: 'ISO Enter LEDs',
      type: 'slider',
    },
    {
      command: LightingValue.BACKLIGHT_USE_SPLIT_BACKSPACE,
      label: 'Split Backspace LEDs',
      type: 'slider',
    },
    {
      command: LightingValue.BACKLIGHT_USE_SPLIT_LEFT_SHIFT,
      label: 'Split Left Shift LEDs',
      type: 'slider',
    },
    {
      command: LightingValue.BACKLIGHT_USE_SPLIT_RIGHT_SHIFT,
      label: 'Split Right Shift LEDs',
      type: 'slider',
    },
    {
      command: LightingValue.BACKLIGHT_DISABLE_HHKB_BLOCKER_LEDS,
      label: 'HHKB Blocker LEDs',
      type: 'slider',
    },
  ];

  const AdvancedControls: ControlMeta[] = [
    {
      command: LightingValue.BACKLIGHT_DISABLE_WHEN_USB_SUSPENDED,
      label: t('tysonkeeb.disableWhenUsbSuspended'),
      type: 'slider',
    },
    {
      command: LightingValue.BACKLIGHT_DISABLE_AFTER_TIMEOUT,
      label: () => {
        const valArr = lightingData[LightingValue.BACKLIGHT_DISABLE_AFTER_TIMEOUT];
        return t('tysonkeeb.ledSleepTimeout', {
          value: valArr?.[0] ? t('tysonkeeb.after', { mins: valArr[0] }) : t('tysonkeeb.never'),
        });
      },
      type: 'range',
      min: 0,
      max: 255,
    },
    {
      command: LightingValue.BACKLIGHT_CAPS_LOCK_INDICATOR_COLOR,
      label: t('tysonkeeb.capsLockIndicatorColor'),
      type: 'color',
    },
    {
      command: LightingValue.BACKLIGHT_CAPS_LOCK_INDICATOR_ROW_COL,
      label: t('tysonkeeb.capsLockIndicator'),
      type: 'row_col',
    },
    {
      command: LightingValue.BACKLIGHT_LAYER_1_INDICATOR_COLOR,
      label: t('tysonkeeb.layerIndicatorColor', { layer: 1 }),
      type: 'color',
    },
    {
      command: LightingValue.BACKLIGHT_LAYER_1_INDICATOR_ROW_COL,
      label: t('tysonkeeb.layerIndicator', { layer: 1 }),
      type: 'row_col',
    },
    {
      command: LightingValue.BACKLIGHT_LAYER_2_INDICATOR_COLOR,
      label: t('tysonkeeb.layerIndicatorColor', { layer: 2 }),
      type: 'color',
    },
    {
      command: LightingValue.BACKLIGHT_LAYER_2_INDICATOR_ROW_COL,
      label: t('tysonkeeb.layerIndicator', { layer: 2 }),
      type: 'row_col',
    },
    {
      command: LightingValue.BACKLIGHT_LAYER_3_INDICATOR_COLOR,
      label: t('tysonkeeb.layerIndicatorColor', { layer: 3 }),
      type: 'color',
    },
    {
      command: LightingValue.BACKLIGHT_LAYER_3_INDICATOR_ROW_COL,
      label: t('tysonkeeb.layerIndicator', { layer: 3 }),
      type: 'row_col',
    },
  ];

  const colorsNeeded =
    (lightingData[LightingValue.BACKLIGHT_EFFECT]?.[0] != null &&
      effects[lightingData[LightingValue.BACKLIGHT_EFFECT][0]]?.[1]) ||
    0;
  const underglowColorNeeded =
    lightingData[LightingValue.QMK_RGBLIGHT_EFFECT]?.[0] != null &&
    underglowEffects[
      lightingData[LightingValue.QMK_RGBLIGHT_EFFECT][0]
    ]?.[1] === 1;
  const useCustomColors = !!customColors;
  const showCustomColors = useCustomColors && colorsNeeded > 2;

  const categories = [
    { id: 'general' as const, label: t('tysonkeeb.general') },
    ...(supported.some((v) => LayoutControls.some((c) => c.command === v))
      ? [{ id: 'layout' as const, label: t('tysonkeeb.layout') }]
      : []),
    ...(supported.some((v) => AdvancedControls.some((c) => c.command === v))
      ? [{ id: 'advanced' as const, label: t('tysonkeeb.advanced') }]
      : []),
  ];

  const activeCategory =
    categories.find((c) => c.id === category) ?? categories[0];

  return (
    <div className="h-full flex">
      <div className="w-[16rem] shrink-0 py-4 border-r border-[#796c6c] dark:border-[#414141]">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`block w-full text-left py-2 px-4 text-[1.6rem] uppercase tracking-wide transition-colors duration-150 ${
              activeCategory.id === cat.id
                ? 'bg-[#e0e0e0] text-[#363434] dark:bg-[#414141] dark:text-[#d9d9d9]'
                : 'text-[#222] dark:text-[#d9d9d9] hover:bg-[#e0e0e0] dark:hover:bg-[#333]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-4 min-w-0">
        {activeCategory.id === 'general' && (
          <>
            {supportedControls(BacklightControls).map(renderControl)}
            {supportedControls(UnderglowControls).map(renderControl)}
            {new Array(Math.max(colorsNeeded, 0))
              .fill(1)
              .map((_, idx) => idx)
              .map((idx) => {
                const val = idx + 1;
                const command =
                  val === 1
                    ? LightingValue.BACKLIGHT_COLOR_1
                    : LightingValue.BACKLIGHT_COLOR_2;
                const valArr = lightingData[command];
                if (showCustomColors && customColors) {
                  const color = customColors[val - 1];
                  if (!color) return null;
                  return (
                    <ControlRow
                      key={val}
                      label={`${t('tysonkeeb.color')} ${val}`}
                    >
                      <ColorPicker
                        color={color}
                        setColor={(hue, sat) =>
                          updateCustomColor(val - 1, hue, sat)
                        }
                      />
                    </ControlRow>
                  );
                }
                if (!valArr) return null;
                return (
                  <ControlRow key={val} label={`${t('tysonkeeb.color')} ${val}`}>
                    <ColorPicker
                      color={{ hue: valArr[0], sat: valArr[1] }}
                      setColor={(hue, sat) =>
                        updateBacklightValue(command, hue, sat)
                      }
                    />
                  </ControlRow>
                );
              })}
            {underglowColorNeeded &&
              renderControl({
                command: LightingValue.QMK_RGBLIGHT_COLOR,
                label: t('tysonkeeb.underglowColor'),
                type: 'color',
              })}
          </>
        )}
        {activeCategory.id === 'layout' &&
          supportedControls(LayoutControls).map(renderControl)}
        {activeCategory.id === 'advanced' &&
          supportedControls(AdvancedControls).map(renderControl)}
      </div>
    </div>
  );
};

type V3MenuPaneProps = {
  menus: ReturnType<typeof resolveV3Menus>;
  lightingData: LightingData | null;
  perKeyRGB: number[][] | null;
  updateMenuValue: LightingPaneProps['updateMenuValue'];
  updatePerKeyRGB: LightingPaneProps['updatePerKeyRGB'];
  t: (key: string, opts?: Record<string, unknown>) => string;
};

const V3MenuPane = ({
  menus,
  lightingData,
  perKeyRGB,
  updateMenuValue,
  updatePerKeyRGB,
  t,
}: V3MenuPaneProps) => {
  if (!lightingData) {
    return (
      <div className="h-full flex items-center justify-center text-[1.6rem] text-[#707070] dark:text-[#b9b9b9]">
        {t('tysonkeeb.lightingUnavailable')}
      </div>
    );
  }

  const flattened = flattenV3Menus(menus);
  const groups: { label: string; submenuLabel: string | null; items: FlattenedMenu[] }[] = [];
  for (const item of flattened) {
    let group = groups.find((g) => g.label === item.menuLabel);
    if (!group) {
      group = { label: item.menuLabel, submenuLabel: null, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  const pelpiState: Record<string, number> = {};
  for (const [key, val] of Object.entries(lightingData)) {
    if (Array.isArray(val) && typeof val[0] === 'number') {
      pelpiState[key] = val[0];
    }
  }

  const evalShowIf = (expr: string | undefined): boolean => {
    if (!expr) return true;
    try {
      return !!evalExpr(expr, pelpiState);
    } catch {
      return true;
    }
  };

  const setControlValue = (control: MenuControl, ...values: number[]) =>
    updateMenuValue(control.name, control.channel, control.id, ...values);

  const renderControl = (item: FlattenedMenu) => {
    const { control } = item;
    if (!evalShowIf(control.showIf)) return null;
    const valArr = lightingData[control.name];

    switch (control.type) {
      case 'label': {
        const text = Array.isArray(valArr) && valArr.length > 0
          ? decodeNullTerminatedUTF8(valArr)
          : control.label;
        return (
          <ControlRow key={control.name} label={control.label}>
            <span className="text-[1.4rem] text-[#707070] dark:text-[#b9b9b9]">
              {text || '\u00A0'}
            </span>
          </ControlRow>
        );
      }
      case 'button': {
        const buttonOption = (Array.isArray(control.options) ? control.options : [1]) as number[];
        return (
          <ControlRow key={control.name} label={control.label}>
            <button
              onClick={() => {
                updateMenuValue(control.name, control.channel, control.id, buttonOption[0]);
              }}
              className="px-4 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.4rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-150"
            >
              {t('tysonkeeb.click')}
            </button>
          </ControlRow>
        );
      }
      case 'keycode': {
        if (!valArr) return null;
        const keycodeValue = shiftTo16Bit([valArr[0], valArr[1]]);
        return (
          <ControlRow key={control.name} label={control.label}>
            <input
              type="number"
              min={0}
              max={65535}
              value={keycodeValue}
              onChange={(e) => {
                const val = Math.max(0, Math.min(65535, +e.target.value));
                const [hi, lo] = shiftFrom16Bit(val);
                setControlValue(control, hi, lo);
              }}
              className="w-[10rem] bg-[#f0f0f0] dark:bg-[#222] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9] text-[1.4rem] px-3 py-2"
            />
          </ControlRow>
        );
      }
      case 'color-palette': {
        if (!perKeyRGB || perKeyRGB.length === 0) return null;
        return (
          <ControlRow key={control.name} label={control.label}>
            <PerKeyColorPalette
              perKeyRGB={perKeyRGB}
              updatePerKeyRGB={updatePerKeyRGB}
            />
          </ControlRow>
        );
      }
      case 'range':
        if (!valArr) return null;
        return (
          <ControlRow key={control.name} label={control.label}>
            <input
              type="range"
              min={control.min ?? 0}
              max={control.max ?? 255}
              value={valArr[0]}
              onChange={(e) => setControlValue(control, +e.target.value)}
              className="w-full accent-[#9c9c9c]"
            />
          </ControlRow>
        );
      case 'dropdown':
        if (!valArr) return null;
        return (
          <ControlRow key={control.name} label={control.label}>
            <select
              value={valArr[0]}
              onChange={(e) => setControlValue(control, +e.target.value)}
              className="w-full bg-[#f0f0f0] dark:bg-[#222] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9] text-[1.6rem] px-3 py-2"
            >
              {((control.options ?? []) as unknown[]).map((option, idx) => {
                const [label, value] = typeof option === 'string'
                  ? [option, idx]
                  : Array.isArray(option)
                    ? [String(option[0]), option[1] ?? idx]
                    : [String(option), idx];
                return (
                  <option key={idx} value={value}>
                    {String(label)}
                  </option>
                );
              })}
            </select>
          </ControlRow>
        );
      case 'color':
        if (!valArr) return null;
        return (
          <ControlRow key={control.name} label={control.label}>
            <ColorPicker
              color={{ hue: valArr[0], sat: valArr[1] }}
              setColor={(hue, sat) => setControlValue(control, hue, sat)}
            />
          </ControlRow>
        );
      case 'toggle':
        if (!valArr) return null;
        return (
          <ControlRow key={control.name} label={control.label}>
            <input
              type="checkbox"
              checked={!!valArr[0]}
              onChange={(e) => setControlValue(control, +e.target.checked)}
              className="w-[4rem] h-[2rem] accent-[#9c9c9c]"
            />
          </ControlRow>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-4">
      {groups.length === 0 && (
        <div className="h-full flex items-center justify-center text-[1.6rem] text-[#707070] dark:text-[#b9b9b9]">
          {t('tysonkeeb.lightingUnavailable')}
        </div>
      )}
      {groups.map((group) => {
        const renderedItems: React.ReactNode[] = [];
        let lastSubmenu: string | null | undefined = undefined;
        for (const item of group.items) {
          const rendered = renderControl(item);
          if (!rendered) continue;
          if (item.submenuLabel && item.submenuLabel !== lastSubmenu) {
            renderedItems.push(
              <div key={`sub-${item.submenuLabel}`} className="py-4 text-[1.4rem] uppercase tracking-wide text-[#707070] dark:text-[#b9b9b9] border-b border-[#796c6c]/40 dark:border-[#414141]/40">
                {item.submenuLabel}
              </div>,
            );
            lastSubmenu = item.submenuLabel;
          } else if (!item.submenuLabel && lastSubmenu !== null) {
            lastSubmenu = null;
          }
          renderedItems.push(
            <div key={item.control.name}>{rendered}</div>,
          );
        }
        return (
          <div key={group.label}>
            <div className="py-4 text-[1.8rem] font-medium text-[#222] dark:text-[#d9d9d9] border-b border-[#796c6c] dark:border-[#414141]">
              {group.label}
            </div>
            {renderedItems}
          </div>
        );
      })}
    </div>
  );
};
