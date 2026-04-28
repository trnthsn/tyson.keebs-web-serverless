'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, Download } from 'lucide-react';
import resourcesData from '@/data/resources.json';

type ResourceFile = {
  url: string;
  format: string;
  mcu?: string;
  size?: string;
};

type Resource = {
  id: string;
  name: string;
  description: string;
  category: string;
  keyboardModel: string;
  vendorProductId?: number;
  files: ResourceFile[];
};

const resources = resourcesData as Resource[];

type ResourceCategory = 'All' | 'JSON_DEFINITION' | 'FIRMWARE' | 'BOOTLOADER';

const categoryOrder: ResourceCategory[] = ['All', 'JSON_DEFINITION', 'FIRMWARE', 'BOOTLOADER'];
const PAGE_SIZE = 12;

const categoryLabel = (cat: ResourceCategory) => {
  if (cat === 'All') return 'All';
  if (cat === 'JSON_DEFINITION') return 'JSON';
  return cat;
};

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const formatBadge = (format: string) => {
  const base = 'bg-[#fbfbfb] dark:bg-[#1a1a1a] text-[#121212] dark:text-white border';
  const border = format === 'JSON'
    ? 'border-[#121212] dark:border-white'
    : format === 'UF2'
    ? 'border-[#121212] dark:border-white'
    : format === 'BIN'
    ? 'border-[#121212] dark:border-white'
    : 'border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)]';
  return `${base} ${border}`;
};

export default function ResourcesPage() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<ResourceCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const debouncedKeyword = useDebounce(searchQuery, 300);

  const filtered = useMemo(() => {
    let result = resources;

    if (activeCategory !== 'All') {
      result = result.filter((r) => r.category === activeCategory);
    }

    if (debouncedKeyword) {
      const kw = debouncedKeyword.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(kw) ||
          r.description.toLowerCase().includes(kw) ||
          r.keyboardModel.toLowerCase().includes(kw)
      );
    }

    return result;
  }, [activeCategory, debouncedKeyword]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  useEffect(() => {
    setPage(1);
  }, [activeCategory, debouncedKeyword]);

  const handleDownload = useCallback(async (url: string, name: string, format?: string) => {
    if (format === 'JSON') {
      try {
        const res = await fetch(url);
        const data = await res.text();
        const blob = new Blob([data], { type: 'application/json' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch {
        window.open(url, '_blank');
      }
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }, []);

  return (
    <div className="px-6 md:px-12 py-12 md:py-20">
      <div className="max-w-[120rem] mx-auto">
        <div className="mb-12">
          <h1
            className="text-[2.8rem] md:text-[3.6rem] text-[#121212] dark:text-white tracking-tight mb-4"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            {t('resources.title')}
          </h1>
          <p className="text-[1.6rem] text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)] max-w-2xl leading-relaxed">
            {t('resources.description')}
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex flex-wrap gap-2">
            {categoryOrder.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 text-[1.3rem] tracking-wide transition-colors duration-200 ${
                  activeCategory === cat
                    ? 'bg-[#121212] dark:bg-white text-white dark:text-[#121212]'
                    : 'border border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)] text-[#121212] dark:text-white hover:bg-[#fbfbfb] dark:hover:bg-[#1a1a1a]'
                }`}
              >
                {categoryLabel(cat)}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-[32rem]">
            <input
              type="text"
              placeholder={t('resources.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)] bg-white dark:bg-[#121212] px-4 py-3 pl-11 text-[1.5rem] text-[#121212] dark:text-white placeholder:text-[rgba(18,18,18,0.38)] dark:placeholder:text-[rgba(255,255,255,0.38)] focus:border-[#121212] dark:focus:border-white outline-none transition-colors"
            />
            <Search
              size={18}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(18,18,18,0.4)] dark:text-[rgba(255,255,255,0.4)]"
            />
          </div>
        </div>

        <p className="text-[1.3rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)] mb-6 uppercase tracking-wider">
          {t('resources.resultsCount', { count: total })}
        </p>

        {paginated.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-[1.6rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)]">
              {t('resources.noResults')}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {paginated.map((resource) => {
                const hasMultipleFiles = resource.files.length > 1;
                const isJson = resource.category === 'JSON_DEFINITION';

                return (
                  <div
                    key={resource.id}
                    className="border border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] p-6 flex flex-col hover:border-[rgba(18,18,18,0.3)] dark:hover:border-[rgba(255,255,255,0.3)] transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(resource.files.map((f) => f.format))).map((fmt) => (
                          <span
                            key={fmt}
                            className={`inline-flex items-center px-2 py-1 text-[1.1rem] uppercase tracking-wider ${formatBadge(
                              fmt
                            )}`}
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                      <span className="text-[1.2rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)] whitespace-nowrap">
                        {resource.files.length} file{resource.files.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <h3
                      className="text-[1.6rem] text-[#121212] dark:text-white mb-2"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      {resource.name}
                    </h3>

                    <p className="text-[1.4rem] text-[rgba(18,18,18,0.75)] dark:text-[rgba(255,255,255,0.75)] leading-relaxed mb-4 flex-1">
                      {resource.description}
                    </p>

                    <div className="pt-4 border-t border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)]">
                      <span className="text-[1.1rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)] uppercase tracking-wider">
                        {t('resources.model')}
                      </span>
                      <span className="text-[1.3rem] text-[#121212] dark:text-white ml-2">
                        {resource.keyboardModel}
                      </span>
                    </div>

                    <div className="mt-5">
                      {isJson && resource.files.length === 1 ? (
                        <div className="flex gap-2">
                          <a
                            href={resource.files[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center px-4 py-2 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.3rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200"
                          >
                            {t('resources.view')}
                          </a>
                          <button
                            onClick={() =>
                              handleDownload(
                                resource.files[0].url,
                                resource.name,
                                resource.files[0].format
                              )
                            }
                            className="flex-1 px-4 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200"
                          >
                            {t('resources.download')}
                          </button>
                        </div>
                      ) : hasMultipleFiles ? (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdownId(openDropdownId === resource.id ? null : resource.id)
                            }
                            className="w-full px-4 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200 flex items-center justify-center gap-2"
                          >
                            {t('resources.download')}
                            <ChevronDown size={12} strokeWidth={2} />
                          </button>

                          {openDropdownId === resource.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenDropdownId(null)}
                              />
                              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1a1a1a] border border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)] z-20 shadow-sm">
                                {resource.files.map((file, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      handleDownload(
                                        file.url,
                                        `${resource.name} (${file.mcu || file.format})`,
                                        file.format
                                      );
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-4 py-3 text-[1.3rem] text-[#121212] dark:text-white hover:bg-[#fbfbfb] dark:hover:bg-[#2a2a2a] transition-colors flex items-center justify-between"
                                  >
                                    <span>
                                      {file.mcu ? `${file.mcu} (${file.format})` : file.format} &mdash;{' '}
                                      {file.size}
                                    </span>
                                    <Download size={14} strokeWidth={2} />
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            handleDownload(
                              resource.files[0].url,
                              resource.name,
                              resource.files[0].format
                            )
                          }
                          className="w-full px-4 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200"
                        >
                          {t('resources.download')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-6 py-2 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.4rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('common.previous')}
                </button>
                <span className="text-[1.4rem] text-[#121212] dark:text-white">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-6 py-2 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.4rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
