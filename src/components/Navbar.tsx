'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Drawer } from 'antd';
// import ThemeToggle from './ThemeToggle';
// import LanguageSwitcher from './LanguageSwitcher';

const Navbar = () => {
  // const { t } = useTranslation();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const linkClass = (path: string) =>
    `text-[1.4rem] tracking-wide transition-opacity duration-200 ${
      pathname === path
        ? 'text-[#121212] dark:text-white'
        : 'text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)] hover:text-[#121212] dark:hover:text-white'
    }`;

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
                VIA Config
              </Link>
              <Link href="/resources" className={linkClass('/resources')}>
                Resources
              </Link>
            </div>
          </nav>

          <div className="flex items-center gap-4">
            {/* <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />
              <ThemeToggle />
            </div> */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -mr-2 text-[#121212] dark:text-white"
              aria-label="Menu"
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>

            {/* Mobile Drawer */}
            <Drawer
              placement="left"
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              size={280}
              className="md:hidden"
              styles={{
                body: { padding: 0, background: 'transparent' },
                header: { display: 'none' },
                mask: { backgroundColor: 'rgba(0,0,0,0.5)' },
              }}
            >
              <div className="h-full flex flex-col bg-white dark:bg-[#0a0a0a]">
                <div className="flex items-center justify-between px-6 h-[6rem] border-b border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)]">
                  <span
                    className="text-[1.8rem] italic font-bold text-[#121212] dark:text-white"
                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                  >
                    {`<Tyson.Keebs />`}
                  </span>
                </div>

                <nav className="flex-1 px-6 py-8 space-y-1">
                  <Link
                    href="/via"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-3 text-[1.6rem] !text-[#121212] dark:!text-white hover:opacity-60 transition-opacity no-underline"
                  >
                    VIA Config
                  </Link>
                  <Link
                    href="/resources"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-3 text-[1.6rem] !text-[#121212] dark:!text-white hover:opacity-60 transition-opacity no-underline"
                  >
                    Resources
                  </Link>
                </nav>

                <div className="px-6 py-6 border-t border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)]">
                  {/* <div className="flex items-center justify-between">
                    <span className="text-[1.4rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">
                      Theme
                    </span>
                    <ThemeToggle />
                  </div> */}
                </div>
              </div>
            </Drawer>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
