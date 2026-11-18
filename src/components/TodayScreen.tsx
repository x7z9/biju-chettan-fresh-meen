import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  ShieldCheck,
  Sparkles,
  Tag,
  Utensils,
  Volume2,
  X,
} from 'lucide-react';
import {
  getFishCategory,
  type FishCategoryFilter,
} from '../data/seedCatalog';
import { t } from '../data/translations';
import { ResilientFishImage } from './ResilientFishImage';
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
  onBulkAvailability: (fishIds: string[], select: boolean) => void;
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

interface TodayFishCardProps {
  fish: FishItem;
  entry: DailyFishEntry | undefined;
  includePrices: boolean;
  lang: Language;
  isNoteExpanded: boolean;
  onToggleAvailability: (fishId: string) => void;
  onOpenPosterStudio: (fish: FishItem) => void;
  onToggleNoteDrawer: (fishId: string) => void;
  onStatusSelect: (fishId: string, status: AvailabilityStatus) => void;
  onUpdateEntry: (fishId: string, patch: Partial<DailyFishEntry>) => void;
  eager?: boolean;
  highPriority?: boolean;
}

const TodayFishCard: React.FC<TodayFishCardProps> = React.memo(
  ({
    fish,
    entry,
    includePrices,
    lang,
    isNoteExpanded,
    onToggleAvailability,
    onOpenPosterStudio,
    onToggleNoteDrawer,
    onStatusSelect,
    onUpdateEntry,
    eager = false,
    highPriority = false,
  }) => {
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
    const showDetailsDrawer = isNoteExpanded || (isAvailable && includePrices);

    const publicNoteVal = entry?.publicNote ?? entry?.note ?? '';
    const updatedClock = entry?.updatedAt ? formatTimeShort(entry.updatedAt) : '';

    return (
      <article
        className={`rounded-2xl sm:rounded-3xl p-2 sm:p-3.5 transition-colors duration-150 flex flex-col justify-between overflow-hidden min-w-0 ${
          isLimited
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-500 dark:border-amber-400 shadow-[0_6px_18px_-4px_rgba(245,158,11,0.2)]'
            : isAvailable
              ? 'bg-emerald-50/85 dark:bg-emerald-950/65 border-2 border-[#059669] dark:border-emerald-400 shadow-[0_6px_18px_-4px_rgba(5,150,105,0.2)]'
              : isSoldOut
                ? 'bg-rose-50/60 dark:bg-rose-950/25 border border-rose-300 dark:border-rose-900 shadow-xs'
                : 'bg-white dark:bg-[#0a0a0a] border border-slate-200/75 dark:border-neutral-800 shadow-[0_4px_14px_-4px_rgba(8,45,89,0.08)]'
        }`}
      >
        <div className="min-w-0">
          {/* Photo Stage (Tap to Toggle Availability) */}
          <button
            type="button"
            onClick={() => onToggleAvailability(fish.id)}
            className="block w-full text-left group focus-visible:outline-none"
            aria-pressed={isAvailable}
            aria-label={`${fish.nameMl} (${fish.pronunciationLatin}) — ${t(
              lang,
              `status_${status}` as 'status_available'
            )}`}
          >
            <div
              className={`relative w-full aspect-[3/4] min-h-[140px] rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center transition-colors duration-150 ${
                isLimited
                  ? 'bg-white dark:bg-black border border-amber-400/60'
                  : isAvailable
                    ? 'bg-white dark:bg-black border border-[#059669]/40 dark:border-emerald-500/60'
                    : 'bg-[#eff4ff] dark:bg-black'
              }`}
            >
              <ResilientFishImage
                src={cardImageSrc}
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

              {status !== 'not_listed' && (
                <span
                  className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold text-white ${
                    isLimited
                      ? 'bg-amber-600'
                      : isAvailable
                        ? 'bg-[#059669]'
                        : 'bg-rose-600'
                  }`}
                >
                  {t(lang, `status_${status}` as 'status_available')}
                </span>
              )}
            </div>
          </button>

          {/* Unboxed photo provenance line */}
          <div
            className={`mt-2 flex items-center justify-between gap-1 text-[11px] font-medium ${
              isLimited
                ? 'text-amber-800 dark:text-amber-300'
                : isAvailable
                  ? 'text-[#059669] dark:text-emerald-300'
                  : 'text-[#43474f] dark:text-neutral-400'
            }`}
          >
            <span className="truncate">
              {isReferenceShown
                ? t(lang, 'reference_badge')
                : t(lang, 'actual_photo_badge')}
              {updatedClock && isAvailable ? ` · ${updatedClock}` : ''}
            </span>
          </div>

          {/* Malayalam name + Pronunciation Audio Speaker */}
          <div className="mt-1 flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] sm:text-lg font-extrabold leading-snug break-words text-[#082d59] dark:text-white">
                {fish.nameMl}
              </h3>
              <p className="text-xs sm:text-sm leading-snug break-words text-[#43474f] dark:text-neutral-300 font-medium">
                {fish.pronunciationLatin}
              </p>
              {(entry?.priceAmount ||
                entry?.priceOnCall ||
                entry?.quantityNote ||
                entry?.privateNote) && (
                <p className="text-[11px] font-bold text-[#ea580c] dark:text-orange-300 mt-0.5 truncate tabular-nums">
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
              className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center shrink-0 text-[#0d9488] dark:text-teal-300 hover:bg-[#eff4ff] dark:hover:bg-neutral-900 transition"
              aria-label={`${t(lang, 'listen_pronunciation')}: ${fish.pronunciationLatin}`}
              title={t(lang, 'listen_pronunciation')}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Selection CTA + Poster Studio + Expandable Details */}
        <div className="mt-2.5 space-y-1.5">
          <button
            type="button"
            onClick={() => onToggleAvailability(fish.id)}
            aria-pressed={isAvailable}
            className={`w-full min-h-[44px] px-2.5 py-2 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-[0.98] leading-snug text-center ${
              isLimited
                ? 'bg-amber-600 text-white shadow-xs hover:bg-amber-700'
                : isAvailable
                  ? 'bg-[#059669] text-white shadow-xs hover:bg-emerald-700'
                  : isSoldOut
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                    : 'bg-[#082d59] dark:bg-neutral-900 text-white dark:text-neutral-200 hover:bg-[#0a1f3d] dark:hover:bg-neutral-800 dark:border dark:border-neutral-800'
            }`}
          >
            {isAvailable ? (
              <>
                <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span className="truncate">
                  {t(lang, isLimited ? 'status_limited' : 'status_available')}
                </span>
              </>
            ) : (
              <>
                <X className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {t(lang, isSoldOut ? 'status_sold_out' : 'status_not_listed')}
                </span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onOpenPosterStudio(fish)}
              className="min-h-[40px] px-2 py-1.5 rounded-xl bg-[#f0f9ff] dark:bg-sky-950/60 text-[#082d59] dark:text-sky-200 border border-sky-200/80 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 font-semibold text-[11px] flex items-center justify-center gap-1 leading-tight text-center"
            >
              <Camera className="w-3.5 h-3.5 shrink-0 text-[#0d9488] dark:text-sky-400" />
              <span className="truncate">{t(lang, 'photo_poster')}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleNoteDrawer(fish.id)}
              className="min-h-[40px] px-2 py-1.5 rounded-xl bg-[#eff4ff] dark:bg-neutral-900 text-[#082d59] dark:text-neutral-300 hover:bg-[#dce9ff] dark:hover:bg-neutral-800 border border-transparent dark:border-neutral-800 text-[11px] font-semibold flex items-center justify-center gap-1 leading-tight text-center"
              aria-expanded={!!showDetailsDrawer}
            >
              <span className="truncate">{t(lang, 'quick_note_label')}</span>
              {showDetailsDrawer ? (
                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              )}
            </button>
          </div>

          {/* Expandable 4-State Status, Quantity, Public/Private Notes & Price Drawer */}
          {showDetailsDrawer && (
            <div className="pt-2 border-t border-slate-200/70 dark:border-neutral-800 space-y-2.5 text-left">
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
                    onClick={() => onStatusSelect(fish.id, stKey)}
                    className={`min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-bold border transition ${
                      status === stKey
                        ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                        : 'bg-white dark:bg-neutral-900 text-[#43474f] dark:text-neutral-300 border-slate-200 dark:border-neutral-800'
                    }`}
                  >
                    {stLabel}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#43474f] dark:text-neutral-400 mb-1">
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
                          className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            active
                              ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                              : 'bg-[#f5f8fc] dark:bg-neutral-900 text-[#43474f] dark:text-neutral-300 border-slate-200 dark:border-neutral-800'
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
                  className="w-full min-h-[38px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs sm:text-sm text-slate-900 dark:text-white bg-[#f5f8fc] dark:bg-black"
                />
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                <input
                  type="text"
                  value={entry?.quantityNote || ''}
                  onChange={(e) =>
                    onUpdateEntry(fish.id, { quantityNote: e.target.value })
                  }
                  placeholder={t(lang, 'quantity_note_placeholder')}
                  aria-label={t(lang, 'quantity_note_label')}
                  className="w-full min-h-[36px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white bg-[#f5f8fc] dark:bg-black"
                />
                <input
                  type="text"
                  value={entry?.sourcePlace || ''}
                  onChange={(e) =>
                    onUpdateEntry(fish.id, { sourcePlace: e.target.value })
                  }
                  placeholder={t(lang, 'source_place_placeholder')}
                  aria-label={t(lang, 'source_place_label')}
                  className="w-full min-h-[36px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white bg-[#f5f8fc] dark:bg-black"
                />
              </div>

              {/* Strictly Local Private Note */}
              <div className="rounded-xl bg-[#eff4ff] dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 p-2 space-y-1">
                <label className="flex items-center gap-1 text-[11px] font-bold text-[#082d59] dark:text-neutral-300">
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

              {includePrices && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-neutral-800">
                  <label className="block text-[11px] font-semibold text-[#43474f] dark:text-neutral-400">
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
                      className="w-full min-h-[40px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-sm font-semibold tabular-nums text-slate-900 dark:text-white bg-[#f5f8fc] dark:bg-black disabled:opacity-50"
                    />
                    <select
                      disabled={!!entry?.priceOnCall}
                      value={entry?.priceUnit || 'per_kg'}
                      onChange={(e) =>
                        onUpdateEntry(fish.id, {
                          priceUnit: e.target.value as PriceUnit,
                        })
                      }
                      className="w-full min-h-[40px] px-2 py-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-medium text-slate-800 dark:text-white bg-[#f5f8fc] dark:bg-black disabled:opacity-50"
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
  }
);

export const TodayScreen: React.FC<TodayScreenProps> = ({
  lang,
  fishList,
  dailyRecord,
  allDailyRecords,
  trashList,
  settings,
  onToggleAvailability,
  onBulkAvailability,
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | FishCategoryFilter>(
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
    let sea = 0;
    let backwater = 0;
    let shellfish = 0;
    for (const f of fishList) {
      const st = resolveEntryStatus(dailyRecord.entries[f.id]);
      if (st === 'available') available++;
      else if (st === 'limited') limited++;
      else if (st === 'sold_out') soldOut++;

      const cat = getFishCategory(f);
      if (cat === 'sea') sea++;
      else if (cat === 'backwater') backwater++;
      else shellfish++;
    }
    return {
      available,
      limited,
      soldOut,
      activeTotal: available + limited,
      sea,
      backwater,
      shellfish,
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

  // Always preserve exact catalog order (#01..#32) — never shuffle
  const displayedFish = useMemo(() => {
    const base = fishList.filter((f) => {
      if (categoryFilter !== 'all' && getFishCategory(f) !== categoryFilter) {
        return false;
      }
      if (filter === 'all') return true;
      const st = resolveEntryStatus(dailyRecord.entries[f.id]);
      if (filter === 'available') return st === 'available' || st === 'limited';
      return st === filter;
    });
    if (!hasSearch) return base;
    return base.filter((f) => searchOutput.matchedFishIds.has(f.id));
  }, [
    categoryFilter,
    filter,
    fishList,
    dailyRecord.entries,
    hasSearch,
    searchOutput.matchedFishIds,
  ]);

  const displayedSelectionStats = useMemo(() => {
    let selected = 0;
    let listed = 0;
    for (const f of displayedFish) {
      const st = resolveEntryStatus(dailyRecord.entries[f.id]);
      if (st === 'available' || st === 'limited') selected++;
      if (st !== 'not_listed') listed++;
    }
    return { selected, listed };
  }, [displayedFish, dailyRecord.entries]);

  const toggleNoteDrawer = useCallback((fishId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [fishId]: !prev[fishId] }));
  }, []);

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

  const handleStatusSelect = useCallback(
    (fishId: string, status: AvailabilityStatus) => {
      onUpdateEntry(fishId, {
        status,
        available: status === 'available' || status === 'limited',
      });
    },
    [onUpdateEntry]
  );

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
    <div className="space-y-3 pb-32">
      {/* Coastal Harbor Freshness & Desk Controls Card */}
      <section className="rounded-2xl bg-white dark:bg-[#0a0a0a] p-3 sm:p-4 shadow-[0_2px_14px_-4px_rgba(8,45,89,0.08)] border border-slate-200/70 dark:border-neutral-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#ccfbf1] dark:bg-teal-950 text-[#0d9488] dark:text-teal-300 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-[#082d59] dark:text-sky-300 leading-tight">
                  {t(lang, 'today_fish')}
                </h2>
                <span className="text-[11px] font-bold text-[#059669] dark:text-emerald-400">
                  {t(lang, 'harbor_fresh_badge')}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#43474f] dark:text-neutral-400 tabular-nums mt-0.5">
                {formatDisplayDate(dailyRecord.dateKey, lang)}
                {lastUpdatedStr
                  ? ` · ${t(lang, 'last_updated_label')} ${lastUpdatedStr}`
                  : ''}
                {' · '}
                <strong className="text-[#059669] dark:text-emerald-400">
                  {t(lang, 'status_available')} {counts.available}
                </strong>
                {counts.limited > 0 && (
                  <>
                    {' · '}
                    <strong className="text-amber-700 dark:text-amber-300">
                      {t(lang, 'status_limited')} {counts.limited}
                    </strong>
                  </>
                )}
                {counts.soldOut > 0 && (
                  <>
                    {' · '}
                    <strong className="text-rose-700 dark:text-rose-400">
                      {t(lang, 'status_sold_out')} {counts.soldOut}
                    </strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleIncludePrices(!dailyRecord.includePrices)}
            aria-pressed={dailyRecord.includePrices}
            title={t(lang, 'include_prices')}
            className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
              dailyRecord.includePrices
                ? 'bg-[#082d59] dark:bg-[#0879d9] text-white shadow-xs'
                : 'bg-[#eff4ff] dark:bg-neutral-900 text-[#082d59] dark:text-neutral-200 border border-slate-200/80 dark:border-neutral-800 hover:bg-[#dce9ff] dark:hover:bg-neutral-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span>{t(lang, 'price_short')}</span>
            <span>{dailyRecord.includePrices ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Interactive Status Segmented Bar */}
        <div className="flex items-center gap-1 p-1 bg-[#eff4ff] dark:bg-neutral-900 rounded-2xl overflow-x-auto no-scrollbar">
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
              className={`min-h-[34px] px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap tabular-nums shrink-0 ${
                filter === key
                  ? 'bg-white dark:bg-neutral-800 text-[#082d59] dark:text-white shadow-xs'
                  : 'text-[#43474f] dark:text-neutral-300 hover:text-[#082d59] dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Elevated Pill Search Bar + Catch Category Chips */}
      <section className="space-y-2">
        <div className="flex items-center w-full bg-white dark:bg-[#0a0a0a] rounded-full shadow-[0_2px_12px_-3px_rgba(8,45,89,0.08)] border border-slate-200/70 dark:border-neutral-800 pl-3.5 pr-1.5 gap-2">
          <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0 pointer-events-none" />
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
            className="flex-1 min-w-0 h-11 bg-transparent text-sm text-[#0b1c30] dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {(hasSearch || speechRecSupported) && (
            <div className="flex items-center gap-1 shrink-0">
              {hasSearch && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t(lang, 'clear_search')}
                  className="w-8 h-8 rounded-full text-slate-500 dark:text-neutral-400 hover:bg-[#eff4ff] dark:hover:bg-neutral-800 flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {speechRecSupported && (
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  aria-label={t(lang, 'voice_search')}
                  title={t(lang, 'voice_search')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                    listening
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#eff4ff] dark:bg-neutral-900 text-[#082d59] dark:text-sky-300 hover:bg-[#dce9ff] dark:hover:bg-neutral-800'
                  }`}
                >
                  {listening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Catch Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {(
            [
              ['all', t(lang, 'cat_all'), fishList.length],
              ['sea', t(lang, 'cat_sea'), counts.sea],
              ['backwater', t(lang, 'cat_backwater'), counts.backwater],
              ['shellfish', t(lang, 'cat_shellfish'), counts.shellfish],
            ] as const
          ).map(([catKey, catLabel, catCount]) => {
            const active = categoryFilter === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setCategoryFilter(catKey)}
                className={`min-h-[36px] shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition shadow-xs tabular-nums ${
                  active
                    ? 'bg-[#082d59] dark:bg-[#0879d9] text-white'
                    : 'bg-white dark:bg-[#0a0a0a] text-[#43474f] dark:text-neutral-300 border border-slate-200/70 dark:border-neutral-800 hover:bg-[#eff4ff] dark:hover:bg-neutral-900'
                }`}
              >
                <span>{catLabel}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-[#eff4ff] dark:bg-neutral-900 text-[#082d59] dark:text-neutral-300'
                  }`}
                >
                  {catCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Bulk Select All / Deselect All Controls */}
        {displayedFish.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] sm:text-xs font-bold text-[#43474f] dark:text-neutral-300 tabular-nums">
              {t(lang, 'available_count')}:{' '}
              <strong className="text-[#059669] dark:text-emerald-400">
                {displayedSelectionStats.selected}
              </strong>
              /{displayedFish.length}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
              <button
                type="button"
                data-testid="today-select-all"
                disabled={displayedSelectionStats.selected === displayedFish.length}
                onClick={() =>
                  onBulkAvailability(
                    displayedFish.map((f) => f.id),
                    true
                  )
                }
                className="min-h-[36px] px-2.5 sm:px-3 py-1 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-[#082d59]/15 dark:border-neutral-700 text-[#082d59] dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5 shrink-0 text-[#059669] dark:text-emerald-400" />
                <span>{t(lang, 'select_all')}</span>
              </button>
              <button
                type="button"
                data-testid="today-deselect-all"
                disabled={displayedSelectionStats.listed === 0}
                onClick={() =>
                  onBulkAvailability(
                    displayedFish.map((f) => f.id),
                    false
                  )
                }
                className="min-h-[36px] px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 hover:bg-rose-50 dark:bg-neutral-900 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-neutral-800 text-[#43474f] hover:text-rose-700 dark:text-neutral-300 dark:hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>{t(lang, 'deselect_all')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Offline Spell Check Suggestions + App-wide Search Matches */}
        {hasSearch && (
          <div className="space-y-2 pt-0.5">
            {searchOutput.spellSuggestions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{t(lang, 'did_you_mean')}:</span>
                </span>
                {searchOutput.spellSuggestions.map((s) => (
                  <button
                    key={`${s.originalToken}_${s.suggested}`}
                    type="button"
                    onClick={() => setSearchQuery(s.replacedQuery)}
                    className="px-2.5 py-0.5 rounded-full bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 text-[#082d59] dark:text-sky-300 font-bold hover:bg-amber-100 dark:hover:bg-neutral-800 transition"
                  >
                    {s.suggested}
                  </button>
                ))}
              </div>
            ) : (
              searchOutput.isValidKnownQuery && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#059669] dark:text-emerald-400 px-1">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{t(lang, 'spell_exact_match')}</span>
                </div>
              )
            )}

            {searchOutput.appResults.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-200/80 dark:border-neutral-800 p-2.5 space-y-1.5 shadow-xs">
                <p className="text-[11px] font-bold text-[#43474f] dark:text-neutral-400 px-1">
                  {t(lang, 'app_matches_title')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {searchOutput.appResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        if (res.target) onNavigateFromSearch(res.target);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-[#f5f8fc] dark:bg-black border border-slate-200/70 dark:border-neutral-800 hover:border-[#0879d9] dark:hover:border-sky-500 flex items-center justify-between gap-2 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#082d59] dark:text-white truncate">
                          {res.title}
                        </p>
                        {res.subtitle && (
                          <p className="text-[11px] text-[#43474f] dark:text-neutral-400 truncate">
                            {res.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#0d9488] dark:text-sky-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Sea Teal Cleaning & Cutting Service Highlight */}
      <section className="flex items-center justify-between gap-2 bg-[#ccfbf1]/75 dark:bg-teal-950/45 text-[#005049] dark:text-teal-200 rounded-2xl px-3.5 py-2.5 border border-[#0d9488]/20 dark:border-teal-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <Utensils className="w-4 h-4 shrink-0 text-[#0d9488] dark:text-teal-300" />
          <span className="text-xs font-bold truncate">
            {t(lang, 'cleaning_service_banner')}
          </span>
        </div>
        <span className="text-[11px] font-extrabold text-[#059669] dark:text-emerald-300 shrink-0">
          {t(lang, 'natural_fresh_tag')}
        </span>
      </section>

      {/* Fish Product Grid (Exact Stored Order #01-#32, Never Shuffled) */}
      {displayedFish.length === 0 ? (
        hasSearch && searchOutput.appResults.length > 0 ? null : (
          <div className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-6 sm:p-8 text-center border border-slate-200/80 dark:border-neutral-800 space-y-3 shadow-xs">
            <p className="text-sm sm:text-base font-semibold text-[#43474f] dark:text-neutral-300">
              {hasSearch ? t(lang, 'no_search_results') : t(lang, 'no_fish')}
            </p>
            <button
              type="button"
              onClick={() => {
                if (hasSearch) setSearchQuery('');
                else {
                  setFilter('all');
                  setCategoryFilter('all');
                }
              }}
              className="min-h-[42px] px-5 py-2 rounded-full bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-sm"
            >
              {hasSearch ? t(lang, 'clear_search') : t(lang, 'filter_all')}
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {displayedFish.map((fish, idx) => (
            <TodayFishCard
              key={fish.id}
              fish={fish}
              entry={dailyRecord.entries[fish.id]}
              includePrices={dailyRecord.includePrices}
              lang={lang}
              isNoteExpanded={!!expandedNotes[fish.id]}
              onToggleAvailability={onToggleAvailability}
              onOpenPosterStudio={onOpenPosterStudio}
              onToggleNoteDrawer={toggleNoteDrawer}
              onStatusSelect={handleStatusSelect}
              onUpdateEntry={onUpdateEntry}
              eager={idx < 10}
              highPriority={idx < 4}
            />
          ))}
        </div>
      )}

      {/* Floating Frosted Glass Share & Customer Snapshot Action Dock */}
      <div className="sticky bottom-18 md:bottom-4 z-20 pt-2">
        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl p-1.5 rounded-2xl sm:rounded-full shadow-[0_10px_25px_-5px_rgba(8,45,89,0.18)] border border-slate-200/80 dark:border-neutral-800 grid grid-cols-1 min-[420px]:grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => triggerShareAction('whatsapp')}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl sm:rounded-full bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.99] transition"
          >
            <Share2 className="w-4 h-4 shrink-0 text-[#facc15]" />
            <span className="truncate">
              {t(lang, 'share_today')}
              {counts.activeTotal > 0 ? ` (${counts.activeTotal})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => triggerShareAction('customer')}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl sm:rounded-full bg-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-700 active:scale-[0.99] transition"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
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
            <h3 className="text-lg font-bold text-[#082d59] dark:text-white leading-snug">
              {t(lang, 'no_stock_confirm_title')}
            </h3>
            <p className="text-sm text-[#43474f] dark:text-neutral-300 leading-relaxed">
              {t(lang, 'no_stock_confirm_body')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEmptyConfirmTarget(null)}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-full bg-[#eff4ff] dark:bg-neutral-900 text-[#082d59] dark:text-neutral-200 font-bold"
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
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-full bg-[#082d59] dark:bg-[#0879d9] text-white font-bold"
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
