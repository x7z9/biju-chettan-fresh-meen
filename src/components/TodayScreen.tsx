import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lock,
  Mic,
  MicOff,
  Search,
  Share2,
  Sparkles,
  Tag,
  Volume2,
  X,
} from 'lucide-react';
import { t } from '../data/translations';
import { resolveEntryStatus } from '../db/indexedDb';
import type {
  AvailabilityStatus,
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
  onOpenCustomerSnapshot: () => void;
  onNavigateFromSearch: (target: SearchActionTarget) => void;
}

function formatTimeShort(ts: number | undefined): string {
  if (!ts) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
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
  onOpenCustomerSnapshot,
  onNavigateFromSearch,
}) => {
  const [filter, setFilter] = useState<'all' | 'available' | 'limited' | 'sold_out'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [emptyConfirmTarget, setEmptyConfirmTarget] = useState<
    'whatsapp' | 'customer' | null
  >(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const speechRecSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const w = window as unknown as Record<string, unknown>;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const counts = useMemo(() => {
    let available = 0;
    let limited = 0;
    let soldOut = 0;
    for (const f of fishList) {
      const st = resolveEntryStatus(dailyRecord.entries[f.id]);
      if (st === 'available') available++;
      else if (st === 'limited') limited++;
      else if (st === 'sold_out') soldOut++;
    }
    return {
      available,
      limited,
      soldOut,
      activeTotal: available + limited,
    };
  }, [fishList, dailyRecord.entries]);

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
    const base = fishList.filter((f) => {
      if (filter === 'all') return true;
      const st = resolveEntryStatus(dailyRecord.entries[f.id]);
      if (filter === 'available') return st === 'available' || st === 'limited';
      return st === filter;
    });
    if (!hasSearch) return base;
    return base.filter((f) => searchOutput.matchedFishIds.has(f.id));
  }, [filter, fishList, dailyRecord.entries, hasSearch, searchOutput.matchedFishIds]);

  const toggleNoteDrawer = (fishId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [fishId]: !prev[fishId] }));
  };

  const handleVoiceToggle = () => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as Record<string, new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    }>;
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) return;
    try {
      const rec = new SpeechRec();
      rec.lang = lang === 'ml' ? 'ml-IN' : 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev) => {
        const transcript = ev.results?.[0]?.[0]?.transcript;
        if (transcript) setSearchQuery(transcript.trim());
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const handleStatusSelect = (fishId: string, status: AvailabilityStatus) => {
    onUpdateEntry(fishId, {
      status,
      available: status === 'available' || status === 'limited',
    });
  };

  const triggerShareAction = (target: 'whatsapp' | 'customer') => {
    if (counts.activeTotal === 0) {
      setEmptyConfirmTarget(target);
      return;
    }
    if (target === 'whatsapp') onOpenShareList();
    else onOpenCustomerSnapshot();
  };

  const lastUpdatedStr = formatTimeShort(dailyRecord.updatedAt);

  return (
    <div className="space-y-3 pb-28">
      {/* Compact daily header, controls & universal offline search */}
      <section className="rounded-2xl bg-white dark:bg-[#0a0a0a] p-2.5 sm:p-3.5 shadow-xs border border-slate-200/80 dark:border-neutral-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-tight">
                {t(lang, 'today_fish')}
              </h2>
              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                {formatDisplayDate(dailyRecord.dateKey, lang)}
                {lastUpdatedStr
                  ? ` · ${t(lang, 'last_updated_label')} ${lastUpdatedStr}`
                  : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-neutral-400 tabular-nums mt-0.5">
              {t(lang, 'status_available')}: <strong className="text-emerald-700 dark:text-emerald-400">{counts.available}</strong>
              {counts.limited > 0 && (
                <> · {t(lang, 'status_limited')}: <strong className="text-amber-700 dark:text-amber-300">{counts.limited}</strong></>
              )}
              {counts.soldOut > 0 && (
                <> · {t(lang, 'status_sold_out')}: <strong className="text-rose-700 dark:text-rose-400">{counts.soldOut}</strong></>
              )}
              {' '}· {t(lang, 'saved_locally_short')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onToggleIncludePrices(!dailyRecord.includePrices)}
            aria-pressed={dailyRecord.includePrices}
            title={t(lang, 'include_prices')}
            className={`min-h-[38px] px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 border transition whitespace-nowrap shrink-0 ${
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

        {/* 4 Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-transparent dark:border-neutral-800">
          {(
            [
              ['all', `${t(lang, 'filter_all')} (${fishList.length})`],
              ['available', `${t(lang, 'filter_available')} (${counts.activeTotal})`],
              ['limited', `${t(lang, 'filter_limited')} (${counts.limited})`],
              ['sold_out', `${t(lang, 'filter_sold_out')} (${counts.soldOut})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition whitespace-nowrap tabular-nums ${
                filter === key
                  ? 'bg-white dark:bg-neutral-800 text-[#082d59] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Universal Search Bar with Offline Bilingual Spell Check + Optional Mic */}
        <div className="relative flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              spellCheck={true}
              autoComplete="off"
              placeholder={
                listening
                  ? t(lang, 'voice_listening')
                  : t(lang, 'universal_search_placeholder')
              }
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

          {speechRecSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              aria-label={t(lang, 'voice_search')}
              title={t(lang, 'voice_search')}
              className={`min-w-[40px] min-h-[40px] rounded-xl border flex items-center justify-center shrink-0 transition ${
                listening
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 border-slate-200 dark:border-neutral-800'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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
                        if (res.target) onNavigateFromSearch(res.target);
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
            const status = resolveEntryStatus(entry);
            const isAvailable = status === 'available' || status === 'limited';
            const isLimited = status === 'limited';
            const isSoldOut = status === 'sold_out';
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
              expandedNotes[fish.id] ||
              (isAvailable && dailyRecord.includePrices);

            const publicNoteVal = entry?.publicNote ?? entry?.note ?? '';
            const updatedClock = entry?.updatedAt ? formatTimeShort(entry.updatedAt) : '';

            return (
              <article
                key={fish.id}
                className={`rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 transition-colors duration-150 border-2 flex flex-col justify-between overflow-hidden min-w-0 ${
                  isLimited
                    ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 dark:border-amber-400 ring-2 ring-amber-400/25 shadow-md'
                    : isAvailable
                      ? 'bg-emerald-50/95 dark:bg-emerald-950/70 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/25 dark:ring-emerald-400/30 shadow-md'
                      : isSoldOut
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 shadow-xs'
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
                    aria-label={`${fish.nameMl} (${fish.pronunciationLatin}) — ${t(
                      lang,
                      `status_${status}` as 'status_available'
                    )}`}
                  >
                    <div
                      className={`relative w-full aspect-[3/4] rounded-xl sm:rounded-2xl border overflow-hidden flex items-center justify-center transition-colors duration-150 ${
                        isLimited
                          ? 'bg-white dark:bg-black border-amber-400/80'
                          : isAvailable
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
                      isLimited
                        ? 'text-amber-800 dark:text-amber-300'
                        : isAvailable
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-slate-600 dark:text-neutral-300'
                    }`}
                  >
                    <span className="leading-snug break-words">
                      {isReferenceShown
                        ? t(lang, 'reference_badge')
                        : t(lang, 'actual_photo_badge')}
                      {updatedClock && isAvailable ? ` · ${updatedClock}` : ''}
                    </span>
                    {fish.referenceNumber !== null && (
                      <span className="tabular-nums font-medium shrink-0">
                        #{String(fish.referenceNumber).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* Malayalam name + Pronunciation + Speaker */}
                  <div className="mt-1.5 flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] sm:text-lg font-bold leading-snug break-words text-slate-900 dark:text-white">
                        {fish.nameMl}
                      </h3>
                      <p className="text-xs sm:text-sm leading-snug break-words mt-0.5 text-slate-700 dark:text-neutral-300">
                        {fish.pronunciationLatin}
                      </p>
                      {(entry?.priceAmount || entry?.priceOnCall || entry?.quantityNote || entry?.privateNote) && (
                        <p className="text-[11px] text-slate-600 dark:text-neutral-400 mt-0.5 truncate tabular-nums">
                          {[
                            entry?.priceOnCall
                              ? t(lang, 'price_on_call_label')
                              : entry?.priceAmount
                                ? `₹${entry.priceAmount}`
                                : '',
                            entry?.quantityNote,
                            entry?.privateNote ? '🔒' : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => speakPronunciation(fish.pronunciationLatin)}
                      className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-xl flex items-center justify-center shrink-0 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-900 transition"
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
                      isLimited
                        ? 'bg-amber-600 text-white shadow-xs hover:bg-amber-700'
                        : isAvailable
                          ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                          : isSoldOut
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800'
                    }`}
                  >
                    {isAvailable ? (
                      <>
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 stroke-[2.5]" />
                        <span className="break-words">
                          {t(lang, isLimited ? 'status_limited' : 'status_available')}
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 shrink-0" />
                        <span className="break-words">
                          {t(lang, isSoldOut ? 'status_sold_out' : 'status_not_listed')}
                        </span>
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

                  <button
                    type="button"
                    onClick={() => toggleNoteDrawer(fish.id)}
                    className="w-full min-h-[38px] sm:min-h-[40px] px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 leading-snug text-center"
                    aria-expanded={!!showDetailsDrawer}
                  >
                    <span className="break-words">{t(lang, 'quick_note_label')}</span>
                    {showDetailsDrawer ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>

                  {/* Optional Status, Quantity/Size, Public/Private Notes & Price Drawer */}
                  {showDetailsDrawer && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-neutral-800 space-y-2.5 text-left">
                      {/* 4-state status selector */}
                      <div className="grid grid-cols-2 gap-1">
                        {(
                          [
                            ['available', t(lang, 'status_available')],
                            ['limited', t(lang, 'status_limited')],
                            ['sold_out', t(lang, 'status_sold_out')],
                            ['not_listed', t(lang, 'status_not_listed')],
                          ] as const
                        ).map(([stKey, stLabel]) => (
                          <button
                            key={stKey}
                            type="button"
                            onClick={() => handleStatusSelect(fish.id, stKey)}
                            className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-bold border transition ${
                              status === stKey
                                ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                                : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-800'
                            }`}
                          >
                            {stLabel}
                          </button>
                        ))}
                      </div>

                      {/* Quick size chips + Public customer note */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400 mb-1">
                          {t(lang, 'public_note_label')}
                        </label>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {(['note_big', 'note_small', 'note_1kg'] as const).map(
                            (noteKey) => {
                              const label = t(lang, noteKey);
                              const active = publicNoteVal === label;
                              return (
                                <button
                                  key={noteKey}
                                  type="button"
                                  onClick={() =>
                                    onUpdateEntry(fish.id, {
                                      note: active ? '' : label,
                                      publicNote: active ? '' : label,
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
                          value={publicNoteVal}
                          onChange={(e) =>
                            onUpdateEntry(fish.id, {
                              note: e.target.value,
                              publicNote: e.target.value,
                            })
                          }
                          placeholder={t(lang, 'public_note_placeholder')}
                          className="w-full min-h-[38px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs sm:text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-black"
                        />
                      </div>

                      {/* Quantity, Size & Catch Source */}
                      <div className="grid grid-cols-1 gap-1.5">
                        <input
                          type="text"
                          value={entry?.quantityNote || ''}
                          onChange={(e) =>
                            onUpdateEntry(fish.id, { quantityNote: e.target.value })
                          }
                          placeholder={t(lang, 'quantity_note_placeholder')}
                          aria-label={t(lang, 'quantity_note_label')}
                          className="w-full min-h-[36px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-black"
                        />
                        <input
                          type="text"
                          value={entry?.sourcePlace || ''}
                          onChange={(e) =>
                            onUpdateEntry(fish.id, { sourcePlace: e.target.value })
                          }
                          placeholder={t(lang, 'source_place_placeholder')}
                          aria-label={t(lang, 'source_place_label')}
                          className="w-full min-h-[36px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-black"
                        />
                      </div>

                      {/* Strictly Local Private Note */}
                      <div className="rounded-xl bg-slate-100/80 dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 p-2 space-y-1">
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-neutral-300">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>{t(lang, 'private_note_label')}</span>
                        </label>
                        <input
                          type="text"
                          value={entry?.privateNote || ''}
                          onChange={(e) =>
                            onUpdateEntry(fish.id, { privateNote: e.target.value })
                          }
                          placeholder={t(lang, 'private_note_placeholder')}
                          className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-black"
                        />
                      </div>

                      {/* Price Controls */}
                      {dailyRecord.includePrices && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-neutral-800">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-400">
                            {t(lang, 'price_optional')}
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              disabled={!!entry?.priceOnCall}
                              value={entry?.priceAmount || ''}
                              onChange={(e) =>
                                onUpdateEntry(fish.id, {
                                  priceAmount: e.target.value,
                                })
                              }
                              placeholder={t(lang, 'price_amount_placeholder')}
                              className="w-full min-h-[40px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-sm font-semibold tabular-nums text-slate-900 dark:text-white bg-slate-50 dark:bg-black disabled:opacity-50"
                            />
                            <select
                              disabled={!!entry?.priceOnCall}
                              value={entry?.priceUnit || 'per_kg'}
                              onChange={(e) =>
                                onUpdateEntry(fish.id, {
                                  priceUnit: e.target.value as PriceUnit,
                                })
                              }
                              className="w-full min-h-[40px] px-2 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-medium text-slate-800 dark:text-white bg-slate-50 dark:bg-black disabled:opacity-50"
                              aria-label={t(lang, 'price')}
                            >
                              <option value="per_kg">{t(lang, 'per_kg')}</option>
                              <option value="per_piece">{t(lang, 'per_piece')}</option>
                              <option value="per_packet">{t(lang, 'per_packet')}</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-neutral-300 cursor-pointer pt-0.5">
                            <input
                              type="checkbox"
                              checked={!!entry?.priceOnCall}
                              onChange={(e) =>
                                onUpdateEntry(fish.id, {
                                  priceOnCall: e.target.checked,
                                })
                              }
                              className="w-4 h-4 accent-[#0879d9]"
                            />
                            <span>{t(lang, 'price_on_call_label')}</span>
                          </label>
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-neutral-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entry?.sharePrice !== false}
                              onChange={(e) =>
                                onUpdateEntry(fish.id, {
                                  sharePrice: e.target.checked,
                                })
                              }
                              className="w-4 h-4 accent-[#0879d9]"
                            />
                            <span>{t(lang, 'share_this_price')}</span>
                          </label>
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

      {/* Primary Thumb-Zone CTA Bar: Share Today's List + Share Customer View */}
      <div className="sticky bottom-20 md:bottom-4 z-20 pt-2">
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => triggerShareAction('whatsapp')}
            className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] active:scale-[0.99] transition"
          >
            <Share2 className="w-5 h-5 shrink-0 text-[#facc15]" />
            <span className="truncate">
              {t(lang, 'share_today')}
              {counts.activeTotal > 0 ? ` (${counts.activeTotal})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => triggerShareAction('customer')}
            className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 active:scale-[0.99] transition"
          >
            <ExternalLink className="w-5 h-5 shrink-0" />
            <span className="truncate">{t(lang, 'share_customer_view')}</span>
          </button>
        </div>
      </div>

      {/* Confirm Warning Dialog when 0 Fish are Selected */}
      {emptyConfirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 p-6 shadow-2xl space-y-4 pb-safe">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {t(lang, 'no_stock_confirm_title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
              {t(lang, 'no_stock_confirm_body')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEmptyConfirmTarget(null)}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 font-semibold"
              >
                {t(lang, 'cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const dest = emptyConfirmTarget;
                  setEmptyConfirmTarget(null);
                  if (dest === 'whatsapp') onOpenShareList();
                  else onOpenCustomerSnapshot();
                }}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold"
              >
                {t(lang, 'proceed_anyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
