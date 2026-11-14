import React, { useState } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';
import { t } from '../data/translations';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { Language } from '../types';

interface PWAInstallButtonProps {
  lang: Language;
  variant?: 'header' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, isSecureContext, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 text-emerald-900 dark:text-emerald-200 text-sm font-medium flex items-center gap-3">
          <Smartphone className="w-5 h-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <span>{t(lang, 'app_installed')}</span>
        </div>
      );
    }
    return null;
  }

  const handleTap = async () => {
    if (isInstallable) {
      const result = await install();
      if (result === 'unavailable') {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  // In header, only show button when installable OR on iOS Safari (or if card variant in More screen)
  if (variant === 'header' && !isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleTap}
          className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#facc15] text-[#082d59] font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm hover:bg-yellow-300 active:scale-[0.98] transition whitespace-nowrap shrink-0"
          aria-label={t(lang, 'install')}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">{t(lang, 'install')}</span>
          <span className="sm:hidden">{t(lang, 'install_app')}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleTap}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-semibold text-base flex items-center justify-center gap-2.5 shadow-sm hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] active:scale-[0.99] transition leading-snug text-center"
        >
          <Download className="w-5 h-5 shrink-0" />
          <span className="break-words">{t(lang, 'install')}</span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 p-6 shadow-2xl pb-safe">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h2 id="pwa-install-guide-title" className="text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {t(lang, 'install')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900 shrink-0"
                aria-label={t(lang, 'close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-neutral-300 break-words">
              {t(lang, 'install_help')}
            </p>

            {!isSecureContext && (
              <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3.5 text-sm text-amber-900 dark:text-amber-200 leading-relaxed break-words">
                {t(lang, 'install_https_note')}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {isIOS ? (
                <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 p-4 text-sm text-slate-800 dark:text-neutral-200 space-y-2">
                  <div className="font-semibold text-[#082d59] dark:text-sky-300 flex items-center gap-2">
                    <Share className="w-4 h-4 shrink-0" />
                    <span>iPhone / iPad (Safari)</span>
                  </div>
                  <p className="leading-relaxed break-words">{t(lang, 'install_ios')}</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 p-4 text-sm text-slate-800 dark:text-neutral-200 space-y-2">
                  <div className="font-semibold text-[#082d59] dark:text-sky-300">Android (Chrome)</div>
                  <p className="leading-relaxed break-words">{t(lang, 'install_android')}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full min-h-[48px] rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-semibold text-base hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] leading-snug text-center"
            >
              {t(lang, 'close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
