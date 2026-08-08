'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParsedDefinition } from '@/utils/via-config/definitions';
import { getByteForCode, getCodeForByte } from '@/utils/via-config/key';
import deprecatedKeycodes from '@/utils/via-config/key-to-byte/deprecated-keycodes';

type SaveLoadViewProps = {
  definition: ParsedDefinition;
  layers: number[][] | null;
  basicKeyToByte: Record<string, number>;
  byteToKey: Record<number, string>;
  onSave: (keymap: number[][]) => Promise<void>;
};

type ViaSaveFile = {
  name: string;
  vendorProductId: number;
  layers: string[][];
};

const isViaSaveFile = (obj: any): obj is ViaSaveFile =>
  !!obj && !!obj.name && !!obj.layers && obj.vendorProductId !== undefined;

export const SaveLoadView = ({
  definition,
  layers,
  basicKeyToByte,
  byteToKey,
  onSave,
}: SaveLoadViewProps) => {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!layers) return null;

  const { vendorProductId } = definition.definition;
  const name = String(definition.definition.name);

  const saveLayout = async () => {
    const suggestedName =
      name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '.layout.json';
    const saveFile: ViaSaveFile = {
      name,
      vendorProductId,
      layers: layers.map((layer) =>
        layer.map(
          (keyByte) => getCodeForByte(keyByte, basicKeyToByte, byteToKey) || '',
        ),
      ),
    };
    const content = JSON.stringify(saveFile);
    const blob = new Blob([content], { type: 'application/json' });

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = suggestedName;
        link.click();
        URL.revokeObjectURL(url);
      }
      setSuccessMessage(t('tysonkeeb.layoutSaved'));
      setErrorMessage(null);
    } catch {
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const loadLayout = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const reader = new FileReader();
    reader.onabort = () =>
      setErrorMessage(t('tysonkeeb.fileReadCancelled'));
    reader.onerror = () => setErrorMessage(t('tysonkeeb.fileReadFailed'));
    reader.onload = async () => {
      try {
        const saveFile = JSON.parse((reader as any).result.toString());
        if (!isViaSaveFile(saveFile)) {
          setErrorMessage(t('tysonkeeb.invalidData'));
          return;
        }
        if (saveFile.vendorProductId !== vendorProductId) {
          setErrorMessage(
            t('tysonkeeb.wrongKeyboard', { name: saveFile.name }),
          );
          return;
        }
        if (
          saveFile.layers.findIndex(
            (layer, idx) =>
              !layers[idx] || layer.length !== layers[idx].length,
          ) > -1
        ) {
          setErrorMessage(t('tysonkeeb.incorrectKeyCount'));
          return;
        }
        const keymap: number[][] = saveFile.layers.map((layer) =>
          layer.map((key) =>
            getByteForCode(`${deprecatedKeycodes[key] ?? key}`, basicKeyToByte),
          ),
        );
        await onSave(keymap);
        setSuccessMessage(t('tysonkeeb.layoutLoaded'));
      } catch {
        setErrorMessage(t('tysonkeeb.invalidData'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="text-[1.6rem] font-medium mb-2 text-[#222] dark:text-[#d9d9d9]">
        {t('tysonkeeb.saveLoad')}
      </div>
      <p className="text-[1.4rem] text-[#707070] dark:text-[#b9b9b9] mb-6">
        {t('tysonkeeb.saveLoadHint')}
      </p>

      <div className="flex gap-4">
        <button
          onClick={saveLayout}
          className="flex-1 py-3 text-[1.6rem] uppercase tracking-wide border border-[#9c9c9c] bg-[#e0e0e0] text-[#363434] dark:border-[#414141] dark:bg-[#414141] dark:text-[#d9d9d9] hover:opacity-90 transition-opacity"
        >
          {t('tysonkeeb.saveLayout')}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-3 text-[1.6rem] uppercase tracking-wide border border-[#9c9c9c] text-[#222] dark:text-[#d9d9d9] hover:bg-[#e0e0e0] dark:hover:bg-[#333] transition-colors"
        >
          {t('tysonkeeb.loadLayout')}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadLayout(file);
          e.target.value = '';
        }}
      />

      {errorMessage && (
        <div className="mt-6 py-3 px-4 rounded-[0.4rem] border border-red-400 text-red-500 dark:text-red-400 text-[1.4rem]">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mt-6 py-3 px-4 rounded-[0.4rem] border border-green-500 text-green-600 dark:text-green-400 text-[1.4rem]">
          {successMessage}
        </div>
      )}
    </div>
  );
};
