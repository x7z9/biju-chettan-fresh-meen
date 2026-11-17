import React, { useMemo, useState } from 'react';
import { Search, Volume2, X } from 'lucide-react';
import { t } from '../data/translations';
import type { FishItem, Language } from '../types';
import { speakPronunciation } from '../utils/speechAndDate';

interface GlossaryModalProps {
  lang: Language;
  fishList: FishItem[];
  onClose: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
  lang,
  fishList,
  onClose,
}) => {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const clean = q.trim().toLowerCase();
    if (!clean) return fishList;
    return fishList.filter(
      (f) =>
        f.nameMl.toLowerCase().includes(clean) ||
        f.pronunciationLatin.toLowerCase().includes(clean) ||
        (f.nameEn && f.nameEn.toLowerCase().includes(clean)) ||
        (f.scientificName && f.scientificName.toLowerCase().includes(clean)) ||
        (f.aliasesMl && f.aliasesMl.some((a) => a.toLowerCase().includes(clean)))
    );
  }, [fishList, q]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-modal-title"
    >
      <div className="w-full sm:max-w-xl max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 shadow-2xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
          <h2
            id="glossary-modal-title"
            className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug"
          >
            {t(lang, 'glossary_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-900 flex items-center justify-center shrink-0"
            aria-label={t(lang, 'close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(lang, 'search')}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-2.5">
          {filtered.map((fish) => (
            <div
              key={fish.id}
              className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3 flex items-start justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  {fish.referenceNumber !== null && (
                    <span className="text-xs font-bold tabular-nums text-slate-500">
                      #{String(fish.referenceNumber).padStart(2, '0')}
                    </span>
                  )}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {fish.nameMl}
                  </h3>
                  <span className="text-xs font-medium text-slate-600 dark:text-neutral-400">
                    ({fish.pronunciationLatin})
                  </span>
                </div>
                {fish.nameEn && (
                  <p className="text-xs text-slate-700 dark:text-neutral-300 mt-0.5">
                    {fish.nameEn}
                  </p>
                )}
                {fish.aliasesMl && fish.aliasesMl.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {fish.aliasesMl.join(' · ')}
                  </p>
                )}
                {fish.scientificName && (
                  <p className="text-[11px] italic text-slate-500 dark:text-neutral-400 mt-0.5">
                    {fish.scientificName}
                    {fish.identificationConfidence === 'confirmed'
                      ? ' · Verified'
                      : fish.identificationConfidence === 'needs_local_confirmation'
                        ? ' · Confirm local catch'
                        : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => speakPronunciation(fish.pronunciationLatin)}
                aria-label={t(lang, 'listen_pronunciation')}
                className="min-w-[40px] min-h-[40px] rounded-xl text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 flex items-center justify-center shrink-0"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
