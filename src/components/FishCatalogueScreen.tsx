import React, { useMemo, useState } from 'react';
import {
  Camera,
  Pencil,
  Plus,
  Search,
  Trash2,
  Volume2,
} from 'lucide-react';
import { t } from '../data/translations';
import type { FishItem, Language } from '../types';
import { speakPronunciation } from '../utils/speechAndDate';

interface FishCatalogueScreenProps {
  lang: Language;
  fishList: FishItem[];
  onAddNew: () => void;
  onEditFish: (fish: FishItem) => void;
  onDeleteFish: (fishId: string) => void;
  onOpenPosterStudio: (fish: FishItem) => void;
}

export const FishCatalogueScreen: React.FC<FishCatalogueScreenProps> = ({
  lang,
  fishList,
  onAddNew,
  onEditFish,
  onDeleteFish,
  onOpenPosterStudio,
}) => {
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fishList;
    return fishList.filter(
      (f) =>
        f.nameMl.toLowerCase().includes(q) ||
        f.pronunciationLatin.toLowerCase().includes(q) ||
        (f.nameEn && f.nameEn.toLowerCase().includes(q)) ||
        (f.scientificName && f.scientificName.toLowerCase().includes(q)) ||
        (f.family && f.family.toLowerCase().includes(q)) ||
        (f.seafoodClass && f.seafoodClass.toLowerCase().includes(q)) ||
        (f.aliasesMl && f.aliasesMl.some((a) => a.toLowerCase().includes(q)))
    );
  }, [fishList, query]);

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 shadow-xs border border-slate-200/80 dark:border-neutral-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words min-w-0">
            {t(lang, 'fish_catalogue_title')} ({fishList.length})
          </h2>
          <button
            type="button"
            onClick={onAddNew}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#0879d9] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs hover:bg-[#0667ba] active:scale-[0.98] transition leading-snug text-center"
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span>{t(lang, 'add_fish')}</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, 'search')}
            aria-label={t(lang, 'search')}
            className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#0a0a0a]"
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-8 text-center border border-slate-200/80 dark:border-neutral-800">
          <p className="text-base text-slate-600 dark:text-neutral-400 leading-relaxed">{t(lang, 'no_search_results')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {filtered.map((fish) => {
            const photoSrc =
              fish.customActualPhotos[0]?.dataUrl || fish.referenceImage;
            return (
              <article
                key={fish.id}
                className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] p-2.5 sm:p-3.5 border border-slate-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between overflow-hidden min-w-0"
              >
                <div className="min-w-0">
                  <div className="w-full aspect-[3/4] rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-black border border-slate-200/60 dark:border-neutral-800 overflow-hidden flex items-center justify-center">
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={`${fish.nameMl} (${fish.pronunciationLatin})`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-sm text-slate-400 dark:text-neutral-500 p-3 text-center break-words">
                        {fish.nameMl}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 sm:mt-2.5 flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                        {fish.nameMl}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-snug break-words mt-0.5">
                        {fish.pronunciationLatin}
                      </p>
                      {fish.nameEn && (
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 mt-0.5 leading-snug break-words">
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
                        <p className="text-[11px] font-semibold text-[#0879d9] dark:text-sky-400 mt-0.5 leading-snug break-words">
                          {t(lang, `class_${fish.seafoodClass}` as 'class_crustacean')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => speakPronunciation(fish.pronunciationLatin)}
                      className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-xl text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-900 flex items-center justify-center shrink-0"
                      aria-label={`${t(lang, 'listen_pronunciation')}: ${fish.pronunciationLatin}`}
                    >
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="mt-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 flex flex-wrap gap-x-1.5 gap-y-0.5 leading-snug">
                    <span>
                      {t(lang, 'saved_photos_count')}:{' '}
                      <strong className="tabular-nums text-slate-700 dark:text-neutral-200">
                        {fish.customActualPhotos.length}
                      </strong>
                    </span>
                    {fish.speciesNote && (
                      <span className="break-words">· {fish.speciesNote}</span>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2">
                  <button
                    type="button"
                    onClick={() => onOpenPosterStudio(fish)}
                    className="w-full min-h-[42px] sm:min-h-[44px] px-2 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#082d59] dark:text-sky-200 border border-sky-200 dark:border-sky-800 font-semibold text-[11px] min-[380px]:text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/60 leading-snug text-center"
                  >
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#0879d9] dark:text-sky-400" />
                    <span className="break-words">{t(lang, 'photo_poster')}</span>
                  </button>

                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => onEditFish(fish)}
                      className="flex-1 min-w-0 min-h-[42px] sm:min-h-[44px] px-2 py-2 rounded-xl bg-slate-100 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border border-transparent dark:border-neutral-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-neutral-800 leading-snug text-center"
                    >
                      <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="break-words">{t(lang, 'edit')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(fish.id)}
                      className="min-w-[40px] sm:min-w-[44px] min-h-[42px] sm:min-h-[44px] px-2.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold text-sm flex items-center justify-center gap-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 shrink-0"
                      aria-label={`${t(lang, 'delete')} ${fish.nameMl}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Friendly Confirmation Dialog (No window.confirm) */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 p-6 shadow-2xl space-y-4 pb-safe">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
              {t(lang, 'confirm_delete')}
            </h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border border-transparent dark:border-neutral-800 font-semibold leading-snug text-center"
              >
                {t(lang, 'cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteFish(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-2xl bg-rose-600 text-white font-semibold leading-snug text-center"
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
