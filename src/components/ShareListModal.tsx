import React, { useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, Share2, X } from 'lucide-react';
import { BUSINESS_LOGO_PATH } from '../data/seedCatalog';
import { t } from '../data/translations';
import type {
  BusinessSettings,
  DailyRecord,
  FishItem,
  Language,
} from '../types';
import { buildPosterFilename } from '../utils/posterRenderer';
import {
  buildWhatsAppListMessage,
  openWhatsAppTextLink,
  sharePosterFileOrFallback,
} from '../utils/whatsappHelper';

interface ShareListModalProps {
  lang: Language;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  settings: BusinessSettings;
  onClose: () => void;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({
  lang,
  fishList,
  dailyRecord,
  settings,
  onClose,
}) => {
  const [msgLang, setMsgLang] = useState<Language>(lang);
  const [messageText, setMessageText] = useState(() =>
    buildWhatsAppListMessage(fishList, dailyRecord, settings, lang)
  );
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState('');

  useEffect(() => {
    setMessageText(
      buildWhatsAppListMessage(fishList, dailyRecord, settings, msgLang)
    );
  }, [fishList, dailyRecord, settings, msgLang]);

  const availableFish = fishList.filter(
    (f) => dailyRecord.entries[f.id]?.available
  );
  const fishWithPosters = availableFish.filter(
    (f) => !!dailyRecord.entries[f.id]?.todayPosterDataUrl
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback selection copy
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

  const handleShareText = async () => {
    if (availableFish.length === 0) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title:
            msgLang === 'en' ? settings.businessNameEn : settings.businessNameMl,
          text: messageText,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    openWhatsAppTextLink(messageText);
  };

  const handleSharePoster = async (fish: FishItem) => {
    const posterUrl = dailyRecord.entries[fish.id]?.todayPosterDataUrl;
    if (!posterUrl) return;
    const filename = buildPosterFilename(fish.id, dailyRecord.dateKey);
    const outcome = await sharePosterFileOrFallback(
      posterUrl,
      filename,
      fish.nameMl,
      `${fish.nameMl} — ${
        msgLang === 'en' ? settings.whatsappGroupNameEn : settings.whatsappGroupNameMl
      }`
    );
    if (outcome === 'fallback_downloaded') {
      setShareNote(t(lang, 'share_fallback'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-list-title"
    >
      <div className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 shadow-2xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={BUSINESS_LOGO_PATH}
              alt={settings.whatsappGroupNameMl}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-neutral-700"
            />
            <div className="min-w-0 flex-1">
              <h2 id="share-list-title" className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
                {t(lang, 'make_list')}
              </h2>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-snug break-words">
                {msgLang === 'en' ? settings.whatsappGroupNameEn : settings.whatsappGroupNameMl}
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

        <div className="overflow-y-auto p-4 space-y-4">
          {availableFish.length === 0 ? (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-4 text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
              {t(lang, 'no_available_selected')}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-neutral-400">
                  {t(lang, 'available_count')}:{' '}
                  <strong className="tabular-nums text-[#082d59] dark:text-sky-300">
                    {availableFish.length}
                  </strong>
                </span>
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-neutral-900 border border-transparent dark:border-neutral-800 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setMsgLang('ml')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold leading-snug ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold leading-snug ${
                      msgLang === 'en'
                        ? 'bg-white dark:bg-neutral-800 text-[#082d59] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <textarea
                id="whatsapp-message-preview"
                rows={7}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-black text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed focus:bg-white dark:focus:bg-[#0a0a0a]"
              />

              <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 p-3 text-xs sm:text-sm text-[#082d59] dark:text-sky-200 leading-relaxed break-words">
                {t(lang, 'open_group_note')}
              </div>

              {shareNote && (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-200 leading-relaxed break-words">
                  {shareNote}
                </div>
              )}

              {fishWithPosters.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-neutral-300 leading-snug">
                    {t(lang, 'share_photo')} ({fishWithPosters.length})
                  </p>
                  <div className="space-y-2">
                    {fishWithPosters.map((fish) => (
                      <div
                        key={fish.id}
                        className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2.5 rounded-2xl border border-slate-200 dark:border-neutral-800 p-2.5 bg-slate-50 dark:bg-black"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={dailyRecord.entries[fish.id]?.todayPosterDataUrl}
                            alt={fish.nameMl}
                            className="w-10 h-12 rounded-lg object-contain bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-neutral-800 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                              {fish.nameMl}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-snug break-words">
                              {fish.pronunciationLatin}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSharePoster(fish)}
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0879d9] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 leading-snug text-center"
                        >
                          <Share2 className="w-4 h-4 shrink-0" />
                          <span>{t(lang, 'share_photo')}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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
              onClick={handleShareText}
              className="min-h-[48px] px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-emerald-700 leading-snug text-center"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span className="break-words">{t(lang, 'share_whatsapp')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
