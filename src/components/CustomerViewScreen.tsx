import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Search,
  ShieldCheck,
  Utensils,
  Volume2,
  X,
} from 'lucide-react';
import { BUSINESS_LOGO_PATH, resolvePublicAsset } from '../data/seedCatalog';
import { t } from '../data/translations';
import type {
  CustomerSnapshotV1,
  FishItem,
  Language,
  PriceUnit,
  SnapshotFishItemV1,
} from '../types';
import { formatSnapshotAge } from '../utils/customerSnapshot';
import { formatDisplayDate, speakPronunciation } from '../utils/speechAndDate';
import { ResilientFishImage } from './ResilientFishImage';
import { openWhatsAppTextLink } from '../utils/whatsappHelper';
import { GlossaryModal } from './GlossaryModal';

interface CustomerViewScreenProps {
  snapshot: CustomerSnapshotV1 | null;
  fallbackPhoneDisplay?: string;
  fallbackPhoneDigits?: string;
  catalogForGlossary: FishItem[];
  onExitToSeller?: () => void;
}

function unitSuffix(unit: PriceUnit | undefined, lang: Language): string {
  if (lang === 'en') {
    if (unit === 'per_piece') return '/piece';
    if (unit === 'per_packet') return '/packet';
    return '/kg';
  }
  if (unit === 'per_piece') return '/എണ്ണം';
  if (unit === 'per_packet') return '/പാക്കറ്റ്';
  return '/കിലോ';
}

export const CustomerViewScreen: React.FC<CustomerViewScreenProps> = ({
  snapshot,
  fallbackPhoneDisplay,
  fallbackPhoneDigits,
  catalogForGlossary,
  onExitToSeller,
}) => {
  const [lang, setLang] = useState<Language>(snapshot?.lang || 'ml');
  const [filter, setFilter] = useState<'all' | 'available' | 'limited' | 'sold_out'>(
    'all'
  );
  const [query, setQuery] = useState('');
  const [showGlossary, setShowGlossary] = useState(false);

  const counts = useMemo(() => {
    const items = snapshot?.items || [];
    return {
      all: items.length,
      available: items.filter((i) => i.status === 'available').length,
      limited: items.filter((i) => i.status === 'limited').length,
      sold_out: items.filter((i) => i.status === 'sold_out').length,
    };
  }, [snapshot]);

  const displayedItems = useMemo(() => {
    const items = snapshot?.items || [];
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.nameMl.toLowerCase().includes(q) ||
        item.pron.toLowerCase().includes(q) ||
        (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
        (item.refNum !== null && `#${String(item.refNum).padStart(2, '0')}`.includes(q))
      );
    });
  }, [snapshot, filter, query]);

  const sendPerFishWhatsApp = (
    item: SnapshotFishItemV1,
    intent: 'price' | 'avail' | 'order'
  ) => {
    if (!snapshot?.phoneDigits) return;
    const isEn = lang === 'en';
    let msg = '';
    if (intent === 'price') {
      msg = isEn
        ? `Hi ${snapshot.owner}, could you confirm today's rate for ${item.nameMl} (${item.pron})?`
        : `നമസ്കാരം ${snapshot.owner}, ഇന്ന് ${item.nameMl}-ന്റെ വില എത്രയാണെന്ന് പറയാമോ?`;
    } else if (intent === 'avail') {
      msg = isEn
        ? `Hi ${snapshot.owner}, is ${item.nameMl} (${item.pron}) still available now?`
        : `നമസ്കാരം ${snapshot.owner}, ${item.nameMl} ഇപ്പോഴും ലഭ്യമാണോ?`;
    } else {
      msg = isEn
        ? `Hi ${snapshot.owner}, I would like to enquire about ordering ${item.nameMl} (${item.pron}) from your ${snapshot.dateKey} catch.`
        : `നമസ്കാരം ${snapshot.owner}, ഇന്നത്തെ ${item.nameMl} വേണം — ലഭ്യമാണെങ്കിൽ അറിയിക്കാമോ?`;
    }
    openWhatsAppTextLink(msg, snapshot.phoneDigits);
  };

  if (!snapshot) {
    const cleanDigits = fallbackPhoneDigits?.replace(/[^0-9]/g, '') || '919544433018';
    const displayNum = fallbackPhoneDisplay || '+91 95444 33018';
    return (
      <div className="min-h-screen bg-[#f5f8fc] dark:bg-black text-[#0b1c30] dark:text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0a0a0a] border border-slate-200/80 dark:border-neutral-800 p-6 shadow-[0_8px_24px_-6px_rgba(8,45,89,0.12)] space-y-4 text-center">
          <img
            src={BUSINESS_LOGO_PATH}
            alt="Biju Chettante Fresh Fish"
            className="w-16 h-16 rounded-full mx-auto object-cover ring-2 ring-[#082d59]/15"
          />
          <h1 className="text-lg font-extrabold text-[#082d59] dark:text-sky-300 leading-snug">
            {t(lang, 'customer_missing_title')}
          </h1>
          <p className="text-sm text-[#43474f] dark:text-neutral-300 leading-relaxed">
            {t(lang, 'customer_missing_body')}
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <a
              href={`tel:+${cleanDigits}`}
              className="min-h-[48px] px-4 py-3 rounded-full bg-[#082d59] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>
                {t(lang, 'call_now')}: {displayNum}
              </span>
            </a>
            <button
              type="button"
              onClick={() =>
                openWhatsAppTextLink(
                  lang === 'en'
                    ? "Hi Biju R, please send today's fresh fish list."
                    : 'നമസ്കാരം ബിജു R, ഇന്നത്തെ ഫ്രെഷ് മീൻ പട്ടിക അയക്കാമോ?',
                  cleanDigits
                )
              }
              className="min-h-[48px] px-4 py-3 rounded-full bg-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'whatsapp_now')}</span>
            </button>
            {onExitToSeller && (
              <button
                type="button"
                onClick={onExitToSeller}
                className="min-h-[44px] px-4 py-2 rounded-full bg-[#eff4ff] dark:bg-neutral-900 text-[#082d59] dark:text-neutral-300 font-bold text-xs"
              >
                {t(lang, 'back_to_seller_mode')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const age = formatSnapshotAge(snapshot.createdAt, lang);

  return (
    <div className="min-h-screen bg-[#f5f8fc] dark:bg-black text-[#0b1c30] dark:text-white pb-28">
      {/* Frosted Coastal Read-Only Customer Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-xl text-[#0b1c30] dark:text-white shadow-[0_4px_20px_-4px_rgba(8,45,89,0.08)] border-b border-slate-200/70 dark:border-neutral-800 pt-safe">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={BUSINESS_LOGO_PATH}
              alt={snapshot.businessMl}
              className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-[#082d59]/15 dark:ring-sky-400/30 bg-white"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-extrabold text-[#082d59] dark:text-sky-300 leading-tight truncate">
                {lang === 'en' ? snapshot.businessEn : snapshot.businessMl}
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-[#0d9488] dark:text-teal-300 truncate">
                {lang === 'en' ? snapshot.locEn : snapshot.locMl} ·{' '}
                {formatDisplayDate(snapshot.dateKey, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowGlossary(true)}
              aria-label={t(lang, 'glossary_btn')}
              title={t(lang, 'glossary_btn')}
              className="min-h-[38px] min-w-[38px] px-2.5 rounded-full bg-[#eff4ff] dark:bg-neutral-900 hover:bg-[#dce9ff] dark:hover:bg-neutral-800 text-[#082d59] dark:text-sky-300 text-xs font-bold flex items-center gap-1"
            >
              <BookOpen className="w-4 h-4 shrink-0 text-[#0d9488]" />
              <span className="hidden sm:inline">{t(lang, 'glossary_btn')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label={t(lang, 'print_menu')}
              title={t(lang, 'print_menu')}
              className="hidden sm:flex min-h-[38px] min-w-[38px] px-2.5 rounded-full bg-[#eff4ff] dark:bg-neutral-900 hover:bg-[#dce9ff] dark:hover:bg-neutral-800 text-[#082d59] dark:text-sky-300 text-xs font-bold items-center gap-1"
            >
              <Printer className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === 'ml' ? 'en' : 'ml')}
              className="min-h-[38px] px-3 py-1.5 rounded-full bg-[#082d59] dark:bg-[#0879d9] text-white text-xs font-bold shadow-xs"
            >
              {lang === 'ml' ? 'EN' : 'മലയാളം'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5 space-y-3.5">
        {/* Static Snapshot Freshness Notice */}
        <div
          className={`rounded-2xl p-3 text-xs sm:text-sm border flex items-start gap-2.5 leading-relaxed shadow-[0_2px_12px_-3px_rgba(8,45,89,0.06)] ${
            age.isStale
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-white dark:bg-[#0a0a0a] border-slate-200/75 dark:border-neutral-800 text-[#082d59] dark:text-sky-200'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              age.isStale
                ? 'bg-amber-200/60 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                : 'bg-[#ccfbf1] dark:bg-teal-950 text-[#0d9488] dark:text-teal-300'
            }`}
          >
            {age.isStale ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-extrabold">
              {age.label} · {snapshot.owner}
            </p>
            <p className="text-[#43474f] dark:text-neutral-300">
              {age.isStale
                ? t(lang, 'customer_stale_notice')
                : t(lang, 'customer_static_notice')}
            </p>
          </div>
        </div>

        {/* Elevated Pill Search + Status Filter Chips */}
        <section className="space-y-2">
          <div className="flex items-center w-full bg-white dark:bg-[#0a0a0a] rounded-full shadow-[0_2px_12px_-3px_rgba(8,45,89,0.08)] border border-slate-200/70 dark:border-neutral-800 pl-3.5 pr-1.5 gap-2">
            <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(lang, 'search')}
              aria-label={t(lang, 'search')}
              className="flex-1 min-w-0 h-11 bg-transparent text-sm text-[#0b1c30] dark:text-white placeholder:text-slate-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t(lang, 'clear_search')}
                className="w-8 h-8 rounded-full text-slate-500 flex items-center justify-center hover:bg-[#eff4ff] dark:hover:bg-neutral-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {(
              [
                ['all', t(lang, 'filter_all'), counts.all],
                ['available', t(lang, 'status_available'), counts.available],
                ['limited', t(lang, 'status_limited'), counts.limited],
                ['sold_out', t(lang, 'status_sold_out'), counts.sold_out],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[36px] shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition tabular-nums shadow-xs ${
                  filter === key
                    ? 'bg-[#082d59] dark:bg-[#0879d9] text-white'
                    : 'bg-white dark:bg-[#0a0a0a] text-[#43474f] dark:text-neutral-300 border border-slate-200/75 dark:border-neutral-800'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </section>

        {/* Sea Teal Cleaning & Cutting Note */}
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

        {/* Fish Grid (Exact Unshuffled Order) */}
        {displayedItems.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-[#0a0a0a] border border-slate-200/80 dark:border-neutral-800 p-8 text-center text-sm text-[#43474f] dark:text-neutral-400">
            {t(lang, 'no_search_results')}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {displayedItems.map((item, idx) => {
              const imgUrl = item.img ? resolvePublicAsset(item.img) : null;
              const isLimited = item.status === 'limited';
              const isSold = item.status === 'sold_out';
              const details = [item.size, item.qty, item.source, item.note]
                .filter(Boolean)
                .join(' · ');

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl sm:rounded-3xl p-2 sm:p-3.5 flex flex-col justify-between overflow-hidden min-w-0 ${
                    isSold
                      ? 'bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 opacity-75'
                      : isLimited
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-[#0a0a0a] border border-slate-200/75 dark:border-neutral-800 shadow-[0_4px_14px_-4px_rgba(8,45,89,0.08)]'
                  }`}
                >
                  <div>
                    <div className="relative w-full aspect-[3/4] min-h-[140px] rounded-xl sm:rounded-2xl bg-[#eff4ff] dark:bg-black overflow-hidden flex items-center justify-center">
                      <ResilientFishImage
                        src={imgUrl}
                        fallbackSrc={item.img}
                        alt={`${item.nameMl} (${item.pron})`}
                        fallbackLabel={item.nameMl}
                        eager={idx < 10}
                        highPriority={idx < 4}
                      />
                      {item.refNum !== null && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#0a1f3d]/85 backdrop-blur-xs text-white text-[10px] font-extrabold tabular-nums">
                          #{String(item.refNum).padStart(2, '0')}
                        </span>
                      )}
                      <span
                        className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold text-white ${
                          isSold
                            ? 'bg-rose-600'
                            : isLimited
                              ? 'bg-amber-600'
                              : 'bg-[#059669]'
                        }`}
                      >
                        {isSold
                          ? t(lang, 'status_sold_out')
                          : isLimited
                            ? t(lang, 'status_limited')
                            : t(lang, 'status_available')}
                      </span>
                    </div>

                    <div className="mt-2 flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[15px] sm:text-lg font-extrabold text-[#082d59] dark:text-white leading-snug break-words">
                          {item.nameMl}
                        </h2>
                        <p className="text-xs sm:text-sm text-[#43474f] dark:text-neutral-400 leading-snug break-words font-medium">
                          {item.pron}
                          {item.nameEn ? ` · ${item.nameEn}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakPronunciation(item.pron)}
                        className="min-w-[34px] min-h-[34px] rounded-full flex items-center justify-center shrink-0 text-[#0d9488] dark:text-teal-300 hover:bg-[#eff4ff] dark:hover:bg-neutral-900"
                        aria-label={`${t(lang, 'listen_pronunciation')}: ${item.pron}`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    {!isSold && item.priceOnCall ? (
                      <p className="mt-1.5 text-xs sm:text-sm font-bold text-[#082d59] dark:text-sky-300">
                        {t(lang, 'call_to_confirm_price')}
                      </p>
                    ) : !isSold && item.price ? (
                      <p className="mt-1.5 text-sm sm:text-base font-extrabold text-[#ea580c] dark:text-orange-300 tabular-nums">
                        ₹{item.price} {unitSuffix(item.unit, lang)}
                      </p>
                    ) : null}

                    {details && (
                      <p className="mt-1 text-xs text-[#43474f] dark:text-neutral-300 leading-snug break-words">
                        {details}
                      </p>
                    )}
                  </div>

                  {snapshot.phoneDigits && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          sendPerFishWhatsApp(
                            item,
                            isLimited ? 'avail' : item.price ? 'order' : 'price'
                          )
                        }
                        className="flex-1 min-h-[40px] px-2.5 py-1.5 rounded-full bg-[#082d59] dark:bg-emerald-950/60 dark:border dark:border-emerald-700 text-white dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-95 transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {isSold
                            ? t(lang, 'check_avail_wa')
                            : item.price
                              ? t(lang, 'enquire_order_wa')
                              : t(lang, 'ask_price_wa')}
                        </span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Frosted Sticky Contact Bar (compact < 64px height) */}
      {(snapshot.phoneDigits || snapshot.mapsUrl) && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-[0_-4px_20px_-4px_rgba(8,45,89,0.08)] border-t border-slate-200/75 dark:border-neutral-800 px-3 py-2 pb-safe">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            {snapshot.phoneDigits && snapshot.phone && (
              <>
                <a
                  href={`tel:+${snapshot.phoneDigits}`}
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-full bg-[#082d59] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="truncate">{snapshot.phone}</span>
                </a>
                <button
                  type="button"
                  onClick={() =>
                    openWhatsAppTextLink(
                      lang === 'en'
                        ? `Hi ${snapshot.owner}, checking today's fish availability.`
                        : `നമസ്കാരം ${snapshot.owner}, ഇന്നത്തെ മീൻ ലഭ്യത അറിയാനാണ്.`,
                      snapshot.phoneDigits
                    )
                  }
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-full bg-[#059669] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>{t(lang, 'whatsapp_now')}</span>
                </button>
              </>
            )}
            {snapshot.mapsUrl && (
              <a
                href={snapshot.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t(lang, 'directions_btn')}
                className="min-h-[44px] px-3 py-2 rounded-full bg-[#eff4ff] dark:bg-sky-950 border border-sky-200 dark:border-sky-800 text-[#082d59] dark:text-sky-200 font-bold text-xs flex items-center justify-center gap-1 shrink-0"
              >
                <MapPin className="w-4 h-4 shrink-0 text-[#ea580c]" />
                <span className="hidden sm:inline">{t(lang, 'directions_btn')}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {showGlossary && (
        <GlossaryModal
          lang={lang}
          fishList={catalogForGlossary}
          onClose={() => setShowGlossary(false)}
        />
      )}
    </div>
  );
};
