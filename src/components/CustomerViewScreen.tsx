import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Search,
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
import { formatDisplayDate } from '../utils/speechAndDate';
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
      <div className="min-h-screen bg-[#f5f8fc] dark:bg-black text-slate-900 dark:text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-neutral-800 p-6 shadow-md space-y-4 text-center">
          <img
            src={BUSINESS_LOGO_PATH}
            alt="Biju Chettante Fresh Fish"
            className="w-16 h-16 rounded-full mx-auto object-cover border border-slate-200"
          />
          <h1 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug">
            {t(lang, 'customer_missing_title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
            {t(lang, 'customer_missing_body')}
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <a
              href={`tel:+${cleanDigits}`}
              className="min-h-[48px] px-4 py-3 rounded-2xl bg-[#082d59] text-white font-bold text-sm flex items-center justify-center gap-2"
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
              className="min-h-[48px] px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'whatsapp_now')}</span>
            </button>
            {onExitToSeller && (
              <button
                type="button"
                onClick={onExitToSeller}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-semibold text-xs"
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
    <div className="min-h-screen bg-[#f5f8fc] dark:bg-black text-slate-900 dark:text-white pb-24">
      {/* Compact Read-Only Header */}
      <header className="sticky top-0 z-30 bg-[#082d59] text-white shadow-sm pt-safe">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={BUSINESS_LOGO_PATH}
              alt={snapshot.businessMl}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/25 bg-white"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold leading-tight truncate">
                {lang === 'en' ? snapshot.businessEn : snapshot.businessMl}
              </h1>
              <p className="text-[11px] sm:text-xs text-sky-200 truncate">
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
              className="min-h-[38px] min-w-[38px] px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t(lang, 'glossary_btn')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label={t(lang, 'print_menu')}
              title={t(lang, 'print_menu')}
              className="hidden sm:flex min-h-[38px] min-w-[38px] px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold items-center gap-1"
            >
              <Printer className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === 'ml' ? 'en' : 'ml')}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold"
            >
              {lang === 'ml' ? 'EN' : 'മലയാളം'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5 space-y-3.5">
        {/* Static Snapshot Freshness Notice */}
        <div
          className={`rounded-2xl p-3 text-xs sm:text-sm border flex items-start gap-2.5 leading-relaxed ${
            age.isStale
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-[#082d59] dark:text-sky-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-bold">
              {age.label} · {snapshot.owner}
            </p>
            <p>
              {age.isStale
                ? t(lang, 'customer_stale_notice')
                : t(lang, 'customer_static_notice')}
            </p>
          </div>
        </div>

        {/* Search + 4 Status Filters */}
        <section className="rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-200/80 dark:border-neutral-800 p-3 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(lang, 'search')}
              aria-label={t(lang, 'search')}
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 text-sm text-slate-900 dark:text-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t(lang, 'clear_search')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
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
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold border transition tabular-nums ${
                  filter === key
                    ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                    : 'bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-800'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </section>

        {/* Fish Grid */}
        {displayedItems.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-neutral-800 p-8 text-center text-sm text-slate-600 dark:text-neutral-400">
            {t(lang, 'no_search_results')}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {displayedItems.map((item) => {
              const imgUrl = item.img ? resolvePublicAsset(item.img) : null;
              const isLimited = item.status === 'limited';
              const isSold = item.status === 'sold_out';
              const details = [item.size, item.qty, item.source, item.note]
                .filter(Boolean)
                .join(' · ');

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border-2 flex flex-col justify-between overflow-hidden min-w-0 ${
                    isSold
                      ? 'bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 opacity-75'
                      : isLimited
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600'
                        : 'bg-white dark:bg-[#0a0a0a] border-emerald-400/80 dark:border-emerald-600 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="w-full aspect-[3/4] rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center border border-slate-200/70 dark:border-neutral-800">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={`${item.nameMl} (${item.pron})`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="p-3 text-center text-xs font-bold text-slate-500">
                          {item.nameMl}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-1 text-[11px] font-bold">
                      <span
                        className={
                          isSold
                            ? 'text-rose-700 dark:text-rose-400'
                            : isLimited
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-emerald-700 dark:text-emerald-400'
                        }
                      >
                        {isSold
                          ? t(lang, 'status_sold_out')
                          : isLimited
                            ? t(lang, 'status_limited')
                            : t(lang, 'status_available')}
                      </span>
                      {item.refNum !== null && (
                        <span className="tabular-nums text-slate-500 dark:text-neutral-400">
                          #{String(item.refNum).padStart(2, '0')}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                      {item.nameMl}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-snug break-words">
                      {item.pron}
                      {item.nameEn ? ` · ${item.nameEn}` : ''}
                    </p>

                    {!isSold && item.priceOnCall ? (
                      <p className="mt-1.5 text-xs sm:text-sm font-bold text-[#082d59] dark:text-sky-300">
                        {t(lang, 'call_to_confirm_price')}
                      </p>
                    ) : !isSold && item.price ? (
                      <p className="mt-1.5 text-sm sm:text-base font-extrabold text-[#082d59] dark:text-sky-300 tabular-nums">
                        ₹{item.price} {unitSuffix(item.unit, lang)}
                      </p>
                    ) : null}

                    {details && (
                      <p className="mt-1 text-xs text-slate-700 dark:text-neutral-300 leading-snug break-words">
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
                        className="flex-1 min-h-[40px] px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100"
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

      {/* Sticky Contact Bar (compact < 64px height to respect 15% cap) */}
      {(snapshot.phoneDigits || snapshot.mapsUrl) && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-slate-200 dark:border-neutral-800 px-3 py-2 pb-safe">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            {snapshot.phoneDigits && snapshot.phone && (
              <>
                <a
                  href={`tel:+${snapshot.phoneDigits}`}
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#082d59] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
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
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
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
                className="min-h-[44px] px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 text-[#082d59] dark:text-sky-200 font-bold text-xs flex items-center justify-center gap-1 shrink-0"
              >
                <MapPin className="w-4 h-4 shrink-0" />
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
