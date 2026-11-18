import { DEFAULT_BUSINESS_SETTINGS, SEEDED_FISH_CATALOG } from '../data/seedCatalog';
import { isSafeImageSrc, resolveEntryStatus } from '../db/indexedDb';
import type {
  AvailabilityStatus,
  BusinessSettings,
  CustomerSnapshotV1,
  DailyRecord,
  FishItem,
  Language,
  PriceUnit,
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

export const SNAPSHOT_URL_WARN_LENGTH = 1800;
export const SNAPSHOT_URL_HARD_LENGTH = 3600;

const STATUS_TO_CODE: Record<Exclude<AvailabilityStatus, 'not_listed'>, number> = {
  available: 0,
  limited: 1,
  sold_out: 2,
};
const CODE_TO_STATUS: Exclude<AvailabilityStatus, 'not_listed'>[] = [
  'available',
  'limited',
  'sold_out',
];

const UNIT_TO_CODE: Record<PriceUnit, number> = {
  per_kg: 1,
  per_piece: 2,
  per_packet: 3,
};
const CODE_TO_UNIT: Array<PriceUnit | undefined> = [
  undefined,
  'per_kg',
  'per_piece',
  'per_packet',
];

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
    owner: settings.ownerName.slice(0, 80),
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

function trimTrailingEmpty(arr: Array<string | number>): Array<string | number> {
  const copy = [...arr];
  while (
    copy.length > 0 &&
    (copy[copy.length - 1] === '' || copy[copy.length - 1] === 0)
  ) {
    copy.pop();
  }
  return copy;
}

const SEED_INDEX_BY_ID = new Map(SEEDED_FISH_CATALOG.map((f, idx) => [f.id, idx]));

function encodePayloadV2Json(payload: CustomerSnapshotV1): string {
  const yyyymmdd = Number(payload.dateKey.replace(/-/g, ''));
  const dCompact = Number.isFinite(yyyymmdd)
    ? yyyymmdd.toString(36)
    : payload.dateKey;
  const tMins = Math.floor(payload.createdAt / 60000);

  const rawHeader: string[] = [
    payload.businessMl === DEFAULT_BUSINESS_SETTINGS.businessNameMl ? '' : payload.businessMl,
    payload.businessEn === DEFAULT_BUSINESS_SETTINGS.businessNameEn ? '' : payload.businessEn,
    payload.owner || '',
    payload.locMl || '',
    payload.locEn || '',
    payload.phone || '',
    payload.phoneDigits || '',
    payload.mapsUrl || '',
  ];
  while (rawHeader.length > 0 && rawHeader[rawHeader.length - 1] === '') {
    rawHeader.pop();
  }

  let mask = 0n;
  const overrides: Array<Array<string | number>> = [];
  const customs: Array<Array<string | number>> = [];

  for (const item of payload.items) {
    const seedIdx = SEED_INDEX_BY_ID.get(item.id);
    const seed = seedIdx !== undefined ? SEEDED_FISH_CATALOG[seedIdx] : undefined;
    const matchesSeed =
      seedIdx !== undefined &&
      seed !== undefined &&
      item.nameMl === seed.nameMl &&
      item.pron === seed.pronunciationLatin &&
      (item.nameEn || '') === (seed.nameEn || '') &&
      (item.refNum ?? null) === (seed.referenceNumber ?? null) &&
      (item.img || '') === (stripToPublicAssetPath(seed.referenceImage) || '');

    const stCode = STATUS_TO_CODE[item.status] ?? 0;
    const unitCode = item.unit ? UNIT_TO_CODE[item.unit] ?? 0 : 0;
    const pocBit = item.priceOnCall ? 1 : 0;
    const hasDetails =
      stCode !== 0 ||
      Boolean(item.price) ||
      unitCode !== 0 ||
      pocBit === 1 ||
      Boolean(item.qty) ||
      Boolean(item.size) ||
      Boolean(item.source) ||
      Boolean(item.note);

    if (matchesSeed) {
      if (!hasDetails) {
        mask |= 1n << BigInt(seedIdx);
      } else {
        overrides.push(
          trimTrailingEmpty([
            seedIdx,
            stCode,
            item.price || '',
            unitCode,
            pocBit,
            item.qty || '',
            item.size || '',
            item.source || '',
            item.note || '',
          ])
        );
      }
    } else {
      customs.push(
        trimTrailingEmpty([
          item.id,
          item.refNum ?? '',
          item.nameMl,
          item.pron,
          item.nameEn || '',
          stCode,
          item.price || '',
          unitCode,
          pocBit,
          item.qty || '',
          item.size || '',
          item.source || '',
          item.note || '',
          item.img || '',
        ])
      );
    }
  }

  const compactObj: Record<string, unknown> = {
    v: 2,
    d: dCompact,
    t: tMins,
    ...(payload.lang === 'en' ? { l: 1 } : {}),
    ...(rawHeader.length > 0 ? { h: rawHeader } : {}),
    ...(mask > 0n ? { b: mask.toString(16) } : {}),
    ...(overrides.length > 0 ? { o: overrides } : {}),
    ...(customs.length > 0 ? { x: customs } : {}),
  };
  return JSON.stringify(compactObj);
}

function decodePayloadV2Object(raw: unknown): CustomerSnapshotV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj.v !== 2) return null;

  let dateKey = '';
  if (typeof obj.d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(obj.d)) {
      dateKey = obj.d;
    } else {
      const parsedInt = parseInt(obj.d, 36);
      const ymd = Number.isFinite(parsedInt) ? String(parsedInt) : '';
      if (/^\d{8}$/.test(ymd)) {
        dateKey = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
      }
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const createdAt =
    typeof obj.t === 'number' && Number.isFinite(obj.t)
      ? obj.t * 60000
      : Date.now();
  const lang: Language = obj.l === 1 ? 'en' : 'ml';
  const hdr = Array.isArray(obj.h) ? obj.h : [];
  const strAt = (idx: number) =>
    typeof hdr[idx] === 'string' ? (hdr[idx] as string) : '';

  const decodedItems: SnapshotFishItemV1[] = [];

  if (typeof obj.b === 'string' && /^[0-9a-f]+$/i.test(obj.b)) {
    const mask = BigInt('0x' + obj.b);
    for (let i = 0; i < SEEDED_FISH_CATALOG.length; i++) {
      if ((mask & (1n << BigInt(i))) !== 0n) {
        const seed = SEEDED_FISH_CATALOG[i];
        decodedItems.push({
          id: seed.id,
          refNum: seed.referenceNumber,
          nameMl: seed.nameMl,
          pron: seed.pronunciationLatin,
          ...(seed.nameEn ? { nameEn: seed.nameEn } : {}),
          status: 'available',
          ...(seed.referenceImage ? { img: seed.referenceImage } : {}),
        });
      }
    }
  }

  if (Array.isArray(obj.o)) {
    for (const row of obj.o) {
      if (!Array.isArray(row)) continue;
      const seedIdx = typeof row[0] === 'number' ? row[0] : -1;
      const seed = SEEDED_FISH_CATALOG[seedIdx];
      if (!seed) continue;
      const stIdx = typeof row[1] === 'number' ? row[1] : 0;
      const unitIdx = typeof row[3] === 'number' ? row[3] : 0;
      const unit = CODE_TO_UNIT[unitIdx];
      const price = typeof row[2] === 'string' ? row[2] : '';
      const priceOnCall = row[4] === 1;
      const qty = typeof row[5] === 'string' ? row[5] : '';
      const size = typeof row[6] === 'string' ? row[6] : '';
      const source = typeof row[7] === 'string' ? row[7] : '';
      const note = typeof row[8] === 'string' ? row[8] : '';

      decodedItems.push({
        id: seed.id,
        refNum: seed.referenceNumber,
        nameMl: seed.nameMl,
        pron: seed.pronunciationLatin,
        ...(seed.nameEn ? { nameEn: seed.nameEn } : {}),
        status: CODE_TO_STATUS[stIdx] || 'available',
        ...(price ? { price } : {}),
        ...(unit ? { unit } : {}),
        ...(priceOnCall ? { priceOnCall: true } : {}),
        ...(qty ? { qty } : {}),
        ...(size ? { size } : {}),
        ...(source ? { source } : {}),
        ...(note ? { note } : {}),
        ...(seed.referenceImage ? { img: seed.referenceImage } : {}),
      });
    }
  }

  if (Array.isArray(obj.x)) {
    for (const row of obj.x) {
      if (!Array.isArray(row)) continue;
      const id = typeof row[0] === 'string' ? row[0] : '';
      const refNum =
        typeof row[1] === 'number' && Number.isFinite(row[1]) ? row[1] : null;
      const nameMl = typeof row[2] === 'string' ? row[2] : '';
      const pron = typeof row[3] === 'string' ? row[3] : '';
      if (!id || !nameMl) continue;
      const nameEn = typeof row[4] === 'string' ? row[4] : '';
      const stIdx = typeof row[5] === 'number' ? row[5] : 0;
      const price = typeof row[6] === 'string' ? row[6] : '';
      const unitIdx = typeof row[7] === 'number' ? row[7] : 0;
      const unit = CODE_TO_UNIT[unitIdx];
      const priceOnCall = row[8] === 1;
      const qty = typeof row[9] === 'string' ? row[9] : '';
      const size = typeof row[10] === 'string' ? row[10] : '';
      const source = typeof row[11] === 'string' ? row[11] : '';
      const note = typeof row[12] === 'string' ? row[12] : '';
      const img = typeof row[13] === 'string' ? row[13] : '';

      decodedItems.push({
        id,
        refNum,
        nameMl,
        pron: pron || nameMl,
        ...(nameEn ? { nameEn } : {}),
        status: CODE_TO_STATUS[stIdx] || 'available',
        ...(price ? { price } : {}),
        ...(unit ? { unit } : {}),
        ...(priceOnCall ? { priceOnCall: true } : {}),
        ...(qty ? { qty } : {}),
        ...(size ? { size } : {}),
        ...(source ? { source } : {}),
        ...(note ? { note } : {}),
        ...(img ? { img } : {}),
      });
    }
  }

  decodedItems.sort((a, b) => (a.refNum ?? 9999) - (b.refNum ?? 9999));

  const businessMl = strAt(0) || DEFAULT_BUSINESS_SETTINGS.businessNameMl;
  const businessEn = strAt(1) || DEFAULT_BUSINESS_SETTINGS.businessNameEn;
  const owner = strAt(2);
  const locMl = strAt(3);
  const locEn = strAt(4);
  const phone = strAt(5);
  const phoneDigits = strAt(6);
  const mapsUrl = strAt(7);

  return validateSnapshotObject({
    v: 1,
    createdAt,
    dateKey,
    lang,
    businessMl,
    businessEn,
    owner,
    locMl,
    locEn,
    ...(phone ? { phone, phoneDigits } : {}),
    ...(mapsUrl ? { mapsUrl } : {}),
    items: decodedItems,
  });
}

export async function encodeCustomerSnapshotToken(
  payload: CustomerSnapshotV1
): Promise<string> {
  const jsonStr = encodePayloadV2Json(payload);
  const rawBytes = new TextEncoder().encode(jsonStr);
  const rawToken = `v2u.${bytesToBase64Url(rawBytes)}`;
  const compressed = await compressDeflateRaw(rawBytes);
  if (compressed) {
    const compToken = `v2c.${bytesToBase64Url(compressed)}`;
    if (compToken.length < rawToken.length) {
      return compToken;
    }
  }
  return rawToken;
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
  const url = `${normalizedBase}?c=1#${token}`;
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
    businessMl: safeStr(obj.businessMl, DEFAULT_BUSINESS_SETTINGS.businessNameMl, 100),
    businessEn: safeStr(obj.businessEn, DEFAULT_BUSINESS_SETTINGS.businessNameEn, 100),
    owner: safeStr(obj.owner, DEFAULT_BUSINESS_SETTINGS.ownerName, 80),
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
    else if (token.startsWith('m=')) token = token.slice('m='.length);
    if (!token || token.length > 32000) return null;

    let bytes: Uint8Array | null = null;
    let version: 1 | 2 = 1;
    if (token.startsWith('v2c.')) {
      version = 2;
      bytes = await decompressDeflateRaw(base64UrlToBytes(token.slice(4)));
    } else if (token.startsWith('v2u.')) {
      version = 2;
      bytes = base64UrlToBytes(token.slice(4));
    } else if (token.startsWith('v1c.')) {
      bytes = await decompressDeflateRaw(base64UrlToBytes(token.slice(4)));
    } else if (token.startsWith('v1u.')) {
      bytes = base64UrlToBytes(token.slice(4));
    } else {
      return null;
    }

    if (!bytes || bytes.length > 64000) return null;
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return version === 2
      ? decodePayloadV2Object(parsed)
      : validateSnapshotObject(parsed);
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
