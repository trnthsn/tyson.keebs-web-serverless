'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LightingValue,
  getLightingDefinition,
  isVIADefinitionV2,
  type VIADefinitionV2,
  type VIADefinitionV3,
} from '@the-via/reader';
import type { ParsedDefinition } from '@/utils/via-config/definitions';
import type {
  CustomColor,
  LightingData,
} from '@/components/tysonkeeb/useTysonKeebDevice';
import {
  evalShowIf,
  flattenV3Menus,
  resolveV3Menus,
  type FlattenedMenu,
  type MenuControl,
} from '@/utils/via-config/v3-menus';

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
};

const ColorPicker = ({
  color,
  setColor,
}: {
  color: { hue: number; sat: number };
  setColor: (hue: number, sat: number) => void;
}) => (
  <div className="flex flex-col gap-1 w-[24rem]">
    <div className="flex items-center gap-2">
      <span className="text-[1.2rem] w-[3rem] uppercase text-[#707070] dark:text-[#b9b9b9]">
        Hue
      </span>
      <input
        type="range"
        min={0}
        max={255}
        value={color.hue}
        onChange={(e) => setColor(+e.target.value, color.sat)}
        className="w-full accent-[#9c9c9c]"
      />
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[1.2rem] w-[3rem] uppercase text-[#707070] dark:text-[#b9b9b9]">
        Sat
      </span>
      <input
        type="range"
        min={0}
        max={255}
        value={color.sat}
        onChange={(e) => setColor(color.hue, +e.target.value)}
        className="w-full accent-[#9c9c9c]"
      />
    </div>
  </div>
);

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

export const LightingPane = ({
  definition,
  lightingData,
  customColors,
  updateBacklightValue,
  updateCustomColor,
  updateMenuValue,
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
        updateMenuValue={updateMenuValue}
        t={t}
      />
    );
  }

  const v2Definition = isVIADefinitionV2(definition.definition)
    ? definition.definition
    : null;

  const supported = useMemo(() => {
    if (!v2Definition) return [] as LightingValue[];
    return getLightingDefinition(v2Definition.lighting).supportedLightingValues;
  }, [v2Definition]);

  if (!v2Definition || !lightingData) {
    return (
      <div className="h-full flex items-center justify-center text-[1.6rem] text-[#707070] dark:text-[#b9b9b9]">
        {t('tysonkeeb.lightingUnavailable')}
      </div>
    );
  }

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
              className="w-full bg-[#f0f0f0] dark:bg-[#222] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9] text-[1.6rem] px-3 py-2 rounded-[0.4rem]"
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
  updateMenuValue: LightingPaneProps['updateMenuValue'];
  t: (key: string) => string;
};

const V3MenuPane = ({
  menus,
  lightingData,
  updateMenuValue,
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

  const setControlValue = (control: MenuControl, ...values: number[]) =>
    updateMenuValue(control.name, control.channel, control.id, ...values);

  const renderControl = (item: FlattenedMenu) => {
    const { control } = item;
    if (!evalShowIf(control.showIf, lightingData)) return null;
    const valArr = lightingData[control.name];
    if (!valArr) return null;

    switch (control.type) {
      case 'range':
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
        return (
          <ControlRow key={control.name} label={control.label}>
            <select
              value={valArr[0]}
              onChange={(e) => setControlValue(control, +e.target.value)}
              className="w-full bg-[#f0f0f0] dark:bg-[#222] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9] text-[1.6rem] px-3 py-2 rounded-[0.4rem]"
            >
              {(control.options ?? []).map((option, idx) => (
                <option key={idx} value={idx}>
                  {option}
                </option>
              ))}
            </select>
          </ControlRow>
        );
      case 'color':
        return (
          <ControlRow key={control.name} label={control.label}>
            <ColorPicker
              color={{ hue: valArr[0], sat: valArr[1] }}
              setColor={(hue, sat) => setControlValue(control, hue, sat)}
            />
          </ControlRow>
        );
      case 'toggle':
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
      {groups.map((group) => (
        <div key={group.label}>
          <div className="py-4 text-[1.8rem] font-medium text-[#222] dark:text-[#d9d9d9] border-b border-[#796c6c] dark:border-[#414141]">
            {group.label}
          </div>
          {group.items.map((item) => {
            const rendered = renderControl(item);
            if (!rendered) return null;
            if (!item.submenuLabel) return rendered;
            return (
              <div key={item.control.name}>
                <div className="py-4 text-[1.4rem] uppercase tracking-wide text-[#707070] dark:text-[#b9b9b9] border-b border-[#796c6c]/40 dark:border-[#414141]/40">
                  {item.submenuLabel}
                </div>
                {rendered}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
