import type {
  BusinessSettings,
  DailyRecord,
  FishItem,
  Language,
  PriceUnit,
} from '../types';
import { dataUrlToBlob, downloadBlob } from './speechAndDate';

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

export async function sharePosterFileOrFallback(
  posterDataUrl: string,
  filename: string,
  title: string,
  text: string
): Promise<'shared' | 'fallback_downloaded'> {
  const blob = dataUrlToBlob(posterDataUrl);
  const file = new File([blob], filename, { type: 'image/jpeg' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared';
      }
      // Fall through to download + wa.me fallback
    }
  }

  downloadBlob(blob, filename);
  return 'fallback_downloaded';
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
