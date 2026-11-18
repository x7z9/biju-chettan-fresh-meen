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
import { resolveEntryStatus } from '../db/indexedDb';
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
  buildWhatsAppBatchMessage,
  buildWhatsAppListMessage,
  detectShareBatchSize,
  directShareFilesWithText,
  openWhatsAppTextLink,
  splitIntoShareBatches,
  type DirectShareOutcome,
} from '../utils/whatsappHelper';

interface ShareListModalProps {
  lang: Language;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  settings: BusinessSettings;
  onClose: () => void;
}

type ShareMode = 'menu_card' | 'all_photos' | 'text_only';

interface PairedShareBatch {
  index: number;
  startNum: number;
  endNum: number;
  items: Array<{ fish: FishItem; src: string; file: File }>;
}

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
  const [customBatchTexts, setCustomBatchTexts] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [showOpenWaBtn, setShowOpenWaBtn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuPreviewUrl, setMenuPreviewUrl] = useState<string | null>(null);
  const [menuCardFile, setMenuCardFile] = useState<File | null>(null);
  const [menuRendering, setMenuRendering] = useState(false);

  // Pre-prepared in-memory JPEG File objects so navigator.share() fires synchronously on tap
  const [preparedFiles, setPreparedFiles] = useState<Record<string, File>>({});
  const [activeBatchIdx, setActiveBatchIdx] = useState(0);
  const [completedBatches, setCompletedBatches] = useState<Record<number, boolean>>({});
  const [overrideBatchSize, setOverrideBatchSize] = useState<number | null>(null);

  const availableFish = useMemo(
    () =>
      fishList.filter((f) => {
        const st = resolveEntryStatus(dailyRecord.entries[f.id]);
        return st === 'available' || st === 'limited';
      }),
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

  // Eagerly pre-prepare JPEG File objects in memory in smooth non-blocking slices
  useEffect(() => {
    if (fishPhotoEntries.length === 0) {
      setPreparedFiles({});
      return;
    }
    let cancelled = false;
    let rafId = 0;

    const prepareAll = async () => {
      const nextMap: Record<string, File> = {};
      const chunkSize = 2;
      for (let i = 0; i < fishPhotoEntries.length; i += chunkSize) {
        if (cancelled) return;
        const slice = fishPhotoEntries.slice(i, i + chunkSize);
        const built = await Promise.all(
          slice.map(async (item) => {
            const file = await imageSrcToJpegFile(
              item.src,
              buildPosterFilename(item.fish.id, dailyRecord.dateKey)
            );
            return { id: item.fish.id, file };
          })
        );
        if (cancelled) return;
        for (const entry of built) {
          if (entry.file) {
            nextMap[entry.id] = entry.file;
          }
        }
        setPreparedFiles({ ...nextMap });
        await new Promise<void>((resolve) => setTimeout(resolve, 16));
      }
    };

    rafId = window.requestAnimationFrame(() => {
      if (!cancelled) void prepareAll();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [fishPhotoEntries, dailyRecord.dateKey]);

  // Render preview + pre-prepare full menu card File when Menu Card mode is active
  useEffect(() => {
    if (availableFish.length === 0 || shareMode !== 'menu_card') return;
    let cancelled = false;
    setMenuRendering(true);
    setMenuCardFile(null);

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

    renderDailyMenuPosterToDataUrl({
      fishList: availableFish,
      dailyRecord,
      settings,
      lang: msgLang,
      previewScale: 1,
    })
      .then((hdUrl) =>
        imageSrcToJpegFile(hdUrl, `innathe-meen-menu-${dailyRecord.dateKey}.jpg`)
      )
      .then((file) => {
        if (!cancelled && file) {
          setMenuCardFile(file);
        }
      })
      .catch(() => {
        // Handled lazily on tap if needed
      });

    return () => {
      cancelled = true;
    };
  }, [availableFish, dailyRecord, settings, msgLang, shareMode]);

  const checkedPhotoEntries = useMemo(
    () => fishPhotoEntries.filter((item) => selectedPhotoIds[item.fish.id]),
    [fishPhotoEntries, selectedPhotoIds]
  );

  // Reset batch state when selection or mode changes
  useEffect(() => {
    setActiveBatchIdx(0);
    setCompletedBatches({});
    setCustomBatchTexts({});
    setOverrideBatchSize(null);
    setShareNote('');
    setShowOpenWaBtn(false);
  }, [checkedPhotoEntries.length, shareMode, msgLang]);

  const activeTargetEntries = useMemo(
    () => (checkedPhotoEntries.length > 0 ? checkedPhotoEntries : fishPhotoEntries),
    [checkedPhotoEntries, fishPhotoEntries]
  );

  const preparedItems = useMemo(
    () =>
      activeTargetEntries
        .map((item) => {
          const file = preparedFiles[item.fish.id];
          return file ? { ...item, file } : null;
        })
        .filter((x): x is { fish: FishItem; src: string; file: File } => x !== null),
    [activeTargetEntries, preparedFiles]
  );

  const allTargetsPrepared =
    activeTargetEntries.length > 0 &&
    preparedItems.length === activeTargetEntries.length;

  const fullListMessage = useMemo(
    () => buildWhatsAppListMessage(fishList, dailyRecord, settings, msgLang),
    [fishList, dailyRecord, settings, msgLang]
  );

  const detectedBatchSize = useMemo(() => {
    if (overrideBatchSize && overrideBatchSize > 0) return overrideBatchSize;
    if (preparedItems.length === 0) return 10;
    const files = preparedItems.map((p) => p.file);
    const size = detectShareBatchSize(files, fullListMessage);
    return size > 0 ? size : 10;
  }, [overrideBatchSize, preparedItems, fullListMessage]);

  const pairedBatches: PairedShareBatch[] = useMemo(() => {
    if (preparedItems.length === 0) return [];
    const chunks = splitIntoShareBatches(preparedItems, detectedBatchSize);
    let cursor = 1;
    return chunks.map((items, index) => {
      const startNum = cursor;
      const endNum = cursor + items.length - 1;
      cursor = endNum + 1;
      return { index, startNum, endNum, items };
    });
  }, [preparedItems, detectedBatchSize]);

  const isMultiBatch = shareMode === 'all_photos' && pairedBatches.length > 1;
  const safeActiveBatchIdx =
    activeBatchIdx < pairedBatches.length ? activeBatchIdx : 0;
  const currentBatch = pairedBatches[safeActiveBatchIdx];

  // Auto-generate matching caption (for active batch when >10 photos, else full list)
  useEffect(() => {
    if (shareMode === 'all_photos' && pairedBatches.length > 1 && currentBatch) {
      if (customBatchTexts[currentBatch.index] !== undefined) {
        setMessageText(customBatchTexts[currentBatch.index]);
        return;
      }
      setMessageText(
        buildWhatsAppBatchMessage(
          currentBatch.items.map((i) => i.fish),
          currentBatch.index,
          pairedBatches.length,
          currentBatch.startNum,
          preparedItems.length,
          dailyRecord,
          settings,
          msgLang
        )
      );
    } else {
      setMessageText(fullListMessage);
    }
  }, [
    shareMode,
    pairedBatches.length,
    currentBatch,
    customBatchTexts,
    preparedItems.length,
    dailyRecord,
    settings,
    msgLang,
    fullListMessage,
  ]);

  const handleMessageEdit = (val: string) => {
    setMessageText(val);
    if (isMultiBatch && currentBatch) {
      setCustomBatchTexts((prev) => ({
        ...prev,
        [currentBatch.index]: val,
      }));
    }
  };

  const togglePhotoSelection = (fishId: string) => {
    setSelectedPhotoIds((prev) => ({
      ...prev,
      [fishId]: !prev[fishId],
    }));
  };

  const handleCopy = async () => {
    const textToCopy = isMultiBatch ? fullListMessage : messageText;
    try {
      await navigator.clipboard.writeText(textToCopy);
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

  const copyMessageForFallback = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(messageText);
        setCopied(true);
      } catch {
        // Ignore clipboard errors
      }
    }
  };

  const handleOutcomeFeedback = async (
    outcome: DirectShareOutcome,
    batchIdx?: number,
    totalBatches?: number
  ) => {
    if (outcome === 'shared' || outcome === 'shared_caption_copied') {
      if (
        typeof batchIdx === 'number' &&
        typeof totalBatches === 'number' &&
        totalBatches > 1
      ) {
        const nextCompleted = { ...completedBatches, [batchIdx]: true };
        setCompletedBatches(nextCompleted);

        // Find next unsent batch
        let nextIdx = -1;
        for (let i = 0; i < totalBatches; i++) {
          if (!nextCompleted[i]) {
            nextIdx = i;
            break;
          }
        }

        if (nextIdx === -1) {
          setShareNote(t(lang, 'share_all_batches_done'));
        } else {
          setActiveBatchIdx(nextIdx);
          const sentCount = Object.values(nextCompleted).filter(Boolean).length;
          setShareNote(
            lang === 'en'
              ? `Part ${batchIdx + 1}/${totalBatches} sent ✓ (${sentCount}/${totalBatches} done). Tap Send for Part ${nextIdx + 1}/${totalBatches}!`
              : `ഭാഗം ${batchIdx + 1}/${totalBatches} അയച്ചു ✓ ഇനി ഭാഗം ${nextIdx + 1}/${totalBatches} അയക്കാൻ ബട്ടൺ തൊടുക!`
          );
        }
      } else if (outcome === 'shared_caption_copied') {
        setCopied(true);
        setShareNote(t(lang, 'share_caption_copied_note'));
      } else {
        setShareNote('');
      }
      return;
    }

    if (outcome === 'cancelled') {
      setShareNote(t(lang, 'share_cancelled_note'));
      return;
    }

    if (outcome === 'gesture_expired') {
      setShareNote(t(lang, 'share_tap_again_ready'));
      return;
    }

    if (outcome === 'unsupported') {
      await copyMessageForFallback();
      setShareNote(t(lang, 'share_direct_unsupported'));
      setShowOpenWaBtn(true);
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

    setShareNote('');
    setShowOpenWaBtn(false);

    if (shareMode === 'menu_card') {
      if (menuCardFile) {
        const outcome = await directShareFilesWithText(
          [menuCardFile],
          messageText,
          shareTitle
        );
        await handleOutcomeFeedback(outcome);
        return;
      }

      setBusy(true);
      try {
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
        if (!file) {
          await copyMessageForFallback();
          openWhatsAppTextLink(messageText);
          return;
        }
        setMenuCardFile(file);
        const outcome = await directShareFilesWithText(
          [file],
          messageText,
          shareTitle
        );
        await handleOutcomeFeedback(outcome);
      } finally {
        setBusy(false);
      }
      return;
    }

    // shareMode === 'all_photos'
    if (activeTargetEntries.length === 0) {
      openWhatsAppTextLink(fullListMessage);
      return;
    }

    // Synchronous zero-delay path when files are already prepared in memory
    if (allTargetsPrepared && currentBatch && pairedBatches.length > 0) {
      const batchFiles = currentBatch.items.map((i) => i.file);
      const outcome = await directShareFilesWithText(
        batchFiles,
        messageText,
        shareTitle
      );

      if (outcome === 'batch_required' && batchFiles.length > 1) {
        // Device enforces smaller per-share count or MB cap than detected: step down cleanly
        const smallerStep = Math.max(1, Math.min(5, Math.floor(batchFiles.length / 2)));
        setOverrideBatchSize(smallerStep);
        const smallerChunks = splitIntoShareBatches(preparedItems, smallerStep);
        const firstChunk = smallerChunks[0];
        const firstCaption = buildWhatsAppBatchMessage(
          firstChunk.map((i) => i.fish),
          0,
          smallerChunks.length,
          1,
          preparedItems.length,
          dailyRecord,
          settings,
          msgLang
        );
        const retryOutcome = await directShareFilesWithText(
          firstChunk.map((i) => i.file),
          firstCaption,
          shareTitle
        );
        await handleOutcomeFeedback(retryOutcome, 0, smallerChunks.length);
        return;
      }

      await handleOutcomeFeedback(outcome, currentBatch.index, pairedBatches.length);
      return;
    }

    // Fallback preparation only if tapped before background preparation finished
    setBusy(true);
    try {
      const nextPrepared: Record<string, File> = { ...preparedFiles };
      await Promise.all(
        activeTargetEntries.map(async (item) => {
          if (nextPrepared[item.fish.id]) return;
          const file = await imageSrcToJpegFile(
            item.src,
            buildPosterFilename(item.fish.id, dailyRecord.dateKey)
          );
          if (file) nextPrepared[item.fish.id] = file;
        })
      );
      setPreparedFiles(nextPrepared);

      const rebuilt = activeTargetEntries
        .map((item) => {
          const file = nextPrepared[item.fish.id];
          return file ? { ...item, file } : null;
        })
        .filter((x): x is { fish: FishItem; src: string; file: File } => x !== null);

      if (rebuilt.length === 0) {
        openWhatsAppTextLink(fullListMessage);
        return;
      }

      const batchSize = detectShareBatchSize(
        rebuilt.map((r) => r.file),
        fullListMessage
      );
      if (batchSize <= 0) {
        await copyMessageForFallback();
        setShareNote(t(lang, 'share_direct_unsupported'));
        setShowOpenWaBtn(true);
        return;
      }

      const chunks = splitIntoShareBatches(rebuilt, batchSize);
      const firstCaption = buildWhatsAppBatchMessage(
        chunks[0].map((i) => i.fish),
        0,
        chunks.length,
        1,
        rebuilt.length,
        dailyRecord,
        settings,
        msgLang
      );
      const outcome = await directShareFilesWithText(
        chunks[0].map((i) => i.file),
        firstCaption,
        shareTitle
      );
      await handleOutcomeFeedback(outcome, 0, chunks.length);
    } finally {
      setBusy(false);
    }
  };

  const handleShareSinglePhoto = async (fish: FishItem, src: string) => {
    if (busy) return;
    const entry = dailyRecord.entries[fish.id];
    const parts = [fish.nameMl];
    const publicNote = (entry?.publicNote ?? entry?.note)?.trim();
    if (entry?.status === 'limited') {
      parts.push(msgLang === 'en' ? '[Limited Stock]' : '[കുറച്ചു മാത്രം]');
    }
    if (entry?.quantityNote?.trim()) parts.push(`(${entry.quantityNote.trim()})`);
    if (publicNote) parts.push(`(${publicNote})`);
    if (entry?.priceOnCall) {
      parts.push(`— ${msgLang === 'en' ? 'Call for price' : 'വില വിളിച്ചു ചോദിക്കുക'}`);
    } else if (
      dailyRecord.includePrices &&
      entry?.sharePrice !== false &&
      entry?.priceAmount?.trim()
    ) {
      parts.push(`— ₹${entry.priceAmount.trim()}`);
    }
    const caption = `${parts.join(' ')} • ${
      msgLang === 'en' ? settings.whatsappGroupNameEn : settings.whatsappGroupNameMl
    }`;

    const cachedFile = preparedFiles[fish.id];
    if (cachedFile) {
      const outcome = await directShareFilesWithText(
        [cachedFile],
        caption,
        fish.nameMl
      );
      await handleOutcomeFeedback(outcome);
      return;
    }

    setBusy(true);
    try {
      const filename = buildPosterFilename(fish.id, dailyRecord.dateKey);
      const file = await imageSrcToJpegFile(src, filename);
      if (!file) return;
      setPreparedFiles((prev) => ({ ...prev, [fish.id]: file }));
      const outcome = await directShareFilesWithText([file], caption, fish.nameMl);
      await handleOutcomeFeedback(outcome);
    } finally {
      setBusy(false);
    }
  };

  const primaryCtaLabel = (() => {
    if (busy) return t(lang, 'share_preparing');
    if (shareMode === 'text_only') return t(lang, 'share_whatsapp');
    if (shareMode === 'all_photos' && isMultiBatch && currentBatch) {
      return `${t(lang, 'share_send_batch_prefix')} ${currentBatch.index + 1}/${pairedBatches.length} (${currentBatch.startNum}–${currentBatch.endNum})`;
    }
    return t(lang, 'share_photos_and_list');
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-list-title"
    >
      <div className="w-full sm:max-w-xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
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
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
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

              {/* Mode 2: Individual Selected Fish Photos + Multi-Batch Stepper */}
              {shareMode === 'all_photos' && fishPhotoEntries.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-700 dark:text-neutral-300 leading-snug">
                      {t(lang, 'selected_photos_to_send')} (
                      <span className="tabular-nums">{checkedPhotoEntries.length}</span>/
                      <span className="tabular-nums">{fishPhotoEntries.length}</span>)
                    </p>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg tabular-nums ${
                        allTargetsPrepared
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400'
                      }`}
                    >
                      {allTargetsPrepared
                        ? `${t(lang, 'share_photos_ready')} ✓`
                        : `${t(lang, 'share_preparing')} (${preparedItems.length}/${activeTargetEntries.length})`}
                    </span>
                  </div>

                  {/* Interactive Multi-Batch Stepper when > 10 individual photos are selected */}
                  {isMultiBatch && currentBatch && (
                    <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 space-y-2.5">
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                        {t(lang, 'share_batch_notice')}
                      </p>

                      {/* Clickable Part Selector */}
                      <div className="flex flex-wrap gap-1.5">
                        {pairedBatches.map((batch) => {
                          const isActive = batch.index === currentBatch.index;
                          const isDone = !!completedBatches[batch.index];
                          return (
                            <button
                              key={batch.index}
                              type="button"
                              onClick={() => setActiveBatchIdx(batch.index)}
                              className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition tabular-nums ${
                                isActive
                                  ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9] shadow-xs'
                                  : isDone
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-300 dark:border-neutral-700'
                              }`}
                            >
                              {isDone && <Check className="w-3.5 h-3.5 shrink-0" />}
                              <span>
                                {t(lang, 'share_part_label')} {batch.index + 1} (
                                {batch.startNum}–{batch.endNum})
                              </span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => openWhatsAppTextLink(fullListMessage)}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-neutral-800 flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{t(lang, 'share_send_full_text_btn')}</span>
                        </button>
                      </div>

                      {/* Mini Thumbnail Preview of the Individual Photos in Active Part */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {currentBatch.items.map(({ fish, src }) => (
                          <img
                            key={fish.id}
                            src={src}
                            alt={fish.nameMl}
                            title={fish.nameMl}
                            className="w-9 h-12 rounded-md object-cover border border-amber-300/80 dark:border-amber-700 shrink-0 bg-white dark:bg-neutral-900"
                          />
                        ))}
                      </div>
                    </div>
                  )}

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
                onChange={(e) => handleMessageEdit(e.target.value)}
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
                      onClick={() => openWhatsAppTextLink(fullListMessage)}
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
          <div className="p-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-safe shrink-0">
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
              <span className="break-words">{primaryCtaLabel}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
