import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Images,
  MessageCircle,
  Share2,
  X,
} from 'lucide-react';
import { BUSINESS_LOGO_PATH } from '../data/seedCatalog';
import { t } from '../data/translations';
import type {
  BusinessSettings,
  DailyRecord,
  FishItem,
  Language,
} from '../types';
import {
  buildPosterFilename,
  imageSrcToJpegFile,
  renderDailyMenuPosterToDataUrl,
  resolveFishBestPhotoSrc,
} from '../utils/posterRenderer';
import { dataUrlToBlob, downloadBlob } from '../utils/speechAndDate';
import {
  buildWhatsAppListMessage,
  openWhatsAppTextLink,
  shareFilesWithTextOrFallback,
  sharePosterFileOrFallback,
} from '../utils/whatsappHelper';

interface ShareListModalProps {
  lang: Language;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  settings: BusinessSettings;
  onClose: () => void;
}

type ShareMode = 'menu_card' | 'all_photos' | 'text_only';

export const ShareListModal: React.FC<ShareListModalProps> = ({
  lang,
  fishList,
  dailyRecord,
  settings,
  onClose,
}) => {
  const [msgLang, setMsgLang] = useState<Language>('ml');
  const [shareMode, setShareMode] = useState<ShareMode>('all_photos');
  const [messageText, setMessageText] = useState(() =>
    buildWhatsAppListMessage(fishList, dailyRecord, settings, 'ml')
  );
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [showOpenWaBtn, setShowOpenWaBtn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuPreviewUrl, setMenuPreviewUrl] = useState<string | null>(null);
  const [menuRendering, setMenuRendering] = useState(false);

  const availableFish = useMemo(
    () => fishList.filter((f) => dailyRecord.entries[f.id]?.available),
    [fishList, dailyRecord.entries]
  );

  const fishPhotoEntries = useMemo(
    () =>
      availableFish
        .map((fish) => ({
          fish,
          src: resolveFishBestPhotoSrc(fish, dailyRecord.entries[fish.id]),
        }))
        .filter((item): item is { fish: FishItem; src: string } => !!item.src),
    [availableFish, dailyRecord.entries]
  );

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      for (const item of fishPhotoEntries) {
        init[item.fish.id] = true;
      }
      return init;
    }
  );

  useEffect(() => {
    setSelectedPhotoIds((prev) => {
      const next: Record<string, boolean> = {};
      for (const item of fishPhotoEntries) {
        next[item.fish.id] = prev[item.fish.id] ?? true;
      }
      return next;
    });
  }, [fishPhotoEntries]);

  useEffect(() => {
    setMessageText(
      buildWhatsAppListMessage(fishList, dailyRecord, settings, msgLang)
    );
  }, [fishList, dailyRecord, settings, msgLang]);

  useEffect(() => {
    if (availableFish.length === 0 || shareMode !== 'menu_card') return;
    let cancelled = false;
    setMenuRendering(true);

    renderDailyMenuPosterToDataUrl({
      fishList: availableFish,
      dailyRecord,
      settings,
      lang: msgLang,
      previewScale: 0.5,
    })
      .then((url) => {
        if (!cancelled) {
          setMenuPreviewUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMenuPreviewUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMenuRendering(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [availableFish, dailyRecord, settings, msgLang, shareMode]);

  const checkedPhotoEntries = useMemo(
    () => fishPhotoEntries.filter((item) => selectedPhotoIds[item.fish.id]),
    [fishPhotoEntries, selectedPhotoIds]
  );

  const togglePhotoSelection = (fishId: string) => {
    setSelectedPhotoIds((prev) => ({
      ...prev,
      [fishId]: !prev[fishId],
    }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.getElementById(
        'whatsapp-message-preview'
      ) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  const handleDownloadMenuCard = async () => {
    if (availableFish.length === 0 || busy) return;
    setBusy(true);
    setShareNote('');
    try {
      const dataUrl = await renderDailyMenuPosterToDataUrl({
        fishList: availableFish,
        dailyRecord,
        settings,
        lang: msgLang,
        previewScale: 1,
      });
      const blob = dataUrlToBlob(dataUrl);
      downloadBlob(blob, `innathe-meen-menu-${dailyRecord.dateKey}.jpg`);
      setShareNote(t(lang, 'share_multi_fallback'));
      setShowOpenWaBtn(true);
    } finally {
      setBusy(false);
    }
  };

  const handlePrimaryShare = async () => {
    if (availableFish.length === 0 || busy) return;
    const shareTitle =
      msgLang === 'en' ? settings.businessNameEn : settings.businessNameMl;

    if (shareMode === 'text_only') {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: shareTitle,
            text: messageText,
          });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
        }
      }
      openWhatsAppTextLink(messageText);
      return;
    }

    setBusy(true);
    setShareNote('');
    setShowOpenWaBtn(false);

    try {
      if (shareMode === 'menu_card') {
        const fullPosterUrl = await renderDailyMenuPosterToDataUrl({
          fishList: availableFish,
          dailyRecord,
          settings,
          lang: msgLang,
          previewScale: 1,
        });
        const file = await imageSrcToJpegFile(
          fullPosterUrl,
          `innathe-meen-menu-${dailyRecord.dateKey}.jpg`
        );
        const files = file ? [file] : [];
        const outcome = await shareFilesWithTextOrFallback(
          files,
          shareTitle,
          messageText
        );
        if (outcome === 'fallback_downloaded') {
          setCopied(true);
          setShareNote(t(lang, 'share_multi_fallback'));
          setShowOpenWaBtn(true);
        }
        return;
      }

      // shareMode === 'all_photos'
      const targets =
        checkedPhotoEntries.length > 0 ? checkedPhotoEntries : fishPhotoEntries;
      if (targets.length === 0) {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          try {
            await navigator.share({
              title: shareTitle,
              text: messageText,
            });
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
          }
        }
        openWhatsAppTextLink(messageText);
        return;
      }
      const converted = await Promise.all(
        targets.map((item) =>
          imageSrcToJpegFile(
            item.src,
            buildPosterFilename(item.fish.id, dailyRecord.dateKey)
          )
        )
      );
      const files = converted.filter((f): f is File => f !== null);
      if (files.length === 0) {
        openWhatsAppTextLink(messageText);
        return;
      }
      const outcome = await shareFilesWithTextOrFallback(
        files,
        shareTitle,
        messageText
      );
      if (outcome === 'fallback_downloaded') {
        setCopied(true);
        setShareNote(t(lang, 'share_multi_fallback'));
        setShowOpenWaBtn(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleShareSinglePhoto = async (fish: FishItem, src: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const filename = buildPosterFilename(fish.id, dailyRecord.dateKey);
      const file = await imageSrcToJpegFile(src, filename);
      if (!file) return;
      const readerUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      const outcome = await sharePosterFileOrFallback(
        readerUrl,
        filename,
        fish.nameMl,
        `${fish.nameMl} — ${
          msgLang === 'en' ? settings.whatsappGroupNameEn : settings.whatsappGroupNameMl
        }`
      );
      if (outcome === 'fallback_downloaded') {
        setShareNote(t(lang, 'share_fallback'));
        setShowOpenWaBtn(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-list-title"
    >
      <div className="w-full sm:max-w-xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={BUSINESS_LOGO_PATH}
              alt={settings.whatsappGroupNameMl}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-neutral-700"
            />
            <div className="min-w-0 flex-1">
              <h2
                id="share-list-title"
                className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words"
              >
                {t(lang, 'make_list')}
              </h2>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-snug break-words">
                {msgLang === 'en'
                  ? settings.whatsappGroupNameEn
                  : settings.whatsappGroupNameMl}
              </p>
            </div>
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
        <div className="overflow-y-auto p-4 space-y-4">
          {availableFish.length === 0 ? (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-4 text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
              {t(lang, 'no_available_selected')}
            </div>
          ) : (
            <>
              {/* Count + Language Switch */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-neutral-400">
                  {t(lang, 'available_count')}:{' '}
                  <strong className="tabular-nums text-[#082d59] dark:text-sky-300">
                    {availableFish.length}
                  </strong>
                </span>
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-neutral-900 border border-transparent dark:border-neutral-800 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setMsgLang('ml')}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold leading-snug ${
                      msgLang === 'ml'
                        ? 'bg-white dark:bg-neutral-800 text-[#082d59] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    മലയാളം
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgLang('en')}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold leading-snug ${
                      msgLang === 'en'
                        ? 'bg-white dark:bg-neutral-800 text-[#082d59] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Share Mode Segmented Tabs */}
              <div
                className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-neutral-900 border border-slate-200/70 dark:border-neutral-800 rounded-2xl"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={shareMode === 'all_photos'}
                  onClick={() => setShareMode('all_photos')}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 leading-snug text-center transition ${
                    shareMode === 'all_photos'
                      ? 'bg-[#082d59] dark:bg-[#0879d9] text-white shadow-xs'
                      : 'text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Images className="w-4 h-4 shrink-0" />
                  <span className="break-words">
                    {t(lang, 'share_mode_all_photos')}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={shareMode === 'menu_card'}
                  onClick={() => setShareMode('menu_card')}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 leading-snug text-center transition ${
                    shareMode === 'menu_card'
                      ? 'bg-[#082d59] dark:bg-[#0879d9] text-white shadow-xs'
                      : 'text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span className="break-words">{t(lang, 'share_mode_menu_card')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={shareMode === 'text_only'}
                  onClick={() => setShareMode('text_only')}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-[11px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 leading-snug text-center transition ${
                    shareMode === 'text_only'
                      ? 'bg-[#082d59] dark:bg-[#0879d9] text-white shadow-xs'
                      : 'text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span className="break-words">{t(lang, 'share_mode_text_only')}</span>
                </button>
              </div>

              {/* Mode 1: Composite Menu Card Preview */}
              {shareMode === 'menu_card' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-neutral-300 leading-snug">
                      {t(lang, 'menu_card_preview')}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleDownloadMenuCard}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-neutral-800 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>{t(lang, 'download_menu_card')}</span>
                    </button>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-black flex items-center justify-center min-h-[180px]">
                    {menuRendering && !menuPreviewUrl ? (
                      <p className="text-xs text-slate-500 dark:text-neutral-400 p-6">
                        {t(lang, 'share_preparing')}
                      </p>
                    ) : menuPreviewUrl ? (
                      <img
                        src={menuPreviewUrl}
                        alt={t(lang, 'menu_card_preview')}
                        className="w-full max-h-[340px] object-contain"
                      />
                    ) : null}
                  </div>
                </div>
              )}

              {/* Mode 2: Individual Selected Fish Photos */}
              {shareMode === 'all_photos' && fishPhotoEntries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-neutral-300 leading-snug">
                    {t(lang, 'selected_photos_to_send')} (
                    <span className="tabular-nums">{checkedPhotoEntries.length}</span>/
                    <span className="tabular-nums">{fishPhotoEntries.length}</span>)
                  </p>
                  <div className="space-y-2">
                    {fishPhotoEntries.map(({ fish, src }) => {
                      const isChecked = !!selectedPhotoIds[fish.id];
                      return (
                        <div
                          key={fish.id}
                          className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2.5 rounded-2xl border border-slate-200 dark:border-neutral-800 p-2.5 bg-slate-50 dark:bg-black"
                        >
                          <button
                            type="button"
                            onClick={() => togglePhotoSelection(fish.id)}
                            aria-pressed={isChecked}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                          >
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition ${
                                isChecked
                                  ? 'bg-[#0879d9] border-[#0879d9] text-white'
                                  : 'bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700'
                              }`}
                            >
                              {isChecked && <Check className="w-4 h-4 stroke-[2.5]" />}
                            </span>
                            <img
                              src={src}
                              alt={fish.nameMl}
                              className="w-11 h-14 rounded-lg object-contain bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-neutral-800 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                                {fish.nameMl}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-neutral-400 leading-snug break-words">
                                {fish.pronunciationLatin}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleShareSinglePhoto(fish, src)}
                            className="min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-[#082d59] dark:text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 leading-snug text-center hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                          >
                            <Share2 className="w-4 h-4 shrink-0" />
                            <span>{t(lang, 'share_photo')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Editable WhatsApp Caption */}
              <textarea
                id="whatsapp-message-preview"
                rows={5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-black text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed focus:bg-white dark:focus:bg-[#0a0a0a]"
              />

              <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 p-3 text-xs sm:text-sm text-[#082d59] dark:text-sky-200 leading-relaxed break-words">
                {t(lang, 'open_group_note')}
              </div>

              {shareNote && (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 space-y-2.5">
                  <p className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-200 leading-relaxed break-words">
                    {shareNote}
                  </p>
                  {showOpenWaBtn && (
                    <button
                      type="button"
                      onClick={() => openWhatsAppTextLink(messageText)}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-emerald-700"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>{t(lang, 'open_whatsapp_btn')}</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Footer Actions */}
        {availableFish.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-safe">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[48px] px-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-800 dark:text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-neutral-800 leading-snug text-center"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="break-words">{t(lang, 'copied_message')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 shrink-0" />
                  <span className="break-words">{t(lang, 'copy_message')}</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handlePrimaryShare}
              className="min-h-[48px] px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60 leading-snug text-center"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span className="break-words">
                {busy
                  ? t(lang, 'share_preparing')
                  : shareMode === 'text_only'
                    ? t(lang, 'share_whatsapp')
                    : t(lang, 'share_photos_and_list')}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
