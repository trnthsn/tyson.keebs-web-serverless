import { Search } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { ResourceCategory } from './types';
import { categoryLabel, categoryOrder } from './resource-utils';

type ResourceFiltersProps = {
  t: TFunction;
  activeCategory: ResourceCategory;
  searchQuery: string;
  onCategoryChange: (category: ResourceCategory) => void;
  onSearchChange: (query: string) => void;
};

export function ResourceFilters({
  t,
  activeCategory,
  searchQuery,
  onCategoryChange,
  onSearchChange,
}: ResourceFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
      <div className="flex flex-wrap gap-2">
        {categoryOrder.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-5 py-2 text-[1.3rem] tracking-wide transition-colors duration-200 ${
              activeCategory === category
                ? 'bg-[#121212] dark:bg-white text-white dark:text-[#121212]'
                : 'border border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)] text-[#121212] dark:text-white hover:bg-[#fbfbfb] dark:hover:bg-[#1a1a1a]'
            }`}
          >
            {categoryLabel(category)}
          </button>
        ))}
      </div>

      <div className="relative w-full md:w-[32rem]">
        <input
          type="text"
          placeholder={t('resources.searchPlaceholder')}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full border border-[rgba(18,18,18,0.2)] dark:border-[rgba(255,255,255,0.2)] bg-white dark:bg-[#121212] px-4 py-3 pl-11 text-[1.5rem] text-[#121212] dark:text-white placeholder:text-[rgba(18,18,18,0.38)] dark:placeholder:text-[rgba(255,255,255,0.38)] focus:border-[#121212] dark:focus:border-white outline-none transition-colors"
        />
        <Search
          size={18}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(18,18,18,0.4)] dark:text-[rgba(255,255,255,0.4)]"
        />
      </div>
    </div>
  );
}
