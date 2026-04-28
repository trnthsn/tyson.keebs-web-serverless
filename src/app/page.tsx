'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main>
      <section className="relative bg-[#fbfbfb] dark:bg-[#1a1a1a] transition-colors duration-300">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12">
          <div className="py-20 md:py-32 lg:py-48 flex flex-col items-center text-center">
            <h1
              className="text-[3.2rem] md:text-[5rem] lg:text-[6.4rem] font-normal tracking-tight text-[#121212] dark:text-white mb-6 max-w-4xl"
              style={{ fontFamily: "'Jost', sans-serif", lineHeight: 1.1 }}
            >
              {t('home.heroTitle')}
            </h1>
            <p className="text-[1.6rem] md:text-[1.8rem] max-w-2xl mb-10 leading-relaxed">
              {t('home.heroSubtitle')}
            </p>
            <div className="flex gap-4">
              <Link
                href="/via"
                className="inline-flex items-center px-8 py-3 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.4rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200"
              >
                {t('home.openViaConfig')}
                <ArrowRight size={16} strokeWidth={1.5} className="ml-2" />
              </Link>
              <Link
                href="/resources"
                className="inline-flex items-center px-8 py-3 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.4rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200"
              >
                {t('home.browseResources')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] transition-colors duration-300">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 py-20 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2
                className="text-[2.4rem] md:text-[3.6rem] text-[#121212] dark:text-white tracking-tight mb-6"
                style={{ fontFamily: "'Jost', sans-serif", lineHeight: 1.15 }}
              >
                {t('home.brandTitle')}
              </h2>
              <p className="text-[1.6rem] text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)] leading-relaxed mb-6">
                {t('home.brandDescription')}
              </p>
            </div>
            <div className="bg-[#fbfbfb] dark:bg-[#1a1a1a] aspect-square flex items-center justify-center transition-colors duration-300">
              <div className="text-center p-12">
                <div
                  className="text-[6rem] md:text-[8rem] text-[#121212] dark:text-white opacity-10 leading-none mb-4"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  TK
                </div>
                <p className="text-[1.4rem] uppercase tracking-widest text-[#121212] dark:text-white">
                  {t('home.est')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
