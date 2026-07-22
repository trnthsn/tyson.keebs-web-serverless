import { AlertCircle, CheckCircle2, ChevronDown, Download, Usb } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { DetectedKeyboard, Resource } from './types';
import { firmwareFileLabel } from './resource-utils';

type KeyboardDetectPanelProps = {
  t: TFunction;
  detectedKeyboard: DetectedKeyboard | null;
  detectError: string | null;
  isDetecting: boolean;
  matchedDefinition: Resource | null;
  matchedFirmware: Resource | null;
  openDropdownId: string | null;
  onDetect: () => void;
  onDropdownChange: (id: string | null) => void;
  onDownload: (url: string, name: string, format?: string) => void;
};

export const KeyboardDetectPanel = ({
  t,
  detectedKeyboard,
  detectError,
  isDetecting,
  matchedDefinition,
  matchedFirmware,
  openDropdownId,
  onDetect,
  onDropdownChange,
  onDownload,
}: KeyboardDetectPanelProps) => {
  return (
    <div className="border-y border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] py-6 mb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Usb size={18} strokeWidth={1.5} className="text-[#121212] dark:text-white" />
            <h2 className="text-[1.6rem] text-[#121212] dark:text-white" style={{ fontFamily: "'Jost', sans-serif" }}>
              {t('resources.detectTitle')}
            </h2>
          </div>
          <p className="text-[1.4rem] text-[rgba(18,18,18,0.65)] dark:text-[rgba(255,255,255,0.65)] leading-relaxed">
            {t('resources.detectDescription')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={onDetect}
            disabled={isDetecting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait"
          >
            <Usb size={14} strokeWidth={1.7} />
            {isDetecting ? t('resources.detecting') : t('resources.detectButton')}
          </button>
        </div>
      </div>

      {detectedKeyboard ? (
        <div className="mt-5 border border-[rgba(18,18,18,0.1)] dark:border-[rgba(255,255,255,0.1)] p-4">
          {matchedDefinition ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} strokeWidth={1.7} className="mt-1 text-[#121212] dark:text-white" />
                <div>
                  <p className="text-[1.4rem] text-[#121212] dark:text-white">
                    {t('resources.definitionMatched', { name: matchedDefinition.keyboardModel })}
                  </p>
                  <p className="text-[1.2rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)] mt-1">
                    {detectedKeyboard.productName}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() =>
                    onDownload(
                      matchedDefinition.files[0].url,
                      matchedDefinition.name,
                      matchedDefinition.files[0].format
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.3rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200"
                >
                  <Download size={14} strokeWidth={1.7} />
                  {t('resources.downloadJsonConfig')}
                </button>

                {matchedFirmware ? (
                  matchedFirmware.files.length > 1 ? (
                    <div className="relative">
                      <button
                        onClick={() =>
                          onDropdownChange(
                            openDropdownId === `detected-${matchedFirmware.id}`
                              ? null
                              : `detected-${matchedFirmware.id}`
                          )
                        }
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200"
                      >
                        {t('resources.downloadFirmware')}
                        <ChevronDown size={12} strokeWidth={2} />
                      </button>

                      {openDropdownId === `detected-${matchedFirmware.id}` && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => onDropdownChange(null)} />
                          <div className="absolute left-0 right-0 top-full mt-1 min-w-[18rem] bg-white dark:bg-[#1a1a1a] border border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)] z-20 shadow-sm">
                            {matchedFirmware.files.map((file, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  onDownload(
                                    file.url,
                                    `${matchedFirmware.name} (${file.mcu || file.format})`,
                                    file.format
                                  );
                                  onDropdownChange(null);
                                }}
                                className="w-full text-left px-4 py-3 text-[1.3rem] text-[#121212] dark:text-white hover:bg-[#fbfbfb] dark:hover:bg-[#2a2a2a] transition-colors flex items-center justify-between gap-4"
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
                        onDownload(
                          matchedFirmware.files[0].url,
                          matchedFirmware.name,
                          matchedFirmware.files[0].format
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#121212] dark:bg-white text-white dark:text-[#121212] text-[1.3rem] tracking-wide hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition-colors duration-200"
                    >
                      <Download size={14} strokeWidth={1.7} />
                      {t('resources.downloadFirmware')}
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle size={18} strokeWidth={1.7} className="mt-1 text-[#121212] dark:text-white" />
              <div>
                <p className="text-[1.4rem] text-[rgba(18,18,18,0.65)] dark:text-[rgba(255,255,255,0.65)]">
                  {t('resources.noDetectedDefinition')}
                </p>
                <p className="text-[1.2rem] text-[rgba(18,18,18,0.55)] dark:text-[rgba(255,255,255,0.55)] mt-1">
                  {detectedKeyboard.productName}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {detectError ? (
        <p className="mt-4 text-[1.3rem] text-red-500">{detectError}</p>
      ) : null}
    </div>
  );
};
