import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Share2,
  Sparkles,
  Tag,
  Volume2,
  X,
} from 'lucide-react';
import { t } from '../data/translations';
import type {
  BusinessSettings,
  DailyFishEntry,
  DailyRecord,
  FishItem,
  Language,
  PriceUnit,
  TrashFishItem,
} from '../types';
import {
  runUniversalOfflineSearch,
  type SearchActionTarget,
} from '../utils/offlineSearch';
import { formatDisplayDate, speakPronunciation } from '../utils/speechAndDate';

interface TodayScreenProps {
  lang: Language;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  allDailyRecords: DailyRecord[];
  trashList: TrashFishItem[];
  settings: BusinessSettings;
  onToggleAvailability: (fishId: string) => void;
  onToggleIncludePrices: (include: boolean) => void;
  onUpdateEntry: (fishId: string, patch: Partial<DailyFishEntry>) => void;
  onOpenPosterStudio: (fish: FishItem) => void;
  onOpenShareList: () => void;
  onNavigateFromSearch: (target: SearchActionTarget) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  lang,
  fishList,
  dailyRecord,
  allDailyRecords,
  trashList,
  settings,
  onToggleAvailability,
  onToggleIncludePrices,
  onUpdateEntry,
  onOpenPosterStudio,
  onOpenShareList,
  onNavigateFromSearch,
}) => {
  const [filter, setFilter] = useState<'all' | 'available'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const availableCount = useMemo(
    () => fishList.filter((f) => dailyRecord.entries[f.id]?.available).length,
    [fishList, dailyRecord.entries]
  );

  const searchOutput = useMemo(
    () =>
      runUniversalOfflineSearch({
        query: searchQuery,
        fishList,
        dailyRecord,
        allDailyRecords,
        trashList,
        settings,
        lang,
      }),
    [searchQuery, fishList, dailyRecord, allDailyRecords, trashList, settings, lang]
  );

  const hasSearch = searchQuery.trim().length > 0;

  const displayedFish = useMemo(() => {
    const base =
      filter === 'available'
        ? fishList.filter((f) => dailyRecord.entries[f.id]?.available)
        : fishList;
    if (!hasSearch) return base;
    return base.filter((f) => searchOutput.matchedFishIds.has(f.id));
  }, [filter, fishList, dailyRecord.entries, hasSearch, searchOutput.matchedFishIds]);

  const toggleNoteDrawer = (fishId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [fishId]: !prev[fishId] }));
  };

  return (
    <div className="space-y-3 pb-28">
      {/* Compact daily header, controls & universal offline search */}
      <section className="rounded-2xl bg-white dark:bg-[#0a0a0a] p-2.5 sm:p-3 shadow-xs border border-slate-200/80 dark:border-neutral-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-tight truncate">
              {t(lang, 'today_fish')}
            </h2>
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 tabular-nums whitespace-nowrap">
              {formatDisplayDate(dailyRecord.dateKey, lang)} ·{' '}
              <strong className="text-[#082d59] dark:text-sky-300">
                {availableCount}/{fishList.length}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap max-w-full">
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-transparent dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition whitespace-nowrap ${
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
                className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition whitespace-nowrap ${
                  filter === 'available'
                    ? 'bg-[#0879d9] text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t(lang, 'filter_available')} ({availableCount})
              </button>
            </div>

            <button
              type="button"
              onClick={() => onToggleIncludePrices(!dailyRecord.includePrices)}
              aria-pressed={dailyRecord.includePrices}
              title={t(lang, 'include_prices')}
              className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 border transition whitespace-nowrap ${
                dailyRecord.includePrices
                  ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                  : 'bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{t(lang, 'price_short')}</span>
              <span className="font-bold">
                {dailyRecord.includePrices ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Universal Search Bar with Offline Bilingual Spell Check */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck={true}
            autoComplete="off"
            placeholder={t(lang, 'universal_search_placeholder')}
            aria-label={t(lang, 'universal_search_placeholder')}
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#0879d9]/40"
          />
          {hasSearch && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t(lang, 'clear_search')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-500 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Offline Spell Check Suggestions + App-wide Search Matches */}
        {hasSearch && (
          <div className="space-y-2 pt-1">
            {searchOutput.spellSuggestions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 px-2.5 py-1.5 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{t(lang, 'did_you_mean')}:</span>
                </span>
                {searchOutput.spellSuggestions.map((s) => (
                  <button
                    key={`${s.originalToken}_${s.suggested}`}
                    type="button"
                    onClick={() => setSearchQuery(s.replacedQuery)}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 text-[#082d59] dark:text-sky-300 font-bold hover:bg-amber-100 dark:hover:bg-neutral-800 transition"
                  >
                    {s.suggested}
                  </button>
                ))}
              </div>
            ) : (
              searchOutput.isValidKnownQuery && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 px-1">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{t(lang, 'spell_exact_match')}</span>
                </div>
              )
            )}

            {searchOutput.appResults.length > 0 && (
              <div className="rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-2 space-y-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 px-1">
                  {t(lang, 'app_matches_title')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {searchOutput.appResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        if (res.target) {
                          onNavigateFromSearch(res.target);
                        }
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0a0a0a] border border-slate-200/80 dark:border-neutral-800 hover:border-[#0879d9] dark:hover:border-sky-500 flex items-center justify-between gap-2 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {res.title}
                        </p>
                        {res.subtitle && (
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">
                            {res.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#0879d9] dark:text-sky-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Fish Cards Grid */}
      {displayedFish.length === 0 ? (
        hasSearch && searchOutput.appResults.length > 0 ? null : (
          <div className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-6 sm:p-8 text-center border border-slate-200/80 dark:border-neutral-800 space-y-3">
            <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-neutral-300">
              {hasSearch ? t(lang, 'no_search_results') : t(lang, 'no_fish')}
            </p>
            <button
              type="button"
              onClick={() => {
                if (hasSearch) setSearchQuery('');
                else setFilter('all');
              }}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0879d9] text-white font-semibold text-sm"
            >
              {hasSearch ? t(lang, 'clear_search') : t(lang, 'filter_all')}
            </button>
          </div>
        )
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
