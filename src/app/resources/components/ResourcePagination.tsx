import type { TFunction } from 'i18next';

type ResourcePaginationProps = {
  t: TFunction;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function ResourcePagination({ t, page, totalPages, onPageChange }: ResourcePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-12">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="px-6 py-2 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.4rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {t('common.previous')}
      </button>
      <span className="text-[1.4rem] text-[#121212] dark:text-white">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="px-6 py-2 border border-[#121212] dark:border-white text-[#121212] dark:text-white text-[1.4rem] tracking-wide hover:bg-[#121212] hover:text-white dark:hover:bg-white dark:hover:text-[#121212] transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {t('common.next')}
      </button>
    </div>
  );
}
