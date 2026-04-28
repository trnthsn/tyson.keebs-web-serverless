'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';

const Navbar = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const linkClass = (path: string) =>
    `text-[1.4rem] tracking-wide transition-opacity duration-200 ${
      pathname === path
        ? 'text-[#121212] dark:text-white'
        : 'text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)] hover:text-[#121212] dark:hover:text-white'
    }`;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#0a0a0a] border-b border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.08)] transition-colors duration-300 shadow-sm dark:shadow-lg dark:shadow-black/20">
      <div className="max-w-[120rem] mx-auto px-6 md:px-0">
        <div className="flex items-center justify-between h-[6rem]">
          <nav className="flex items-center gap-8">
            <Link
              href="/"
              className="text-[2rem] md:text-[2.4rem] italic font-bold tracking-tight text-[#121212] dark:text-white"
              style={{ fontFamily: "'Open Sans', sans-serif" }}
            >
              {`<Tyson.Keebs />`}
            </Link>
            <div className="hidden md:flex items-center gap-8 ml-12">
              <Link href="/via" className={linkClass('/via')}>
                {t('nav.viaConfig')}
              </Link>
              <Link href="/resources" className={linkClass('/resources')}>
                {t('nav.resources')}
              </Link>
            </div>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 text-[#121212] dark:text-white hover:opacity-70 transition-opacity"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 top-[6rem] z-40 bg-black/20 dark:bg-black/30 transition-opacity"
              onClick={closeMobileMenu}
            />
            <div className="md:hidden fixed left-0 right-0 top-[6rem] z-40 bg-white dark:bg-[#0a0a0a] border-b border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.08)] shadow-lg dark:shadow-black/40 animate-in slide-in-from-top-2">
              <div className="px-6 py-6 space-y-4">
                <Link
                  href="/via"
                  className={`flex w-full px-4 py-3 rounded-md ${
                    pathname === '/via'
                      ? 'bg-[#121212] dark:bg-white text-white dark:text-[#121212]'
                      : 'text-[#121212] dark:text-white hover:bg-[#fbfbfb] dark:hover:bg-[#1a1a1a]'
                  } transition-colors text-[1.4rem] tracking-wide`}
                  onClick={closeMobileMenu}
                >
                  {t('nav.viaConfig')}
                </Link>
                <Link
                  href="/resources"
                  className={`flex w-full px-4 py-3 rounded-md ${
                    pathname === '/resources'
                      ? 'bg-[#121212] dark:bg-white text-white dark:text-[#121212]'
                      : 'text-[#121212] dark:text-white hover:bg-[#fbfbfb] dark:hover:bg-[#1a1a1a]'
                  } transition-colors text-[1.4rem] tracking-wide`}
                  onClick={closeMobileMenu}
                >
                  {t('nav.resources')}
                </Link>
                <div className="border-t border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] pt-4 mt-4 flex items-center justify-between gap-4">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
