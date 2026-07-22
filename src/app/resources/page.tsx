'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import resourcesData from '@/data/resources.json';
import { KeyboardDetectPanel } from './components/KeyboardDetectPanel';
import { ResourceCard } from './components/ResourceCard';
import { ResourceFilters } from './components/ResourceFilters';
import { ResourcePagination } from './components/ResourcePagination';
import type { DetectedKeyboard, Resource, ResourceCategory } from './components/types';
import {
  computeVendorProductId,
  getHid,
  resolveKeyboardModelFromName,
} from './components/resource-utils';

const PAGE_SIZE = 12;
const resources = resourcesData as Resource[];

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const ResourcesPage = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<ResourceCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [detectedKeyboard, setDetectedKeyboard] = useState<DetectedKeyboard | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const debouncedKeyword = useDebounce(searchQuery, 300);

  const matchedDefinitions = useMemo(
    () =>
      detectedKeyboard
        ? resources.filter(
            (resource) =>
              resource.category === 'JSON_DEFINITION' &&
              resource.vendorProductId === detectedKeyboard.vendorProductId
          )
        : [],
    [detectedKeyboard]
  );

  const resolvedKeyboardModel = useMemo(
    () =>
      detectedKeyboard
        ? resolveKeyboardModelFromName(detectedKeyboard.productName, matchedDefinitions, resources)
        : null,
    [detectedKeyboard, matchedDefinitions]
  );

  const matchedDefinition = useMemo(
    () =>
      resolvedKeyboardModel
        ? matchedDefinitions.find(
            (resource) =>
              resource.keyboardModel.toLowerCase() === resolvedKeyboardModel.toLowerCase()
          ) ?? matchedDefinitions[0] ?? null
        : null,
    [matchedDefinitions, resolvedKeyboardModel]
  );

  const matchedFirmware = useMemo(
    () =>
      resolvedKeyboardModel
        ? resources.find(
            (resource) =>
              resource.category === 'FIRMWARE' &&
              resource.keyboardModel.toLowerCase() === resolvedKeyboardModel.toLowerCase()
          ) ?? null
        : null,
    [resolvedKeyboardModel]
  );

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

  const detectKeyboard = useCallback(async () => {
    const hid = getHid();

    if (!hid) {
      setDetectError(t('resources.detectUnsupported'));
      return;
    }

    setIsDetecting(true);
    setDetectError(null);

    try {
      const [device] = await hid.requestDevice({
        filters: [{ usagePage: 0xff60, usage: 0x61 }],
      });

      if (!device) {
        setIsDetecting(false);
        return;
      }

      const detected = {
        vendorId: device.vendorId,
        productId: device.productId,
        productName: device.productName || t('resources.detectedKeyboard'),
        vendorProductId: computeVendorProductId(device.vendorId, device.productId),
      };

      setDetectedKeyboard(detected);
    } catch (err: unknown) {
      setDetectError(err instanceof Error ? err.message : t('resources.detectFailed'));
    } finally {
      setIsDetecting(false);
    }
  }, [t]);

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

        <KeyboardDetectPanel
          t={t}
          detectedKeyboard={detectedKeyboard}
          detectError={detectError}
          isDetecting={isDetecting}
          matchedDefinition={matchedDefinition}
          matchedFirmware={matchedFirmware}
          openDropdownId={openDropdownId}
          onDetect={detectKeyboard}
          onDropdownChange={setOpenDropdownId}
          onDownload={handleDownload}
        />

        <ResourceFilters
          t={t}
          activeCategory={activeCategory}
          searchQuery={searchQuery}
          onCategoryChange={(category) => {
            setActiveCategory(category);
            setPage(1);
          }}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setPage(1);
          }}
        />

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
              {paginated.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  t={t}
                  resource={resource}
                  openDropdownId={openDropdownId}
                  onDropdownChange={setOpenDropdownId}
                  onDownload={handleDownload}
                />
              ))}
            </div>

            <ResourcePagination t={t} page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
};

export default ResourcesPage;
