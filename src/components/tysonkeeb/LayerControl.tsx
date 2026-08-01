'use client';

import { useTranslation } from 'react-i18next';

type LayerControlProps = {
  layerCount: number;
  selectedLayer: number;
  onSelectLayer: (layer: number) => void;
};

export const LayerControl = ({
  layerCount,
  selectedLayer,
  onSelectLayer,
}: LayerControlProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <span className="text-[2rem] uppercase text-[#222] dark:text-[#d9d9d9] mr-1">
        {t('tysonkeeb.layer')}
      </span>
      {Array.from({ length: layerCount }, (_, idx) => (
        <button
          key={idx}
          onClick={() => onSelectLayer(idx)}
          className={`px-2 py-1 text-[2rem] tabular-nums transition-colors duration-150 ${
            idx === selectedLayer
              ? 'bg-[#e0e0e0] text-[#363434] dark:bg-[#414141] dark:text-[#d9d9d9]'
              : 'bg-transparent text-[#222] dark:text-[#d9d9d9] hover:bg-[#e0e0e0] dark:hover:bg-[#333]'
          }`}
        >
          {idx}
        </button>
      ))}
    </div>
  );
};
