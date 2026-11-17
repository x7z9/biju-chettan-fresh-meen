import { isSafeImageSrc, resolveEntryStatus } from '../db/indexedDb';
import type {
  BusinessSettings,
  CustomerSnapshotV1,
  DailyRecord,
  FishItem,
  Language,
  SnapshotFishItemV1,
} from '../types';

export interface SnapshotBuildOptions {
  includePhone: boolean;
  includePrices: boolean;
  includeQuantity: boolean;
  includeNotes: boolean;
  includeDirections: boolean;
  customerLang: Language;
  includeSoldOut?: boolean;
}

export const SNAPSHOT_URL_WARN_LENGTH = 2200;
export const SNAPSHOT_URL_HARD_LENGTH = 3600;

function stripToPublicAssetPath(src: string | null | undefined): string | null {
  if (!src || typeof src !== 'string') return null;
  // Never serialize camera/uploaded base64 data: URLs into URL hash snapshots!
  if (src.startsWith('data:') || src.startsWith('blob:')) return null;
  if (!isSafeImageSrc(src)) return null;
  const idx = src.indexOf('assets/');
  if (idx >= 0) {
    return '/' + src.slice(idx).split('?')[0].split('#')[0];
  }
  return null;
}

export function buildCustomerSnapshotPayload(
  fishList: FishItem[],
  dailyRecord: DailyRecord,
  settings: BusinessSettings,
  options: SnapshotBuildOptions
): CustomerSnapshotV1 {
  const items: SnapshotFishItemV1[] = [];
  const includeSold = options.includeSoldOut !== false;

  for (const fish of fishList) {
    const entry = dailyRecord.entries[fish.id];
    const status = resolveEntryStatus(entry);
    if (status === 'not_listed') continue;
    if (status === 'sold_out' && !includeSold) continue;

    const allowPrice =
      options.includePrices &&
      entry?.sharePrice !== false &&
      status !== 'sold_out';
    const hasNumericPrice = Boolean(entry?.priceAmount?.trim());

    const item: SnapshotFishItemV1 = {
      id: fish.id.slice(0, 60),
      refNum: fish.referenceNumber,
      nameMl: fish.nameMl.slice(0, 100),
      pron: fish.pronunciationLatin.slice(0, 100),
      ...(fish.nameEn ? { nameEn: fish.nameEn.slice(0, 100) } : {}),
      status,
    };

    if (allowPrice) {
      if (entry?.priceOnCall) {
        item.priceOnCall = true;
      } else if (hasNumericPrice) {
        item.price = entry!.priceAmount!.trim().slice(0, 24);
        if (entry?.priceUnit) item.unit = entry.priceUnit;
      }
    }

    if (options.includeQuantity) {
      if (entry?.quantityNote?.trim()) {
        item.qty = entry.quantityNote.trim().slice(0, 80);
      }
      if (entry?.sizeGrade?.trim()) {
        item.size = entry.sizeGrade.trim().slice(0, 60);
      }
      if (entry?.sourcePlace?.trim()) {
        item.source = entry.sourcePlace.trim().slice(0, 60);
      }
    }

    // STRICTLY EXCLUDE privateNote! Only read publicNote/legacy note when allowed.
    if (options.includeNotes) {
      const pub = (entry?.publicNote ?? entry?.note ?? '').trim();
      if (pub) {
        item.note = pub.slice(0, 140);
      }
    }

    const staticAsset = stripToPublicAssetPath(fish.referenceImage);
    if (staticAsset) {
      item.img = staticAsset;
    }

    items.push(item);
  }

  const allowPhone =
    options.includePhone && settings.showPhoneToCustomers !== false;
  const safeMapsUrl =
    options.includeDirections &&
    settings.showDirectionsLink &&
    settings.mapsQueryUrl &&
    /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.com\/maps)/i.test(
      settings.mapsQueryUrl.trim()
    )
      ? settings.mapsQueryUrl.trim().slice(0, 260)
      : undefined;

  return {
    v: 1,
    createdAt: Date.now(),
    dateKey: dailyRecord.dateKey,
    lang: options.customerLang,
    businessMl: settings.businessNameMl.slice(0, 100),
    businessEn: settings.businessNameEn.slice(0, 100),
    owner: (settings.ownerName || 'ബിജു R').slice(0, 80),
    locMl: settings.locationMl.slice(0, 140),
    locEn: settings.locationEn.slice(0, 140),
    ...(allowPhone
      ? {
          phone: settings.phoneDisplay.slice(0, 32),
          phoneDigits: settings.phoneDigits.replace(/[^0-9]/g, '').slice(0, 20),
        }
      : {}),
    ...(safeMapsUrl ? { mapsUrl: safeMapsUrl } : {}),
    items: items.slice(0, 60),
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === 'function') {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

async function compressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const cs = new CompressionStream('deflate-raw');
    const readPromise = new Response(cs.readable).arrayBuffer();
    const writer = cs.writable.getWriter();
    await writer.write(new Uint8Array(bytes));
    await writer.close();
    const res = await readPromise;
    return new Uint8Array(res);
  } catch {
    return null;
  }
}

async function decompressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate-raw');
    const readPromise = new Response(ds.readable).arrayBuffer();
    const writer = ds.writable.getWriter();
    await writer.write(new Uint8Array(bytes));
    await writer.close();
    const res = await readPromise;
    return new Uint8Array(res);
  } catch {
    return null;
  }
}

export async function encodeCustomerSnapshotToken(
  payload: CustomerSnapshotV1
): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const rawBytes = new TextEncoder().encode(jsonStr);
  const compressed = await compressDeflateRaw(rawBytes);
  if (compressed && compressed.length < rawBytes.length) {
    return `v1c.${bytesToBase64Url(compressed)}`;
  }
  return `v1u.${bytesToBase64Url(rawBytes)}`;
}

export function getPublicAppBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://x7z9.github.io/biju-chettan-fresh-meen/';
  const basePath =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : '/';
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${window.location.origin}${normalizedBase}`;
}

export async function buildCustomerSnapshotUrl(
  payload: CustomerSnapshotV1,
  baseOverride?: string
): Promise<{ url: string; token: string; length: number; isLong: boolean; isTooLong: boolean }> {
  const token = await encodeCustomerSnapshotToken(payload);
  const base = (baseOverride || getPublicAppBaseUrl()).split('?')[0].split('#')[0];
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const url = `${normalizedBase}?view=customer#market=${token}`;
  return {
    url,
    token,
    length: url.length,
    isLong: url.length > SNAPSHOT_URL_WARN_LENGTH,
    isTooLong: url.length > SNAPSHOT_URL_HARD_LENGTH,
  };
}

function validateSnapshotObject(raw: unknown): CustomerSnapshotV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj.v !== 1 || !Array.isArray(obj.items)) return null;
  if (typeof obj.dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.dateKey)) {
    return null;
  }

  const safeStr = (val: unknown, fallback = '', max = 140) =>
    typeof val === 'string' ? val.slice(0, max) : fallback;

  const items: SnapshotFishItemV1[] = [];
  for (const rawItem of obj.items.slice(0, 60)) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const r = rawItem as Record<string, unknown>;
    const id = safeStr(r.id, '', 60).trim();
    const nameMl = safeStr(r.nameMl, '', 120).trim();
    const pron = safeStr(r.pron, '', 120).trim();
    if (!id || !nameMl) continue;

    const status =
      r.status === 'available' || r.status === 'limited' || r.status === 'sold_out'
        ? r.status
        : 'available';

    const img = stripToPublicAssetPath(
      typeof r.img === 'string' ? r.img : null
    );

    items.push({
      id,
      refNum:
        typeof r.refNum === 'number' && Number.isFinite(r.refNum) ? r.refNum : null,
      nameMl,
      pron: pron || nameMl,
      ...(typeof r.nameEn === 'string' && r.nameEn.trim()
        ? { nameEn: safeStr(r.nameEn.trim(), '', 100) }
        : {}),
      status,
      ...(typeof r.price === 'string' && r.price.trim()
        ? { price: safeStr(r.price.trim(), '', 24) }
        : {}),
      ...(r.unit === 'per_kg' || r.unit === 'per_piece' || r.unit === 'per_packet'
        ? { unit: r.unit }
        : {}),
      ...(r.priceOnCall === true ? { priceOnCall: true } : {}),
      ...(typeof r.qty === 'string' && r.qty.trim()
        ? { qty: safeStr(r.qty.trim(), '', 80) }
        : {}),
      ...(typeof r.size === 'string' && r.size.trim()
        ? { size: safeStr(r.size.trim(), '', 60) }
        : {}),
      ...(typeof r.source === 'string' && r.source.trim()
        ? { source: safeStr(r.source.trim(), '', 60) }
        : {}),
      ...(typeof r.note === 'string' && r.note.trim()
        ? { note: safeStr(r.note.trim(), '', 140) }
        : {}),
      ...(img ? { img } : {}),
    });
  }

  const mapsUrlRaw = safeStr(obj.mapsUrl, '', 260).trim();
  const safeMapsUrl =
    /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.com\/maps)/i.test(
      mapsUrlRaw
    )
      ? mapsUrlRaw
      : undefined;

  return {
    v: 1,
    createdAt:
      typeof obj.createdAt === 'number' && Number.isFinite(obj.createdAt)
        ? obj.createdAt
        : Date.now(),
    dateKey: obj.dateKey,
    lang: obj.lang === 'en' ? 'en' : 'ml',
    businessMl: safeStr(obj.businessMl, 'ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ', 100),
    businessEn: safeStr(obj.businessEn, 'Biju Chettante Fresh Fish', 100),
    owner: safeStr(obj.owner, 'ബിജു R', 80),
    locMl: safeStr(obj.locMl, '', 140),
    locEn: safeStr(obj.locEn, '', 140),
    ...(typeof obj.phone === 'string' && obj.phone.trim()
      ? {
          phone: safeStr(obj.phone.trim(), '', 32),
          phoneDigits: safeStr(obj.phoneDigits, '', 20).replace(/[^0-9]/g, ''),
        }
      : {}),
    ...(safeMapsUrl ? { mapsUrl: safeMapsUrl } : {}),
    items,
  };
}

export async function decodeCustomerSnapshotToken(
  hashOrToken: string
): Promise<CustomerSnapshotV1 | null> {
  try {
    let token = hashOrToken.trim();
    if (token.startsWith('#')) token = token.slice(1);
    if (token.startsWith('market=')) token = token.slice('market='.length);
    if (!token || token.length > 32000) return null;

    let bytes: Uint8Array | null = null;
    if (token.startsWith('v1c.')) {
      const compressed = base64UrlToBytes(token.slice(4));
      bytes = await decompressDeflateRaw(compressed);
    } else if (token.startsWith('v1u.')) {
      bytes = base64UrlToBytes(token.slice(4));
    } else {
      return null;
    }

    if (!bytes || bytes.length > 64000) return null;
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return validateSnapshotObject(parsed);
  } catch {
    return null;
  }
}

export function formatSnapshotAge(
  createdAt: number,
  lang: Language,
  nowMs = Date.now()
): { label: string; isStale: boolean } {
  const diffMin = Math.max(0, Math.floor((nowMs - createdAt) / 60000));
  const isStale = diffMin >= 12 * 60;
  if (diffMin < 2) {
    return {
      label: lang === 'en' ? 'Shared just now' : 'ഇപ്പോൾ പങ്കിട്ടത്',
      isStale: false,
    };
  }
  if (diffMin < 60) {
    return {
      label:
        lang === 'en'
          ? `Shared ${diffMin} min ago`
          : `${diffMin} മിനിറ്റ് മുമ്പ് പങ്കിട്ടത്`,
      isStale: false,
    };
  }
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) {
    return {
      label:
        lang === 'en'
          ? `Shared ${diffHrs} hr${diffHrs === 1 ? '' : 's'} ago`
          : `${diffHrs} മണിക്കൂർ മുമ്പ് പങ്കിട്ടത്`,
      isStale,
    };
  }
  const diffDays = Math.floor(diffHrs / 24);
  return {
    label:
      lang === 'en'
        ? `Shared ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
        : `${diffDays} ദിവസം മുമ്പ് പങ്കിട്ടത്`,
    isStale: true,
  };
}
