'use client';

import { useTranslation } from 'react-i18next';
import { TysonKeebTool } from '@/components/tysonkeeb/TysonKeebTool';

const ViaConfigPage = () => {
  const { t } = useTranslation();
  return (
    <div className="px-6 md:px-12 py-12 md:py-20">
      <div className="max-w-[120rem] mx-auto min-h-[60rem]">
        <h1
            className="text-[2.8rem] md:text-[3.6rem] text-[#121212] dark:text-white tracking-tight mb-4"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            {t('via.title')}
          </h1>
        <TysonKeebTool />
      </div>
    </div>
  );
};

export default ViaConfigPage;
