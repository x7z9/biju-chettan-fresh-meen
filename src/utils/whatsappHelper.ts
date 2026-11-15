import type {
  BusinessSettings,
  DailyRecord,
  FishItem,
  Language,
  PriceUnit,
} from '../types';
import { dataUrlToBlob } from './speechAndDate';

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

export function buildWhatsAppListMessage(
  fishList: FishItem[],
  dailyRecord: DailyRecord,
  settings: BusinessSettings,
  lang: Language
): string {
  const availableFish = fishList.filter((f) => dailyRecord.entries[f.id]?.available);

  if (lang === 'en') {
    const lines: string[] = [
      `🐟 Fish available today`,
      `📍 ${settings.locationEn}`,
    ];
    for (const fish of availableFish) {
      const entry = dailyRecord.entries[fish.id];
      let line = `• ${fish.nameMl} (${fish.pronunciationLatin})`;
      if (entry?.note?.trim()) {
        line += ` — ${entry.note.trim()}`;
      }
      if (dailyRecord.includePrices && entry?.priceAmount?.trim()) {
        line += ` — ₹${entry.priceAmount.trim()}${unitSuffix(entry.priceUnit, 'en')}`;
      }
      lines.push(line);
    }
    lines.push(`Call for price: ${settings.phoneDisplay}`);
    lines.push(`— ${settings.whatsappGroupNameEn}`);
    return lines.join('\n');
  }

  const lines: string[] = [
    `🐟 ഇന്നത്തെ മീനുകൾ ലഭ്യമാണ്`,
    `📍 ${settings.locationMl}`,
  ];
  for (const fish of availableFish) {
    const entry = dailyRecord.entries[fish.id];
    let line = `• ${fish.nameMl}`;
    if (entry?.note?.trim()) {
      line += ` (${entry.note.trim()})`;
    }
    if (dailyRecord.includePrices && entry?.priceAmount?.trim()) {
      line += ` — ₹${entry.priceAmount.trim()}${unitSuffix(entry.priceUnit, 'ml')}`;
    }
    lines.push(line);
  }
  lines.push(`വില അറിയാൻ വിളിക്കുക: ${settings.phoneDisplay}`);
  lines.push(`— ${settings.whatsappGroupNameMl}`);
  return lines.join('\n');
}

export function buildWhatsAppBatchMessage(
  batchFish: FishItem[],
  batchIndex: number,
  totalBatches: number,
  startNum: number,
  totalFishCount: number,
  dailyRecord: DailyRecord,
  settings: BusinessSettings,
  lang: Language
): string {
  if (totalBatches <= 1) {
    return buildWhatsAppListMessage(batchFish, dailyRecord, settings, lang);
  }
  const endNum = startNum + batchFish.length - 1;
  const isFirst = batchIndex === 0;
  const isLast = batchIndex === totalBatches - 1;

  if (lang === 'en') {
    const lines: string[] = [
      `🐟 Fish available today — Part ${batchIndex + 1}/${totalBatches} (${startNum}–${endNum} of ${totalFishCount})`,
    ];
    if (isFirst) {
      lines.push(`📍 ${settings.locationEn}`);
    }
    for (const fish of batchFish) {
      const entry = dailyRecord.entries[fish.id];
      let line = `• ${fish.nameMl} (${fish.pronunciationLatin})`;
      if (entry?.note?.trim()) {
        line += ` — ${entry.note.trim()}`;
      }
      if (dailyRecord.includePrices && entry?.priceAmount?.trim()) {
        line += ` — ₹${entry.priceAmount.trim()}${unitSuffix(entry.priceUnit, 'en')}`;
      }
      lines.push(line);
    }
    if (isLast) {
      lines.push(`📞 Call for price: ${settings.phoneDisplay}`);
    }
    lines.push(`— ${settings.whatsappGroupNameEn}`);
    return lines.join('\n');
  }

  const lines: string[] = [
    `🐟 ഇന്നത്തെ മീനുകൾ — ഭാഗം ${batchIndex + 1}/${totalBatches} (${startNum}–${endNum}/${totalFishCount})`,
  ];
  if (isFirst) {
    lines.push(`📍 ${settings.locationMl}`);
  }
  for (const fish of batchFish) {
    const entry = dailyRecord.entries[fish.id];
    let line = `• ${fish.nameMl}`;
    if (entry?.note?.trim()) {
      line += ` (${entry.note.trim()})`;
    }
    if (dailyRecord.includePrices && entry?.priceAmount?.trim()) {
      line += ` — ₹${entry.priceAmount.trim()}${unitSuffix(entry.priceUnit, 'ml')}`;
    }
    lines.push(line);
  }
  if (isLast) {
    lines.push(`📞 വില അറിയാൻ വിളിക്കുക: ${settings.phoneDisplay}`);
  }
  lines.push(`— ${settings.whatsappGroupNameMl}`);
  return lines.join('\n');
}

export type DirectShareOutcome =
  | 'shared'
  | 'shared_caption_copied'
  | 'cancelled'
  | 'gesture_expired'
  | 'batch_required'
  | 'unsupported';

const MAX_BROWSER_SHARE_FILES = 10;

function canSharePayload(data: ShareData): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    return true;
  }
  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

export function isSingleFileShareSupported(sampleFile?: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    return true;
  }
  const probe =
    sampleFile ||
    new File([new Uint8Array([0xff, 0xd8, 0xff])], 'probe.jpg', {
      type: 'image/jpeg',
    });
  return canSharePayload({ files: [probe] });
}

export function detectShareBatchSize(files: File[], text?: string): number {
  if (files.length === 0) return 0;
  const ceiling = Math.min(files.length, MAX_BROWSER_SHARE_FILES);
  const candidates = [ceiling, 8, 5, 3, 1].filter(
    (n, idx, arr) => n > 0 && n <= files.length && arr.indexOf(n) === idx
  );
  for (const size of candidates) {
    const slice = files.slice(0, size);
    if (
      (text && canSharePayload({ files: slice, text })) ||
      canSharePayload({ files: slice })
    ) {
      return size;
    }
  }
  return 0;
}

export function splitIntoShareBatches<T>(items: T[], maxPerBatch: number): T[][] {
  if (items.length === 0) return [];
  const step = Math.max(1, maxPerBatch);
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += step) {
    batches.push(items.slice(i, i + step));
  }
  return batches;
}

async function copyTextQuietly(text: string): Promise<void> {
  if (!text || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard rejection
  }
}

export async function directShareFilesWithText(
  files: File[],
  text: string,
  title?: string
): Promise<DirectShareOutcome> {
  if (
    files.length === 0 ||
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function'
  ) {
    return 'unsupported';
  }

  // Chromium / Android Web Share API enforces <= 10 files (and payload cap)
  if (files.length > MAX_BROWSER_SHARE_FILES) {
    return 'batch_required';
  }

  const supportsFilesAndText =
    canSharePayload({ files, text }) ||
    (title ? canSharePayload({ files, text, title }) : false);
  const supportsFilesOnly = canSharePayload({ files });

  if (!supportsFilesAndText && !supportsFilesOnly) {
    if (files.length > 1 && isSingleFileShareSupported(files[0])) {
      return 'batch_required';
    }
    return 'unsupported';
  }

  try {
    if (supportsFilesAndText) {
      await navigator.share({
        files,
        text,
        ...(title && canSharePayload({ files, text, title }) ? { title } : {}),
      });
      // Keep caption handy on clipboard in case iOS/OEM WhatsApp omits text on multi-image shares
      if (files.length > 1 && text) {
        void copyTextQuietly(text);
      }
      return 'shared';
    }

    // Platform allows sharing files only without inline text; share immediately and copy caption for paste
    await navigator.share({ files });
    await copyTextQuietly(text);
    return 'shared_caption_copied';
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === 'AbortError') {
        return 'cancelled';
      }
      if (err.name === 'NotAllowedError') {
        return 'gesture_expired';
      }
    }
    if (files.length > 1 && isSingleFileShareSupported(files[0])) {
      return 'batch_required';
    }
    return 'unsupported';
  }
}

export async function sharePosterFileDirect(
  posterDataUrl: string,
  filename: string,
  title: string,
  text: string
): Promise<DirectShareOutcome> {
  const blob = dataUrlToBlob(posterDataUrl);
  const file = new File([blob], filename, { type: 'image/jpeg' });
  return directShareFilesWithText([file], text, title);
}

export function openWhatsAppTextLink(message: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
