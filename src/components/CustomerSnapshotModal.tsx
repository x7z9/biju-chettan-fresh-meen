import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  MessageCircle,
  QrCode,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { t } from '../data/translations';
import type {
  BusinessSettings,
  DailyRecord,
  FishItem,
  Language,
} from '../types';
import {
  formatBytes,
  generateStandaloneCustomerHtml,
} from '../utils/customerHtmlExport';
import {
  buildCustomerSnapshotPayload,
  buildCustomerSnapshotUrl,
} from '../utils/customerSnapshot';
import { renderQrToPngDataUrl, renderQrToSvgString } from '../utils/qrCode';
import { dataUrlToBlob, downloadBlob } from '../utils/speechAndDate';
import { openWhatsAppTextLink } from '../utils/whatsappHelper';

interface CustomerSnapshotModalProps {
  lang: Language;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  settings: BusinessSettings;
  onSaveDefaults?: (settings: BusinessSettings) => Promise<void>;
  onClose: () => void;
}

export const CustomerSnapshotModal: React.FC<CustomerSnapshotModalProps> = ({
  lang,
  fishList,
  dailyRecord,
  settings,
  onSaveDefaults,
  onClose,
}) => {
  const defaults = settings.snapshotDefaults || {
    includePhone: settings.showPhoneToCustomers !== false,
    includePrices: dailyRecord.includePrices,
    includeQuantity: true,
    includeNotes: true,
    includeDirections: Boolean(settings.showDirectionsLink && settings.mapsQueryUrl),
    customerLang: lang,
  };

  const [includePhone, setIncludePhone] = useState(
    defaults.includePhone && settings.showPhoneToCustomers !== false
  );
  const [includePrices, setIncludePrices] = useState(defaults.includePrices);
  const [includeQuantity, setIncludeQuantity] = useState(defaults.includeQuantity);
  const [includeNotes, setIncludeNotes] = useState(defaults.includeNotes);
  const [includeDirections, setIncludeDirections] = useState(
    Boolean(defaults.includeDirections && settings.showDirectionsLink && settings.mapsQueryUrl)
  );
  const [customerLang, setCustomerLang] = useState<Language>(defaults.customerLang);
  const [includeHtmlPhotos, setIncludeHtmlPhotos] = useState(true);

  const [urlInfo, setUrlInfo] = useState<{
    url: string;
    length: number;
    isLong: boolean;
    isTooLong: boolean;
  }>({ url: '', length: 0, isLong: false, isTooLong: false });
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [htmlBusy, setHtmlBusy] = useState(false);
  const [htmlSizeWarning, setHtmlSizeWarning] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const payload = useMemo(
    () =>
      buildCustomerSnapshotPayload(fishList, dailyRecord, settings, {
        includePhone,
        includePrices,
        includeQuantity,
        includeNotes,
        includeDirections,
        customerLang,
        includeSoldOut: true,
      }),
    [
      fishList,
      dailyRecord,
      settings,
      includePhone,
      includePrices,
      includeQuantity,
      includeNotes,
      includeDirections,
      customerLang,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    void buildCustomerSnapshotUrl(payload).then((res) => {
      if (!cancelled) setUrlInfo(res);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    if (!onSaveDefaults) return;
    const timer = window.setTimeout(() => {
      void onSaveDefaults({
        ...settings,
        snapshotDefaults: {
          includePhone,
          includePrices,
          includeQuantity,
          includeNotes,
          includeDirections,
          customerLang,
        },
      }).catch(() => {});
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includePhone, includePrices, includeQuantity, includeNotes, includeDirections, customerLang]);

  const qrSvg = useMemo(() => {
    if (!showQr || !urlInfo.url) return null;
    return renderQrToSvgString(urlInfo.url);
  }, [showQr, urlInfo.url]);

  const handleCopyLink = async () => {
    if (!urlInfo.url) return;
    try {
      await navigator.clipboard.writeText(urlInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setStatusMsg(urlInfo.url);
    }
  };

  const handleWhatsAppShare = () => {
    if (!urlInfo.url) return;
    const msg =
      customerLang === 'en'
        ? `🐟 Today's Fresh Fish List (${dailyRecord.dateKey}) — ${settings.businessNameEn}:\n${urlInfo.url}`
        : `🐟 ഇന്നത്തെ ഫ്രെഷ് മീൻ പട്ടിക (${dailyRecord.dateKey}) — ${settings.businessNameMl}:\n${urlInfo.url}`;
    openWhatsAppTextLink(msg);
  };

  const handleNativeShare = async () => {
    if (!urlInfo.url) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title:
            customerLang === 'en' ? settings.businessNameEn : settings.businessNameMl,
          text:
            customerLang === 'en'
              ? `Today's Fresh Fish (${dailyRecord.dateKey})`
              : `ഇന്നത്തെ ഫ്രെഷ് മീനുകൾ (${dailyRecord.dateKey})`,
          url: urlInfo.url,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await handleCopyLink();
  };

  const handleDownloadHtml = async () => {
    if (htmlBusy) return;
    setHtmlBusy(true);
    setHtmlSizeWarning('');
    try {
      const res = await generateStandaloneCustomerHtml(payload, {
        includePhotos: includeHtmlPhotos,
        fishList,
        dailyRecord,
      });
      const blob = new Blob([res.html], { type: 'text/html;charset=utf-8' });
      downloadBlob(blob, `biju-fresh-fish-${dailyRecord.dateKey}.html`);
      if (res.exceedsHardWarn) {
        setHtmlSizeWarning(`${t(lang, 'snapshot_html_large_warning')} (${res.sizeFormatted})`);
      } else {
        setStatusMsg(
          `${t(lang, 'snapshot_size_label')}: ${res.sizeFormatted} ✓`
        );
      }
    } finally {
      setHtmlBusy(false);
    }
  };

  const handleDownloadQrPng = () => {
    if (!urlInfo.url) return;
    const png = renderQrToPngDataUrl(urlInfo.url, 600);
    if (!png) return;
    downloadBlob(dataUrlToBlob(png), `biju-fish-menu-qr-${dailyRecord.dateKey}.png`);
  };

  const estimatedBytes = new Blob([JSON.stringify(payload)]).size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-snapshot-modal-title"
    >
      <div className="w-full sm:max-w-xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2
              id="customer-snapshot-modal-title"
              className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words"
            >
              {t(lang, 'customer_snapshot_title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums mt-0.5">
              {payload.items.length} {t(lang, 'fish_word')} · {t(lang, 'snapshot_size_label')}:{' '}
              {formatBytes(estimatedBytes)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-900 flex items-center justify-center shrink-0"
            aria-label={t(lang, 'close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* Honest static snapshot notice */}
          <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-3 text-xs sm:text-sm text-[#082d59] dark:text-sky-200 flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400 mt-0.5" />
            <span className="break-words">{t(lang, 'snapshot_honesty_banner')}</span>
          </div>

          {/* Customer Language Switch */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-neutral-300">
              {t(lang, 'snapshot_lang_label')}
            </span>
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200/70 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setCustomerLang('ml')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold ${
                  customerLang === 'ml'
                    ? 'bg-[#082d59] dark:bg-[#0879d9] text-white'
                    : 'text-slate-600 dark:text-neutral-300'
                }`}
              >
                മലയാളം
              </button>
              <button
                type="button"
                onClick={() => setCustomerLang('en')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold ${
                  customerLang === 'en'
                    ? 'bg-[#082d59] dark:bg-[#0879d9] text-white'
                    : 'text-slate-600 dark:text-neutral-300'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Privacy Checkboxes */}
          <div className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3 space-y-2.5">
            <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[36px]">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200">
                {t(lang, 'snapshot_include_phone')}
              </span>
              <input
                type="checkbox"
                checked={includePhone}
                onChange={(e) => setIncludePhone(e.target.checked)}
                className="w-5 h-5 accent-[#0879d9]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[36px]">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200">
                {t(lang, 'snapshot_include_prices')}
              </span>
              <input
                type="checkbox"
                checked={includePrices}
                onChange={(e) => setIncludePrices(e.target.checked)}
                className="w-5 h-5 accent-[#0879d9]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[36px]">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200">
                {t(lang, 'snapshot_include_quantity')}
              </span>
              <input
                type="checkbox"
                checked={includeQuantity}
                onChange={(e) => setIncludeQuantity(e.target.checked)}
                className="w-5 h-5 accent-[#0879d9]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[36px]">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200">
                {t(lang, 'snapshot_include_notes')}
              </span>
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                className="w-5 h-5 accent-[#0879d9]"
              />
            </label>
            {settings.showDirectionsLink && settings.mapsQueryUrl && (
              <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[36px]">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200">
                  {t(lang, 'snapshot_include_directions')}
                </span>
                <input
                  type="checkbox"
                  checked={includeDirections}
                  onChange={(e) => setIncludeDirections(e.target.checked)}
                  className="w-5 h-5 accent-[#0879d9]"
                />
              </label>
            )}
          </div>

          {/* URL length guardrail warning */}
          {urlInfo.isLong && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {t(lang, 'snapshot_url_long_warning')} ({urlInfo.length} chars)
              </span>
            </div>
          )}

          {/* Share Link Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-neutral-800"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{t(lang, 'snapshot_copied_link')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>{t(lang, 'snapshot_copy_link')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-emerald-700"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'snapshot_share_wa')}</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#0879d9] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#0667ba]"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'snapshot_native_share')}</span>
            </button>

            {urlInfo.url && (
              <a
                href={urlInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-[#082d59] dark:text-sky-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-sky-100 dark:hover:bg-sky-900/60"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>{t(lang, 'view_day')} (Preview)</span>
              </a>
            )}
          </div>

          {/* Offline Standalone HTML Export */}
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 p-3.5 space-y-2.5 bg-slate-50 dark:bg-black">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200">
                {t(lang, 'snapshot_html_with_photos')}
              </span>
              <input
                type="checkbox"
                checked={includeHtmlPhotos}
                onChange={(e) => setIncludeHtmlPhotos(e.target.checked)}
                className="w-5 h-5 accent-[#0879d9]"
              />
            </label>
            <button
              type="button"
              disabled={htmlBusy}
              onClick={handleDownloadHtml}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] disabled:opacity-60"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{htmlBusy ? t(lang, 'share_preparing') : t(lang, 'snapshot_download_html')}</span>
            </button>
            {htmlSizeWarning && (
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                {htmlSizeWarning}
              </p>
            )}
          </div>

          {/* QR Code Toggle */}
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 p-3 space-y-3">
            <button
              type="button"
              onClick={() => setShowQr((v) => !v)}
              className="w-full min-h-[42px] flex items-center justify-between gap-2 text-xs sm:text-sm font-bold text-[#082d59] dark:text-sky-300"
            >
              <span className="flex items-center gap-2">
                <QrCode className="w-4 h-4 shrink-0" />
                <span>{t(lang, 'qr_section_title')}</span>
              </span>
              <span>{showQr ? t(lang, 'close') : t(lang, 'view_day')}</span>
            </button>
            {showQr && (
              <div className="space-y-3 text-center pt-1">
                {qrSvg ? (
                  <>
                    <div className="w-48 h-48 mx-auto rounded-2xl bg-white p-2 border border-slate-200 overflow-hidden">
                      <img
                        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
                        alt={t(lang, 'qr_section_title')}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadQrPng}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-800 dark:text-white inline-flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>{t(lang, 'qr_download_png')}</span>
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t(lang, 'snapshot_url_long_warning')}
                  </p>
                )}
              </div>
            )}
          </div>

          {statusMsg && (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 break-all">
              {statusMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
