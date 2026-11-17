import { resolveEntryStatus } from '../db/indexedDb';
import type {
  BusinessSettings,
  DailyFishEntry,
  DailyRecord,
  FishItem,
  Language,
  MessageTemplateItem,
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

function formatPhoneWithOwner(settings: BusinessSettings): string {
  const owner = settings.ownerName?.trim();
  return owner ? `${owner} — ${settings.phoneDisplay}` : settings.phoneDisplay;
}

export function formatFishLineForWhatsApp(
  fish: FishItem,
  entry: DailyFishEntry | undefined,
  includePrices: boolean,
  lang: Language
): string {
  const status = resolveEntryStatus(entry);
  const publicNote = (entry?.publicNote ?? entry?.note ?? '').trim();
  const detailParts = [
    entry?.sizeGrade?.trim(),
    entry?.quantityNote?.trim(),
    entry?.sourcePlace?.trim(),
    publicNote,
  ].filter(Boolean);

  let line =
    lang === 'en'
      ? `• ${fish.nameMl} (${fish.pronunciationLatin})`
      : `• ${fish.nameMl}`;

  if (status === 'limited') {
    line += lang === 'en' ? ' [Limited]' : ' [കുറച്ചു മാത്രം]';
  }
  if (detailParts.length > 0) {
    line += lang === 'en' ? ` — ${detailParts.join(', ')}` : ` (${detailParts.join(', ')})`;
  }
  const allowFishPrice = includePrices && entry?.sharePrice !== false;
  if (allowFishPrice) {
    if (entry?.priceOnCall) {
      line += lang === 'en' ? ' — Call for rate' : ' — വില വിളിച്ചു ചോദിക്കുക';
    } else if (entry?.priceAmount?.trim()) {
      line += ` — ₹${entry.priceAmount.trim()}${unitSuffix(entry.priceUnit, lang)}`;
    }
  }
  return line;
}

export function buildWhatsAppListMessage(
  fishList: FishItem[],
  dailyRecord: DailyRecord,
  settings: BusinessSettings,
  lang: Language
): string {
  const availableFish = fishList.filter((f) => {
    const st = resolveEntryStatus(dailyRecord.entries[f.id]);
    return st === 'available' || st === 'limited';
  });

  if (lang === 'en') {
    const lines: string[] = [
      `🐟 Fish available today`,
      `📍 ${settings.locationEn}`,
    ];
    for (const fish of availableFish) {
      lines.push(
        formatFishLineForWhatsApp(
          fish,
          dailyRecord.entries[fish.id],
          dailyRecord.includePrices,
          'en'
        )
      );
    }
    lines.push(`Call for price: ${formatPhoneWithOwner(settings)}`);
    lines.push(`— ${settings.whatsappGroupNameEn}`);
    return lines.join('\n');
  }

  const lines: string[] = [
    `🐟 ഇന്നത്തെ മീനുകൾ ലഭ്യമാണ്`,
    `📍 ${settings.locationMl}`,
  ];
  for (const fish of availableFish) {
    lines.push(
      formatFishLineForWhatsApp(
        fish,
        dailyRecord.entries[fish.id],
        dailyRecord.includePrices,
        'ml'
      )
    );
  }
  lines.push(`വില അറിയാൻ വിളിക്കുക: ${formatPhoneWithOwner(settings)}`);
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
      lines.push(
        formatFishLineForWhatsApp(
          fish,
          dailyRecord.entries[fish.id],
          dailyRecord.includePrices,
          'en'
        )
      );
    }
    if (isLast) {
      lines.push(`📞 Call for price: ${formatPhoneWithOwner(settings)}`);
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
    lines.push(
      formatFishLineForWhatsApp(
        fish,
        dailyRecord.entries[fish.id],
        dailyRecord.includePrices,
        'ml'
      )
    );
  }
  if (isLast) {
    lines.push(`📞 വില അറിയാൻ വിളിക്കുക: ${formatPhoneWithOwner(settings)}`);
  }
  lines.push(`— ${settings.whatsappGroupNameMl}`);
  return lines.join('\n');
}

export function applyMessageTemplate(
  template: MessageTemplateItem,
  fishList: FishItem[],
  dailyRecord: DailyRecord,
  settings: BusinessSettings,
  lang: Language
): string {
  const activeNames = fishList
    .filter((f) => {
      const st = resolveEntryStatus(dailyRecord.entries[f.id]);
      return st === 'available' || st === 'limited';
    })
    .map((f) => `• ${f.nameMl}`)
    .slice(0, 12);

  const summary =
    activeNames.length > 0
      ? activeNames.join('\n')
      : lang === 'en'
        ? '(See today catch updates)'
        : '(ഇന്നത്തെ മീൻ വിവരങ്ങൾക്ക് വിളിക്കൂ)';

  const rawBody = lang === 'en' ? template.bodyEn : template.bodyMl;
  return rawBody
    .replace(/\{location\}/g, lang === 'en' ? settings.locationEn : settings.locationMl)
    .replace(/\{fish_summary\}/g, summary)
    .replace(/\{owner\}/g, settings.ownerName || 'ബിജു R')
    .replace(/\{phone\}/g, settings.phoneDisplay)
    .replace(
      /\{business\}/g,
      lang === 'en' ? settings.whatsappGroupNameEn : settings.whatsappGroupNameMl
    );
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
      if (files.length > 1 && text) {
        void copyTextQuietly(text);
      }
      return 'shared';
    }

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

export function openWhatsAppTextLink(message: string, targetPhoneDigits?: string): void {
  const cleanDigits = targetPhoneDigits?.replace(/[^0-9]/g, '');
  const base = cleanDigits ? `https://wa.me/${cleanDigits}` : 'https://wa.me/';
  const url = `${base}?text=${encodeURIComponent(message)}`;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
