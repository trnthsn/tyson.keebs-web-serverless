'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] mt-20 transition-colors duration-300">
      <div className="max-w-[120rem] mx-auto px-6 md:px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h4
              className="text-[1.6rem] text-[#121212] dark:text-white mb-4"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              Tyson.Keebs
            </h4>
            <p className="text-[1.4rem] leading-relaxed">{t('footer.brand')}</p>
          </div>
          <div>
            <h4
              className="text-[1.4rem] text-[#121212] dark:text-white uppercase tracking-wider mb-4"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              {t('footer.tools')}
            </h4>
            <ul className="space-y-2 text-[1.4rem]">
              <li>
                <Link href="/via" className="hover:text-[#121212] dark:hover:text-white transition-colors">
                  {t('footer.viaConfig')}
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-[#121212] dark:hover:text-white transition-colors">
                  {t('footer.resources')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className="text-[1.4rem] text-[#121212] dark:text-white uppercase tracking-wider mb-4"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              {t('footer.connect')}
            </h4>
            <ul className="space-y-2 text-[1.4rem]">
              <li>
                <a
                  href="https://github.com/trnthsn/Tyson.Keebs_PCB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#121212] dark:hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
<div className="mt-16 pt-8 border-t border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] text-[1.2rem] text-center transition-colors duration-300">
          &copy; {year} Tyson.Keebs. All rights reserved.
          <span className="ml-2 font-mono text-[rgba(18,18,18,0.5)] dark:text-[rgba(255,255,255,0.5)]">
            v{process.env.NEXT_PUBLIC_BUILD_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
