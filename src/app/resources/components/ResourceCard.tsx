import { ChevronDown, Download } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { Resource } from './types';
import { firmwareFileLabel, formatBadge } from './resource-utils';

type ResourceCardProps = {
  t: TFunction;
  resource: Resource;
  openDropdownId: string | null;
  onDropdownChange: (id: string | null) => void;
  onDownload: (url: string, name: string, format?: string) => void;
};

export const ResourceCard = ({
  t,
  resource,
  openDropdownId,
  onDropdownChange,
  onDownload,
}: ResourceCardProps) => {
  const hasMultipleFiles = resource.files.length > 1;
  const isJson = resource.category === 'JSON_DEFINITION';

  return (
    <div className="border border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] p-6 flex flex-col hover:border-[rgba(18,18,18,0.3)] dark:hover:border-[rgba(255,255,255,0.3)] transition-colors duration-200">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-1">
          {Array.from(new Set(resource.files.map((file) => file.format))).map((format) => (
            <span
              key={format}
              className={`inline-flex items-center px-2 py-1 text-[1.1rem] uppercase tracking-wider ${formatBadge(
                format
              )}`}
            >
              {format}
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
                onDownload(resource.files[0].url, resource.name, resource.files[0].format)
              }
              className="flex-1 px-4 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200"
            >
              {t('resources.download')}
            </button>
          </div>
        ) : hasMultipleFiles ? (
          <div className="relative">
            <button
              onClick={() => onDropdownChange(openDropdownId === resource.id ? null : resource.id)}
              className="w-full px-4 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {t('resources.download')}
              <ChevronDown size={12} strokeWidth={2} />
            </button>

            {openDropdownId === resource.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => onDropdownChange(null)} />
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1a1a1a] border border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)] z-20 shadow-sm">
                  {resource.files.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onDownload(
                          file.url,
                          `${resource.name} (${file.mcu || file.format})`,
                          file.format
                        );
                        onDropdownChange(null);
                      }}
                      className="w-full text-left px-4 py-3 text-[1.3rem] text-[#121212] dark:text-white hover:bg-[#fbfbfb] dark:hover:bg-[#2a2a2a] transition-colors flex items-center justify-between"
                    >
                      <span>
                        {firmwareFileLabel(file)} &mdash; {file.size}
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
              onDownload(resource.files[0].url, resource.name, resource.files[0].format)
            }
            className="w-full px-4 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200"
          >
            {t('resources.download')}
          </button>
        )}
      </div>
    </div>
  );
};
