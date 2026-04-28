'use client';

import '@/i18n';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const savedLanguage =
      localStorage.getItem('tysonkeebs-language') || localStorage.getItem('i18nextLng');

    if (savedLanguage && savedLanguage !== i18n.language) {
      void i18n.changeLanguage(savedLanguage);
      return;
    }

    if (!savedLanguage) {
      const browserLanguage = navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';

      if (browserLanguage !== i18n.language) {
        void i18n.changeLanguage(browserLanguage);
      }
    }
  }, [i18n]);

  return <>{children}</>;
}
