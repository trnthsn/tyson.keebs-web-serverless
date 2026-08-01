'use client';

import { useTranslation } from 'react-i18next';
import type {
  LayoutLabel,
  VIADefinitionV2,
  VIADefinitionV3,
} from '@the-via/reader';

type LayoutOptionsPaneProps = {
  definition: VIADefinitionV2 | VIADefinitionV3;
  layoutOptions: number[] | null;
  updateLayoutOption: (index: number, val: number) => Promise<void>;
};

const LayoutControl = ({
  labels,
  selectedOption,
  onChange,
}: {
  labels: LayoutLabel;
  selectedOption: number;
  onChange: (val: number) => void;
}) => {
  const { t } = useTranslation();
  if (Array.isArray(labels)) {
    const [label, ...optionLabels] = labels;
    return (
      <div className="py-4 flex items-center justify-between gap-8 border-b border-[#796c6c]/40 dark:border-[#414141]/40">
        <span className="text-[1.6rem] text-[#222] dark:text-[#d9d9d9]">
          {t(label)}
        </span>
        <select
          value={selectedOption}
          onChange={(e) => onChange(+e.target.value)}
          className="min-w-[20rem] bg-[#f0f0f0] dark:bg-[#222] border border-[#796c6c] dark:border-[#414141] text-[#222] dark:text-[#d9d9d9] text-[1.6rem] px-3 py-2 rounded-[0.4rem]"
        >
          {optionLabels.map((optionLabel, idx) => (
            <option key={idx} value={idx}>
              {t(optionLabel)}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="py-4 flex items-center justify-between gap-8 border-b border-[#796c6c]/40 dark:border-[#414141]/40">
      <span className="text-[1.6rem] text-[#222] dark:text-[#d9d9d9]">
        {t(labels)}
      </span>
      <input
        type="checkbox"
        checked={!!selectedOption}
        onChange={(e) => onChange(+e.target.checked)}
        className="w-[4rem] h-[2rem] accent-[#9c9c9c]"
      />
    </div>
  );
};

export const LayoutOptionsPane = ({
  definition,
  layoutOptions,
  updateLayoutOption,
}: LayoutOptionsPaneProps) => {
  const { t } = useTranslation();
  const labels = definition.layouts.labels || [];

  if (layoutOptions == null || labels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[1.6rem] text-[#707070] dark:text-[#b9b9b9]">
        {t('tysonkeeb.noLayoutOptions')}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="text-[1.6rem] font-medium mb-2 text-[#222] dark:text-[#d9d9d9]">
        {t('tysonkeeb.layouts')}
      </div>
      <p className="text-[1.4rem] text-[#707070] dark:text-[#b9b9b9] mb-6">
        {t('tysonkeeb.layoutsHint')}
      </p>
      {labels.map((label, idx) => (
        <LayoutControl
          key={idx}
          labels={label}
          selectedOption={layoutOptions[idx]}
          onChange={(val) => void updateLayoutOption(idx, val)}
        />
      ))}
    </div>
  );
};
