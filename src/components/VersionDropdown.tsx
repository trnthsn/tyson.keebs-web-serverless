'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

type ChangelogEntry = {
  version: string;
  subject: string;
  date: string;
  url: string;
};

const changelog: ChangelogEntry[] = JSON.parse(
  process.env.NEXT_PUBLIC_CHANGELOG ?? '[]',
);

const VersionDropdown = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const latestVersion = changelog[0]?.version;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-3 py-2 font-mono text-[1.3rem] text-[#707070] dark:text-[#b9b9b9] hover:text-[#363434] dark:hover:text-white transition-colors duration-150"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        v{latestVersion}
        <ChevronDown size={14} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[36rem] max-h-[42rem] overflow-y-auto bg-white dark:bg-[#2a2a2a] border border-[#796c6c] dark:border-[#3f3f3f] shadow-xl">
          <div className="sticky top-0 bg-white dark:bg-[#2a2a2a] px-4 py-3 text-[1.4rem] font-semibold text-[#222] dark:text-[#d9d9d9]">
            {t('tysonkeeb.changeLog')}
          </div>
          <ul>
            {changelog.map((entry) => (
              <li
                key={entry.version}
                className="flex items-start gap-3 px-4 py-3 hover:bg-[#f0f0f0] dark:hover:bg-[#333] transition-colors duration-150"
              >
                <span className="shrink-0 mt-0.5 font-mono text-[1.2rem] text-[#707070] dark:text-[#b9b9b9]">
                  v{entry.version}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.3rem] text-[#222] dark:text-[#d9d9d9] leading-snug break-words">
                    {entry.subject}
                  </span>
                  <span className="block text-[1.1rem] text-[#9a9a9a] dark:text-[#8f8f8f]">
                    {entry.date}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VersionDropdown;