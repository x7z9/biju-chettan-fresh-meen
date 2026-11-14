import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  Download,
  ImagePlus,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { t } from '../data/translations';
import type {
  BusinessSettings,
  DailyFishEntry,
  FishItem,
  Language,
  PosterBackground,
  PosterLanguageMode,
} from '../types';
import {
  buildPosterFilename,
  renderFishPosterToDataUrl,
} from '../utils/posterRenderer';
import {
  dataUrlToBlob,
  downloadBlob,
  fileToOptimizedDataUrl,
} from '../utils/speechAndDate';
import {
  openWhatsAppTextLink,
  sharePosterFileOrFallback,
} from '../utils/whatsappHelper';

interface PosterStudioModalProps {
  lang: Language;
  fish: FishItem;
  dateKey: string;
  entry?: DailyFishEntry;
  includePrices: boolean;
  settings: BusinessSettings;
  onClose: () => void;
  onSavePosterAndPhoto: (params: {
    fishId: string;
    actualPhotoDataUrl: string;
    posterDataUrl: string;
    background: PosterBackground;
  }) => Promise<void>;
}

export const PosterStudioModal: React.FC<PosterStudioModalProps> = ({
  lang,
  fish,
  dateKey,
  entry,
  includePrices,
  settings,
  onClose,
  onSavePosterAndPhoto,
}) => {
  const initialRealPhoto =
    entry?.todayPhotoDataUrl || fish.customActualPhotos[0]?.dataUrl || '';

  const [actualPhotoSrc, setActualPhotoSrc] = useState<string>(initialRealPhoto);
  const [background, setBackground] = useState<PosterBackground>(
    fish.preferredBackground || settings.defaultBackground
  );
  const [posterLanguage, setPosterLanguage] = useState<PosterLanguageMode>(
    settings.posterLanguage
  );
  const [showNote, setShowNote] = useState<boolean>(settings.showDisclaimerOnPoster);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [brightness, setBrightness] = useState(103);
  const [contrast, setContrast] = useState(105);
  const [viewMode, setViewMode] = useState<'poster' | 'original'>('poster');
  const [showControls, setShowControls] = useState(false);

  const [renderedPosterUrl, setRenderedPosterUrl] = useState<string>('');
  const [isFullResReady, setIsFullResReady] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const buildRenderOptions = (previewScale: number) => ({
    fish,
    photoSrc: actualPhotoSrc,
    background,
    posterLanguage,
    settings: { ...settings, showDisclaimerOnPoster: showNote },
    zoom,
    offsetX,
    offsetY,
    brightness,
    contrast,
    priceAmount: entry?.priceAmount,
    priceUnit: entry?.priceUnit,
    includePrice: includePrices,
    noteText: entry?.note,
    previewScale,
  });

  useEffect(() => {
    let cancelled = false;
    if (!actualPhotoSrc) {
      setRenderedPosterUrl('');
      setIsFullResReady(false);
      return;
    }

    setIsFullResReady(false);
    setIsRendering(true);
    let settleTimer: number | undefined;
    const rafId = window.requestAnimationFrame(() => {
      renderFishPosterToDataUrl({
        fish,
        photoSrc: actualPhotoSrc,
        background,
        posterLanguage,
        settings: { ...settings, showDisclaimerOnPoster: showNote },
        zoom,
        offsetX,
        offsetY,
        brightness,
        contrast,
        priceAmount: entry?.priceAmount,
        priceUnit: entry?.priceUnit,
        includePrice: includePrices,
        noteText: entry?.note,
        previewScale: 0.5,
      })
        .then((fastUrl) => {
          if (cancelled) return;
          setRenderedPosterUrl(fastUrl);
          setErrorMsg('');
          setIsRendering(false);
          settleTimer = window.setTimeout(() => {
            if (cancelled) return;
            renderFishPosterToDataUrl({
              fish,
              photoSrc: actualPhotoSrc,
              background,
              posterLanguage,
              settings: { ...settings, showDisclaimerOnPoster: showNote },
              zoom,
              offsetX,
              offsetY,
              brightness,
              contrast,
              priceAmount: entry?.priceAmount,
              priceUnit: entry?.priceUnit,
              includePrice: includePrices,
              noteText: entry?.note,
              previewScale: 1,
            })
              .then((hdUrl) => {
                if (!cancelled) {
                  setRenderedPosterUrl(hdUrl);
                  setIsFullResReady(true);
                }
              })
              .catch(() => {
                // Keep preview if full-res settle fails
              });
          }, 180);
        })
        .catch(() => {
          if (!cancelled) {
            setErrorMsg(t(lang, 'error_photo'));
            setIsRendering(false);
          }
        });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (settleTimer !== undefined) window.clearTimeout(settleTimer);
    };
  }, [
    actualPhotoSrc,
    background,
    posterLanguage,
    showNote,
    zoom,
    offsetX,
    offsetY,
    brightness,
    contrast,
    fish,
    settings,
    entry?.priceAmount,
    entry?.priceUnit,
    entry?.note,
    includePrices,
    lang,
  ]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setStatusMessage('');
    try {
      const optimized = await fileToOptimizedDataUrl(file);
      setActualPhotoSrc(optimized);
      setViewMode('poster');
      resetFraming();
    } catch {
      setErrorMsg(t(lang, 'error_photo'));
    } finally {
      e.target.value = '';
    }
  };

  const resetFraming = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setBrightness(103);
    setContrast(105);
  };

  const ensureFullResPosterUrl = async (): Promise<string> => {
    if (!actualPhotoSrc) return '';
    if (isFullResReady && renderedPosterUrl) return renderedPosterUrl;
    const hdUrl = await renderFishPosterToDataUrl(buildRenderOptions(1));
    setRenderedPosterUrl(hdUrl);
    setIsFullResReady(true);
    return hdUrl;
  };

  const handleSave = async () => {
    if (!actualPhotoSrc) return;
    const hdUrl = await ensureFullResPosterUrl();
    if (!hdUrl) return;
    await onSavePosterAndPhoto({
      fishId: fish.id,
      actualPhotoDataUrl: actualPhotoSrc,
      posterDataUrl: hdUrl,
      background,
    });
    setStatusMessage(t(lang, 'saved'));
  };

  const handleDownload = async () => {
    const hdUrl = await ensureFullResPosterUrl();
    if (!hdUrl) return;
    const filename = buildPosterFilename(fish.id, dateKey);
    const blob = dataUrlToBlob(hdUrl);
    downloadBlob(blob, filename);
    setStatusMessage(t(lang, 'saved'));
  };

  const handleShare = async () => {
    if (!actualPhotoSrc) return;
    const hdUrl = await ensureFullResPosterUrl();
    if (!hdUrl) return;
    await onSavePosterAndPhoto({
      fishId: fish.id,
      actualPhotoDataUrl: actualPhotoSrc,
      posterDataUrl: hdUrl,
      background,
    });
    setStatusMessage(t(lang, 'saved'));
    const filename = buildPosterFilename(fish.id, dateKey);
    const caption = `${fish.nameMl} (${fish.pronunciationLatin}) — ${
      lang === 'en' ? settings.whatsappGroupNameEn : settings.whatsappGroupNameMl
    }`;
    const outcome = await sharePosterFileOrFallback(
      hdUrl,
      filename,
      fish.nameMl,
      caption
    );
    if (outcome === 'fallback_downloaded') {
      setStatusMessage(t(lang, 'share_fallback'));
      openWhatsAppTextLink(caption);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="poster-studio-title"
    >
      <div className="w-full sm:max-w-xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2
              id="poster-studio-title"
              className="text-sm sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words"
            >
              {fish.nameMl} · {t(lang, 'poster_creator_title')}
            </h2>
            <p className="text-xs text-slate-600 dark:text-neutral-400 truncate mt-0.5">
              {fish.pronunciationLatin}
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

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-4">
          {errorMsg && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-sm text-rose-800 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          {statusMessage && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Take / Choose Real Catch Photo */}
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
            <label className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-[#0879d9] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-[#0667ba] text-center leading-snug">
              <Camera className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'take_photo')}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="sr-only"
              />
            </label>
            <label className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#082d59] dark:text-sky-200 border border-sky-200 dark:border-sky-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 text-center leading-snug">
              <ImagePlus className="w-4 h-4 shrink-0 text-[#0879d9] dark:text-sky-400" />
              <span>{t(lang, 'choose_photo')}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="sr-only"
              />
            </label>
          </div>

          {/* Saved real photos selector if any */}
          {fish.customActualPhotos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {fish.customActualPhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActualPhotoSrc(p.dataUrl)}
                  className={`w-14 h-18 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-100 dark:bg-black ${
                    actualPhotoSrc === p.dataUrl
                      ? 'border-[#0879d9]'
                      : 'border-slate-200 dark:border-neutral-800'
                  }`}
                >
                  <img
                    src={p.dataUrl}
                    alt={fish.nameMl}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Preview Area (3:4 portrait) */}
          {!actualPhotoSrc ? (
            <div className="rounded-3xl bg-sky-50 dark:bg-sky-950/30 border-2 border-dashed border-sky-300 dark:border-sky-800 p-6 text-center space-y-2">
              <p className="text-sm sm:text-base font-bold text-[#082d59] dark:text-sky-200 leading-relaxed">
                {t(lang, 'poster_upload_prompt')}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
                {t(lang, 'reference_warning')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Before / After toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-transparent dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('poster')}
                    className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      viewMode === 'poster'
                        ? 'bg-white dark:bg-neutral-800 text-[#082d59] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-neutral-300'
                    }`}
                  >
                    {t(lang, 'poster_enhanced')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('original')}
                    className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      viewMode === 'original'
                        ? 'bg-white dark:bg-neutral-800 text-[#082d59] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-neutral-300'
                    }`}
                  >
                    {t(lang, 'poster_original')}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowControls((v) => !v)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-transparent dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-4 h-4 shrink-0" />
                  <span>{t(lang, 'app_settings')}</span>
                </button>
              </div>

              {/* 3:4 Container */}
              <div className="w-full max-w-[320px] mx-auto aspect-[3/4] rounded-2xl bg-slate-100 dark:bg-black overflow-hidden shadow-md border border-slate-200 dark:border-neutral-800 flex items-center justify-center relative">
                {viewMode === 'original' ? (
                  <img
                    src={actualPhotoSrc}
                    alt={fish.nameMl}
                    className="w-full h-full object-contain"
                  />
                ) : renderedPosterUrl ? (
                  <img
                    src={renderedPosterUrl}
                    alt={`${fish.nameMl} poster`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-sm text-slate-500">...</div>
                )}
                {isRendering && (
                  <div className="absolute inset-0 bg-white/40 dark:bg-black/60 flex items-center justify-center text-xs font-semibold text-[#082d59] dark:text-sky-300">
                    ...
                  </div>
                )}
              </div>

              {/* Background Quick Switchers */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBackground('blue-tray')}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border-2 leading-snug text-center ${
                    background === 'blue-tray'
                      ? 'border-[#0879d9] bg-sky-50 dark:bg-sky-950/60 text-[#082d59] dark:text-sky-200'
                      : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300'
                  }`}
                >
                  {t(lang, 'blue_tray')}
                </button>
                <button
                  type="button"
                  onClick={() => setBackground('banana-leaf')}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border-2 leading-snug text-center ${
                    background === 'banana-leaf'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300'
                  }`}
                >
                  {t(lang, 'banana_leaf')}
                </button>
              </div>

              {showControls && (
                <div className="rounded-2xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 p-3.5 space-y-3 text-xs sm:text-sm">
                  <div className="space-y-1.5">
                    <span className="block font-semibold text-slate-700 dark:text-neutral-200">
                      {t(lang, 'poster_lang_label')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(['ml', 'en', 'bilingual'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPosterLanguage(mode)}
                          className={`flex-1 min-w-[92px] min-h-[42px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border leading-snug text-center break-words ${
                            posterLanguage === mode
                              ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                              : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-800'
                          }`}
                        >
                          {t(lang, `poster_lang_${mode}` as const)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="font-semibold text-slate-700 dark:text-neutral-200">
                      {t(lang, 'poster_show_note')}
                    </span>
                    <input
                      type="checkbox"
                      checked={showNote}
                      onChange={(e) => setShowNote(e.target.checked)}
                      className="w-5 h-5 accent-[#0879d9]"
                    />
                  </label>

                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-neutral-800">
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 dark:text-neutral-300 mb-1">
                        <span>{t(lang, 'poster_zoom')}</span>
                        <span className="tabular-nums">{zoom.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.85"
                        max="1.6"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-[#0879d9]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 dark:text-neutral-300 mb-1">
                          <span>{t(lang, 'poster_brightness')}</span>
                          <span className="tabular-nums">{brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="85"
                          max="125"
                          step="1"
                          value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full accent-[#0879d9]"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 dark:text-neutral-300 mb-1">
                          <span>{t(lang, 'poster_contrast')}</span>
                          <span className="tabular-nums">{contrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="90"
                          max="125"
                          step="1"
                          value={contrast}
                          onChange={(e) => setContrast(Number(e.target.value))}
                          className="w-full accent-[#0879d9]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetFraming}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0879d9] dark:text-sky-400 py-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t(lang, 'poster_reset_framing')}</span>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-neutral-400 text-center leading-relaxed">
                {t(lang, 'poster_honesty_note')}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {actualPhotoSrc && (
          <div className="p-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black space-y-2 pb-safe shrink-0">
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleSave}
                className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 leading-snug text-center"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{t(lang, 'save')}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-neutral-800 leading-snug text-center"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{t(lang, 'download_photo')}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="w-full min-h-[50px] px-4 py-3 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] leading-snug text-center"
            >
              <Share2 className="w-5 h-5 shrink-0 text-[#facc15]" />
              <span>{t(lang, 'share_photo')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
