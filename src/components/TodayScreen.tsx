import React, { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Share2,
  Tag,
  Volume2,
  X,
} from 'lucide-react';
import { t } from '../data/translations';
import type {
  DailyFishEntry,
  DailyRecord,
  FishItem,
  Language,
  PriceUnit,
} from '../types';
import { formatDisplayDate, speakPronunciation } from '../utils/speechAndDate';

interface TodayScreenProps {
  lang: Language;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  onToggleAvailability: (fishId: string) => void;
  onToggleIncludePrices: (include: boolean) => void;
  onUpdateEntry: (fishId: string, patch: Partial<DailyFishEntry>) => void;
  onOpenPosterStudio: (fish: FishItem) => void;
  onOpenShareList: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  lang,
  fishList,
  dailyRecord,
  onToggleAvailability,
  onToggleIncludePrices,
  onUpdateEntry,
  onOpenPosterStudio,
  onOpenShareList,
}) => {
  const [filter, setFilter] = useState<'all' | 'available'>('all');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const availableCount = useMemo(
    () => fishList.filter((f) => dailyRecord.entries[f.id]?.available).length,
    [fishList, dailyRecord.entries]
  );

  const displayedFish = useMemo(
    () =>
      filter === 'available'
        ? fishList.filter((f) => dailyRecord.entries[f.id]?.available)
        : fishList,
    [filter, fishList, dailyRecord.entries]
  );

  const toggleNoteDrawer = (fishId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [fishId]: !prev[fishId] }));
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Compact daily header & quick controls */}
      <section className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 shadow-xs border border-slate-200/80 dark:border-neutral-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-[#082d59] dark:text-sky-300 leading-snug">
              {t(lang, 'today_fish')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{formatDisplayDate(dailyRecord.dateKey, lang)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#082d59] dark:text-sky-300 tabular-nums">
                {t(lang, 'available_count')}: {availableCount}
              </span>
            </p>
          </div>

          {/* Interactive filter segmented control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-transparent dark:border-neutral-800 max-w-full">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-[#082d59] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'filter_all')} ({fishList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                filter === 'available'
                  ? 'bg-[#0879d9] text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'filter_available')} ({availableCount})
            </button>
          </div>
        </div>

        {/* Optional Price Toggle (OFF by default) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400">
            {t(lang, 'tap_to_select')}
          </p>
          <button
            type="button"
            onClick={() => onToggleIncludePrices(!dailyRecord.includePrices)}
            aria-pressed={dailyRecord.includePrices}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border transition max-w-full leading-snug text-left ${
              dailyRecord.includePrices
                ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                : 'bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0" />
            <span className="break-words">{t(lang, 'include_prices')}</span>
            <span className="font-bold shrink-0">
              {dailyRecord.includePrices ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </section>

      {/* Fish Cards Grid */}
      {displayedFish.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-8 text-center border border-slate-200/80 dark:border-neutral-800 space-y-3">
          <p className="text-base font-semibold text-slate-700 dark:text-neutral-300">
            {t(lang, 'no_fish')}
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0879d9] text-white font-semibold text-sm"
          >
            {t(lang, 'filter_all')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {displayedFish.map((fish) => {
            const entry = dailyRecord.entries[fish.id];
            const isAvailable = !!entry?.available;
            const hasTodayPhoto = !!(
              entry?.todayPosterDataUrl || entry?.todayPhotoDataUrl
            );
            const fallbackCustom = fish.customActualPhotos[0]?.dataUrl;
            const cardImageSrc =
              entry?.todayPosterDataUrl ||
              entry?.todayPhotoDataUrl ||
              fallbackCustom ||
              fish.referenceImage;

            const isReferenceShown =
              !hasTodayPhoto && !fallbackCustom && !!fish.referenceImage;
            const showDetailsDrawer =
              isAvailable && (dailyRecord.includePrices || expandedNotes[fish.id]);

            return (
              <article
                key={fish.id}
                className={`rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 transition-colors duration-150 border-2 flex flex-col justify-between overflow-hidden min-w-0 ${
                  isAvailable
                    ? 'bg-emerald-50/95 dark:bg-emerald-950/70 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/25 dark:ring-emerald-400/30 shadow-md'
                    : 'bg-white dark:bg-[#0a0a0a] border-slate-200/80 dark:border-neutral-800 shadow-xs'
                }`}
              >
                <div className="min-w-0">
                  {/* Image tap target to toggle availability */}
                  <button
                    type="button"
                    onClick={() => onToggleAvailability(fish.id)}
                    className="w-full text-left group focus-visible:outline-none"
                    aria-pressed={isAvailable}
                    aria-label={`${fish.nameMl} (${fish.pronunciationLatin}) — ${
                      isAvailable ? t(lang, 'available') : t(lang, 'sold_out')
                    }`}
                  >
                    <div
                      className={`relative w-full aspect-[3/4] rounded-xl sm:rounded-2xl border overflow-hidden flex items-center justify-center transition-colors duration-150 ${
                        isAvailable
                          ? 'bg-white dark:bg-black border-emerald-400/70 dark:border-emerald-500/70'
                          : 'bg-slate-100 dark:bg-black border-transparent dark:border-neutral-900'
                      }`}
                    >
                      {cardImageSrc ? (
                        <img
                          src={cardImageSrc}
                          alt={`${fish.nameMl} (${fish.pronunciationLatin})`}
                          className={`w-full h-full object-contain transition-transform duration-150 ${
                            isAvailable ? 'scale-[1.01]' : ''
                          }`}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="p-3 text-center text-slate-600 dark:text-neutral-300 text-xs font-semibold">
                          {fish.nameMl}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Quiet unboxed metadata line */}
                  <div
                    className={`mt-2 flex flex-wrap items-center justify-between gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs ${
                      isAvailable
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-slate-600 dark:text-neutral-300'
                    }`}
                  >
                    <span className="leading-snug break-words">
                      {isReferenceShown
                        ? t(lang, 'reference_badge')
                        : t(lang, 'actual_photo_badge')}
                    </span>
                    {fish.referenceNumber !== null && (
                      <span className="tabular-nums font-medium shrink-0">
                        #{String(fish.referenceNumber).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* Malayalam name (always kept in Malayalam) + Pronunciation + Speaker */}
                  <div className="mt-1.5 flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-[15px] sm:text-lg font-bold leading-snug break-words ${
                          isAvailable
                            ? 'text-emerald-950 dark:text-white'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {fish.nameMl}
                      </h3>
                      <p
                        className={`text-xs sm:text-sm leading-snug break-words mt-0.5 ${
                          isAvailable
                            ? 'text-emerald-800/90 dark:text-emerald-200/90'
                            : 'text-slate-700 dark:text-neutral-300'
                        }`}
                      >
                        {fish.pronunciationLatin}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakPronunciation(fish.pronunciationLatin)}
                      className={`min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition ${
                        isAvailable
                          ? 'text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                          : 'text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-[#082d59] dark:hover:text-sky-300'
                      }`}
                      aria-label={`${t(lang, 'listen_pronunciation')}: ${fish.pronunciationLatin}`}
                      title={t(lang, 'listen_pronunciation')}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Large Simple Availability Button + Photo/Poster Action */}
                <div className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2">
                  <button
                    type="button"
                    onClick={() => onToggleAvailability(fish.id)}
                    aria-pressed={isAvailable}
                    className={`w-full min-h-[44px] sm:min-h-[48px] px-2 py-2 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-base flex items-center justify-center gap-1.5 transition active:scale-[0.98] leading-snug text-center ${
                      isAvailable
                        ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                        : 'bg-slate-100 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800'
                    }`}
                  >
                    {isAvailable ? (
                      <>
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 stroke-[2.5]" />
                        <span className="break-words">{t(lang, 'available')}</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 shrink-0 text-slate-500 dark:text-neutral-400" />
                        <span className="break-words">{t(lang, 'sold_out')}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPosterStudio(fish)}
                    className="w-full min-h-[42px] sm:min-h-[44px] px-2 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#082d59] dark:text-sky-200 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 font-semibold text-[11px] min-[380px]:text-xs sm:text-sm flex items-center justify-center gap-1.5 leading-snug text-center"
                  >
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#0879d9] dark:text-sky-400" />
                    <span className="break-words">{t(lang, 'photo_poster')}</span>
                  </button>

                  {isAvailable && !dailyRecord.includePrices && (
                    <button
                      type="button"
                      onClick={() => toggleNoteDrawer(fish.id)}
                      className="w-full min-h-[38px] sm:min-h-[40px] px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 leading-snug text-center"
                      aria-expanded={!!expandedNotes[fish.id]}
                    >
                      <span className="break-words">{t(lang, 'quick_note_label')}</span>
                      {expandedNotes[fish.id] ? (
                        <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      )}
                    </button>
                  )}

                  {/* Optional Note & Price Drawer (Price inputs strictly hidden when includePrices is OFF) */}
                  {showDetailsDrawer && (
                    <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                          {t(lang, 'quick_note_label')}
                        </label>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {(['note_big', 'note_small', 'note_1kg'] as const).map(
                            (noteKey) => {
                              const label = t(lang, noteKey);
                              const active = entry?.note === label;
                              return (
                                <button
                                  key={noteKey}
                                  type="button"
                                  onClick={() =>
                                    onUpdateEntry(fish.id, {
                                      note: active ? '' : label,
                                    })
                                  }
                                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                                    active
                                      ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                                      : 'bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-800'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            }
                          )}
                        </div>
                        <input
                          type="text"
                          value={entry?.note || ''}
                          onChange={(e) =>
                            onUpdateEntry(fish.id, { note: e.target.value })
                          }
                          placeholder={t(lang, 'custom_note_placeholder')}
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:bg-white dark:focus:bg-neutral-950"
                        />
                      </div>

                      {dailyRecord.includePrices && (
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400">
                            {t(lang, 'price_optional')}
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              value={entry?.priceAmount || ''}
                              onChange={(e) =>
                                onUpdateEntry(fish.id, {
                                  priceAmount: e.target.value,
                                })
                              }
                              placeholder={t(lang, 'price_amount_placeholder')}
                              className="w-full min-h-[42px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-sm font-semibold tabular-nums text-slate-900 dark:text-white bg-slate-50 dark:bg-black focus:bg-white dark:focus:bg-neutral-950"
                            />
                            <select
                              value={entry?.priceUnit || 'per_kg'}
                              onChange={(e) =>
                                onUpdateEntry(fish.id, {
                                  priceUnit: e.target.value as PriceUnit,
                                })
                              }
                              className="w-full min-h-[42px] px-2 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-white bg-slate-50 dark:bg-black"
                              aria-label={t(lang, 'price')}
                            >
                              <option value="per_kg">{t(lang, 'per_kg')}</option>
                              <option value="per_piece">
                                {t(lang, 'per_piece')}
                              </option>
                              <option value="per_packet">
                                {t(lang, 'per_packet')}
                              </option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Primary Thumb-Zone CTA: Share Today's List */}
      <div className="sticky bottom-20 md:bottom-4 z-20 pt-2">
        <button
          type="button"
          onClick={onOpenShareList}
          className="w-full min-h-[54px] px-5 py-3.5 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] active:scale-[0.99] transition"
        >
          <Share2 className="w-5 h-5 shrink-0 text-[#facc15]" />
          <span>
            {t(lang, 'share_today')}
            {availableCount > 0 ? ` (${availableCount})` : ''}
          </span>
        </button>
      </div>
    </div>
  );
};
