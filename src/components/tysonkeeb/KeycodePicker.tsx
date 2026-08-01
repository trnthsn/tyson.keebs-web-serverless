'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BuiltInKeycodeModule,
  KeycodeType,
  isVIADefinitionV2,
  isVIADefinitionV3,
  getLightingDefinition,
  type VIADefinitionV2,
  type VIADefinitionV3,
} from '@the-via/reader';
import {
  categoriesForKeycodeModule,
  getByteForCode,
  getKeycodes,
  getShortNameForKeycode,
  type IKeycodeMenu,
} from '@/utils/via-config/key';
import { advancedStringToKeycode } from '@/utils/via-config/advanced-keys';
import { getAutocompleteKeycodes } from '@/utils/via-config/autocomplete-keycodes';

type KeycodePickerProps = {
  definition: VIADefinitionV2 | VIADefinitionV3;
  selectedKey: number | null;
  keymap: number[] | null;
  usedKeycodes: Set<number>;
  basicKeyToByte: Record<string, number>;
  byteToKey: Record<number, string>;
  onUpdateKey: (keyIndex: number, value: number) => void;
};

const maybeFilter = (
  shouldFilter: boolean,
  filterFn: (menu: IKeycodeMenu) => boolean,
) => (menu: IKeycodeMenu) => (shouldFilter ? filterFn(menu) : true);

const getEnabledMenus = (
  definition: VIADefinitionV2 | VIADefinitionV3,
): IKeycodeMenu[] => {
  if (isVIADefinitionV3(definition)) {
    const keycodes = ['default' as const, ...(definition.keycodes || [])];
    const allowedKeycodes = keycodes.flatMap((keycodeName) =>
      categoriesForKeycodeModule(keycodeName) ?? [],
    );
    if ((definition.customKeycodes || []).length !== 0) {
      allowedKeycodes.push('custom');
    }
    return KeycodeCategories.filter((category) =>
      allowedKeycodes.includes(category.id),
    );
  }
  const { lighting, customKeycodes } = definition;
  const { keycodes } = getLightingDefinition(lighting);
  const allowedKeycodes = categoriesForKeycodeModule('default') ?? [];
  if (keycodes !== KeycodeType.None) {
    allowedKeycodes.push(
      ...(keycodes === KeycodeType.QMK
        ? categoriesForKeycodeModule(BuiltInKeycodeModule.QMKLighting) ?? []
        : categoriesForKeycodeModule(BuiltInKeycodeModule.WTLighting) ?? []),
    );
  }
  if (typeof customKeycodes !== 'undefined') {
    allowedKeycodes.push('custom');
  }
  return KeycodeCategories.filter((category) =>
    allowedKeycodes.includes(category.id),
  );
};

const KeycodeCategories: IKeycodeMenu[] = getKeycodes();

const isHex = (input: string): boolean => {
  const lowercased = input.toLowerCase();
  const parsed = parseInt(lowercased, 16);
  return `0x${parsed.toString(16).toLowerCase()}` === lowercased;
};

export const KeycodePicker = ({
  definition,
  selectedKey,
  keymap,
  usedKeycodes,
  basicKeyToByte,
  byteToKey,
  onUpdateKey,
}: KeycodePickerProps) => {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState<string>('basic');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const [hoveredKeycode, setHoveredKeycode] = useState<number | null>(null);

  const menus = useMemo(() => getEnabledMenus(definition), [definition]);
  const customMenu = useMemo<IKeycodeMenu | null>(() => {
    if (isVIADefinitionV3(definition)) {
      if (!definition.customKeycodes || definition.customKeycodes.length === 0) {
        return null;
      }
      return {
        id: 'custom',
        label: 'Custom',
        keycodes: definition.customKeycodes.map((name, idx) => ({
          name: `KC_${String(name)}`,
          code: `CUSTOM(${idx})`,
          shortName: String(name),
        })),
      };
    }
    if (!definition.customKeycodes) return null;
    return {
      id: 'custom',
      label: 'Custom',
      keycodes: definition.customKeycodes.map((name, idx) => ({
        name: `KC_${String(name)}`,
        code: `CUSTOM(${idx})`,
        shortName: String(name),
      })),
    };
  }, [definition]);

  const menu =
    (categoryId === 'custom' && customMenu ? customMenu : undefined) ??
    menus.find((m) => m.id === categoryId) ??
    menus[0];

  const selectedByte =
    selectedKey != null && keymap != null ? keymap[selectedKey] : null;

  const inputIsValid = (input: string): boolean => {
    const trimmed = input.trim().toUpperCase();
    return (
      trimmed in basicKeyToByte ||
      advancedStringToKeycode(trimmed, basicKeyToByte) !== 0 ||
      isHex(trimmed)
    );
  };

  const keycodeFromInput = (input: string): number => {
    const trimmed = input.trim().toUpperCase();
    if (trimmed in basicKeyToByte) return basicKeyToByte[trimmed];
    const advanced = advancedStringToKeycode(trimmed, basicKeyToByte);
    if (advanced !== 0) return advanced;
    if (isHex(trimmed)) return parseInt(trimmed.toLowerCase(), 16);
    return 0;
  };

  const suggestions = useMemo(() => {
    if (!modalInput.trim()) return [];
    const query = modalInput.trim().toUpperCase();
    return getAutocompleteKeycodes()
      .filter(
        (item) =>
          item.code.toUpperCase().includes(query) ||
          item.name.toUpperCase().includes(query),
      )
      .slice(0, 8);
  }, [modalInput]);

  const confirmModal = () => {
    if (!inputIsValid(modalInput) || selectedKey == null) return;
    onUpdateKey(selectedKey, keycodeFromInput(modalInput));
    setModalOpen(false);
    setModalInput('');
  };

  const hoveredKeycodeLabel =
    hoveredKeycode != null ? byteToKey[hoveredKeycode] : null;

  return (
    <div className="flex h-full">
      <div className="w-[16rem] shrink-0 overflow-y-auto py-4 border-r border-[#796c6c] dark:border-[#414141]">
        <button
          onClick={() => setCategoryId('other')}
          className={`block w-full text-left py-2 px-4 text-[1.6rem] uppercase tracking-wide transition-colors duration-150 ${
            categoryId === 'other'
              ? 'bg-[#E8C4B8] text-[#363434]'
              : 'text-[#222] dark:text-[#d9d9d9] hover:bg-[#ebe4e4] dark:hover:bg-[#333]'
          }`}
        >
          {t('tysonkeeb.other')}
        </button>
        {menus.map((m) => (
          <button
            key={m.id}
            onClick={() => setCategoryId(m.id)}
            className={`block w-full text-left py-2 px-4 text-[1.6rem] uppercase tracking-wide transition-colors duration-150 ${
              categoryId === m.id
                ? 'bg-[#E8C4B8] text-[#363434]'
                : 'text-[#222] dark:text-[#d9d9d9] hover:bg-[#ebe4e4] dark:hover:bg-[#333]'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={() => setModalOpen(true)}
          className="block w-full text-left py-2 px-4 text-[1.6rem] uppercase tracking-wide text-[#222] dark:text-[#d9d9d9] hover:bg-[#ebe4e4] dark:hover:bg-[#333] transition-colors duration-150"
        >
          {t('tysonkeeb.anyKeycode')}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="py-4 px-4 flex items-center justify-between border-b border-[#796c6c] dark:border-[#414141]">
          <span className="text-[2rem] uppercase">{menu?.label}</span>
          <span className="text-[1.6rem] text-[#707070] dark:text-[#b9b9b9] tabular-nums">
            {selectedByte != null
              ? `0x${selectedByte.toString(16).toUpperCase().padStart(4, '0')}`
              : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-8 gap-2 w-fit">
            {menu?.keycodes.map((keycode, idx) => {
              const byte = getByteForCode(keycode.code, basicKeyToByte);
              if (byte == null) return null;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (selectedKey != null) onUpdateKey(selectedKey, byte);
                  }}
                  onMouseEnter={() => setHoveredKeycode(byte)}
                  onMouseLeave={() => setHoveredKeycode(null)}
                  title={keycode.title}
                  className={`h-[6.4rem] w-[6.4rem] flex items-center justify-center text-[1.4rem] rounded-[0.4rem] border transition-all duration-100 ${
                    usedKeycodes.has(byte)
                      ? 'opacity-40 border-[#B8C2C2]'
                      : 'border-[#E8C4B8] opacity-100'
                  } ${
                    hoveredKeycode === byte
                      ? 'bg-[#E8C4B8] text-[#363434]'
                      : 'bg-[#f0f0f0] dark:bg-[#363434] text-[#363434] dark:text-[#E8C4B8]'
                  } cursor-pointer`}
                >
                  {getShortNameForKeycode(keycode)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[5rem] shrink-0 flex items-center px-4 border-t border-[#796c6c] dark:border-[#414141] text-[1.4rem] text-[#707070] dark:text-[#b9b9b9]">
          {hoveredKeycodeLabel}
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-[50rem] bg-white dark:bg-[#333] rounded-[0.8rem] p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[2rem] font-medium mb-4 text-[#222] dark:text-[#d9d9d9]">
              {t('tysonkeeb.anyKeycode')}
            </div>
            <input
              autoFocus
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputIsValid(modalInput)) confirmModal();
              }}
              className="w-full bg-[#f0f0f0] dark:bg-[#222] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9] text-[1.6rem] px-4 py-3 rounded-[0.4rem] outline-none focus:border-[#E8C4B8]"
            />
            {suggestions.length > 0 && (
              <div className="mt-2 max-h-[24rem] overflow-y-auto border border-[#796c6c] dark:border-[#414141] rounded-[0.4rem]">
                {suggestions.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => setModalInput(item.code)}
                    className="block w-full text-left px-4 py-2 text-[1.4rem] text-[#222] dark:text-[#d9d9d9] hover:bg-[#ebe4e4] dark:hover:bg-[#444]"
                  >
                    {item.code} - {item.name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setModalInput('');
                }}
                className="px-6 py-2 text-[1.6rem] rounded-[0.4rem] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9]"
              >
                {t('tysonkeeb.cancel')}
              </button>
              <button
                disabled={!inputIsValid(modalInput)}
                onClick={confirmModal}
                className={`px-6 py-2 text-[1.6rem] rounded-[0.4rem] border transition-colors duration-150 ${
                  inputIsValid(modalInput)
                    ? 'border-[#E8C4B8] bg-[#E8C4B8] text-[#363434]'
                    : 'border-[#796c6c] dark:border-[#414141] text-[#707070] dark:text-[#b9b9b9] cursor-not-allowed'
                }`}
              >
                {t('tysonkeeb.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
