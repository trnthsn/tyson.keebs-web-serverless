'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = languages.find((l) => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[1.2rem] tracking-wide text-[rgba(18,18,18,0.55)] hover:text-[#121212] dark:text-[rgba(255,255,255,0.55)] dark:hover:text-white transition-colors"
      >
        <span className="uppercase font-medium">{current.code}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#1a1a1a] border border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)] z-50 shadow-sm min-w-[14rem]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                localStorage.setItem('tysonkeebs-language', lang.code);
                localStorage.setItem('i18nextLng', lang.code);
                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-[1.3rem] hover:bg-[#fbfbfb] dark:hover:bg-[#2a2a2a] transition-colors flex items-center justify-between ${
                i18n.language === lang.code
                  ? 'text-[#121212] dark:text-white font-medium'
                  : 'text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)]'
              }`}
            >
              <span>{lang.label}</span>
              {i18n.language === lang.code && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
