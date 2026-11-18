import React, { useMemo, useState } from 'react';
import {
  Camera,
  Pencil,
  Plus,
  Search,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  getFishCategory,
  type FishCategoryFilter,
} from '../data/seedCatalog';
import { t } from '../data/translations';
import type { FishItem, Language } from '../types';
import { speakPronunciation } from '../utils/speechAndDate';
import { ResilientFishImage } from './ResilientFishImage';

interface FishCatalogueScreenProps {
  lang: Language;
  fishList: FishItem[];
  onAddNew: () => void;
  onEditFish: (fish: FishItem) => void;
  onDeleteFish: (fishId: string) => void;
  onOpenPosterStudio: (fish: FishItem) => void;
}

interface CatalogueFishCardProps {
  fish: FishItem;
  lang: Language;
  onEditFish: (fish: FishItem) => void;
  onAskDelete: (fishId: string) => void;
  onOpenPosterStudio: (fish: FishItem) => void;
  eager?: boolean;
  highPriority?: boolean;
}

const CatalogueFishCard: React.FC<CatalogueFishCardProps> = React.memo(
  ({
    fish,
    lang,
    onEditFish,
    onAskDelete,
    onOpenPosterStudio,
    eager = false,
    highPriority = false,
  }) => {
    const photoSrc = fish.customActualPhotos[0]?.dataUrl || fish.referenceImage;
    return (
      <article className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] p-2 sm:p-3.5 border border-slate-200/75 dark:border-neutral-800 shadow-[0_4px_14px_-4px_rgba(8,45,89,0.08)] flex flex-col justify-between overflow-hidden min-w-0">
        <div className="min-w-0">
          <div className="relative w-full aspect-[3/4] min-h-[140px] rounded-xl sm:rounded-2xl bg-[#eff4ff] dark:bg-black overflow-hidden flex items-center justify-center">
            <ResilientFishImage
              src={photoSrc}
              fallbackSrc={fish.referenceImage}
              alt={`${fish.nameMl} (${fish.pronunciationLatin})`}
              fallbackLabel={fish.nameMl}
              eager={eager}
              highPriority={highPriority}
            />
            {fish.referenceNumber !== null && (
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#0a1f3d]/85 text-white text-[10px] font-extrabold tabular-nums">
                #{String(fish.referenceNumber).padStart(2, '0')}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-1 text-[11px] sm:text-xs text-[#43474f] dark:text-neutral-400">
            <span>
              {t(lang, 'saved_photos_count')}:{' '}
              <strong className="tabular-nums text-[#082d59] dark:text-neutral-200">
                {fish.customActualPhotos.length}
              </strong>
            </span>
          </div>

          <div className="mt-1 flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] sm:text-lg font-extrabold text-[#082d59] dark:text-white leading-snug break-words">
                {fish.nameMl}
              </h3>
              <p className="text-xs sm:text-sm text-[#43474f] dark:text-neutral-400 leading-snug break-words mt-0.5 font-medium">
                {fish.pronunciationLatin}
              </p>
              {fish.nameEn && (
                <p className="text-[11px] sm:text-xs text-[#43474f] dark:text-neutral-400 mt-0.5 leading-snug break-words">
                  {fish.nameEn}
                </p>
              )}
              {fish.scientificName && (
                <p className="text-[11px] italic text-slate-500 dark:text-neutral-400 mt-0.5 leading-snug break-words">
                  {fish.scientificName}
                  {fish.family ? ` · ${fish.family}` : ''}
                </p>
              )}
              {fish.seafoodClass && fish.seafoodClass !== 'finfish' && (
                <p className="text-[11px] font-semibold text-[#0d9488] dark:text-sky-400 mt-0.5 leading-snug break-words">
                  {t(lang, `class_${fish.seafoodClass}` as 'class_crustacean')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => speakPronunciation(fish.pronunciationLatin)}
              className="min-w-[40px] min-h-[40px] rounded-full text-[#0d9488] dark:text-teal-300 hover:bg-[#eff4ff] dark:hover:bg-neutral-900 flex items-center justify-center shrink-0"
              aria-label={`${t(lang, 'listen_pronunciation')}: ${fish.pronunciationLatin}`}
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {fish.speciesNote && (
            <p className="mt-1.5 text-[11px] sm:text-xs text-[#43474f] dark:text-neutral-400 leading-snug break-words">
              {fish.speciesNote}
            </p>
          )}
        </div>

        <div className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2">
          <button
            type="button"
            onClick={() => onOpenPosterStudio(fish)}
            className="w-full min-h-[42px] px-2 py-2 rounded-full bg-[#f0f9ff] dark:bg-sky-950/60 text-[#082d59] dark:text-sky-200 border border-sky-200/80 dark:border-sky-800 font-bold text-[11px] min-[380px]:text-xs flex items-center justify-center gap-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/60 leading-snug text-center"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#0d9488] dark:text-sky-400" />
            <span className="break-words">{t(lang, 'photo_poster')}</span>
          </button>

          <div className="flex gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onEditFish(fish)}
              className="flex-1 min-w-0 min-h-[42px] px-2 py-2 rounded-full bg-[#eff4ff] dark:bg-neutral-900 text-[#082d59] dark:text-neutral-200 border border-transparent dark:border-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#dce9ff] dark:hover:bg-neutral-800 leading-snug text-center"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span className="break-words">{t(lang, 'edit')}</span>
            </button>
            <button
              type="button"
              onClick={() => onAskDelete(fish.id)}
              className="min-w-[42px] min-h-[42px] px-2.5 py-2 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold text-sm flex items-center justify-center gap-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 shrink-0"
              aria-label={`${t(lang, 'delete')} ${fish.nameMl}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </article>
    );
  }
);

export const FishCatalogueScreen: React.FC<FishCatalogueScreenProps> = ({
  lang,
  fishList,
  onAddNew,
  onEditFish,
  onDeleteFish,
  onOpenPosterStudio,
}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FishCategoryFilter>(
    'all'
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const catCounts = useMemo(() => {
    let sea = 0;
    let backwater = 0;
    let shellfish = 0;
    for (const f of fishList) {
      const cat = getFishCategory(f);
      if (cat === 'sea') sea++;
      else if (cat === 'backwater') backwater++;
      else shellfish++;
    }
    return { sea, backwater, shellfish };
  }, [fishList]);

  // Preserve exact stored photo & #01-#32 sequence without shuffling
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fishList.filter((f) => {
      if (categoryFilter !== 'all' && getFishCategory(f) !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const refNum =
        f.referenceNumber !== null
          ? `#${String(f.referenceNumber).padStart(2, '0')} #${f.referenceNumber}`
          : '';
      return (
        f.nameMl.toLowerCase().includes(q) ||
        f.pronunciationLatin.toLowerCase().includes(q) ||
        (f.nameEn && f.nameEn.toLowerCase().includes(q)) ||
        (f.scientificName && f.scientificName.toLowerCase().includes(q)) ||
        (f.family && f.family.toLowerCase().includes(q)) ||
        (f.seafoodClass && f.seafoodClass.toLowerCase().includes(q)) ||
        (f.aliasesMl && f.aliasesMl.some((a) => a.toLowerCase().includes(q))) ||
        (refNum && refNum.includes(q))
      );
    });
  }, [fishList, query, categoryFilter]);

  return (
    <div className="space-y-3.5 pb-24">
      <section className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 shadow-[0_2px_14px_-4px_rgba(8,45,89,0.08)] border border-slate-200/70 dark:border-neutral-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#082d59] dark:text-sky-300 leading-snug break-words min-w-0">
            {t(lang, 'fish_catalogue_title')} ({fishList.length})
          </h2>
          <button
            type="button"
            onClick={onAddNew}
            className="min-h-[44px] px-4 py-2 rounded-full bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.98] transition leading-snug text-center"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{t(lang, 'add_fish')}</span>
          </button>
        </div>

        <div className="flex items-center w-full bg-[#eff4ff] dark:bg-black rounded-full border border-slate-200/70 dark:border-neutral-800 pl-3.5 pr-1.5 gap-2 focus-within:bg-white dark:focus-within:bg-[#0a0a0a]">
          <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, 'search')}
            aria-label={t(lang, 'search')}
            className="flex-1 min-w-0 h-11 bg-transparent text-sm text-[#0b1c30] dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t(lang, 'clear_search')}
              className="w-8 h-8 rounded-full text-slate-500 dark:text-neutral-400 hover:bg-[#dce9ff] dark:hover:bg-neutral-800 flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {(
            [
              ['all', t(lang, 'cat_all'), fishList.length],
              ['sea', t(lang, 'cat_sea'), catCounts.sea],
              ['backwater', t(lang, 'cat_backwater'), catCounts.backwater],
              ['shellfish', t(lang, 'cat_shellfish'), catCounts.shellfish],
            ] as const
          ).map(([catKey, catLabel, catCount]) => {
            const active = categoryFilter === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setCategoryFilter(catKey)}
                className={`min-h-[34px] shrink-0 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition tabular-nums ${
                  active
                    ? 'bg-[#082d59] dark:bg-[#0879d9] text-white'
                    : 'bg-[#eff4ff] dark:bg-neutral-900 text-[#43474f] dark:text-neutral-300'
                }`}
              >
                <span>{catLabel}</span>
                <span className="opacity-80 text-[10px]">{catCount}</span>
              </button>
            );
          })}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-8 text-center border border-slate-200/80 dark:border-neutral-800">
          <p className="text-base text-[#43474f] dark:text-neutral-400 leading-relaxed">
            {t(lang, 'no_search_results')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {filtered.map((fish, idx) => (
            <CatalogueFishCard
              key={fish.id}
              fish={fish}
              lang={lang}
              onEditFish={onEditFish}
              onAskDelete={setConfirmDeleteId}
              onOpenPosterStudio={onOpenPosterStudio}
              eager={idx < 6}
              highPriority={idx < 4}
            />
          ))}
        </div>
      )}

      {/* Friendly Confirmation Dialog */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 p-6 shadow-2xl space-y-4 pb-safe">
            <h3 className="text-lg font-bold text-[#082d59] dark:text-white leading-snug break-words">
              {t(lang, 'confirm_delete')}
            </h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-full bg-[#eff4ff] dark:bg-neutral-900 text-[#082d59] dark:text-neutral-200 font-bold leading-snug text-center"
              >
                {t(lang, 'cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteFish(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-full bg-rose-600 text-white font-bold leading-snug text-center"
              >
                {t(lang, 'delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
