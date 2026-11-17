import { DEFAULT_MESSAGE_TEMPLATES } from '../data/coastalDirectory';
import {
  DEFAULT_BUSINESS_SETTINGS,
  resolvePublicAsset,
  SEEDED_FISH_CATALOG,
} from '../data/seedCatalog';
import type {
  AvailabilityStatus,
  BackupPayload,
  BusinessSettings,
  CustomerEnquiry,
  DailyFishEntry,
  DailyRecord,
  FishItem,
  MessageTemplateItem,
  PosterHistoryItem,
  SnapshotDefaultPreferences,
  TrashFishItem,
} from '../types';

const DB_NAME = 'biju_fresh_meen_db';
const DB_VERSION = 3;

const STORES = {
  FISH: 'fish',
  DAILY: 'dailyRecords',
  POSTERS: 'posterHistory',
  SETTINGS: 'settings',
  TRASH: 'trash',
  ENQUIRIES: 'enquiries',
} as const;

export class StorageQuotaError extends Error {
  constructor() {
    super('Storage quota exceeded');
    this.name = 'StorageQuotaError';
  }
}

function wrapDbError(err: unknown): Error {
  if (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return new StorageQuotaError();
  }
  return err instanceof Error ? err : new Error(String(err));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.FISH)) {
        db.createObjectStore(STORES.FISH, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.DAILY)) {
        db.createObjectStore(STORES.DAILY, { keyPath: 'dateKey' });
      }
      if (!db.objectStoreNames.contains(STORES.POSTERS)) {
        db.createObjectStore(STORES.POSTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.TRASH)) {
        db.createObjectStore(STORES.TRASH, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.ENQUIRIES)) {
        db.createObjectStore(STORES.ENQUIRIES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(wrapDbError(request.error));
    };
  });
  return dbPromise;
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(wrapDbError(req.error));
  });
}

async function getFromStore<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(wrapDbError(req.error));
  });
}

async function putInStore<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(wrapDbError(req.error));
    tx.onerror = () => reject(wrapDbError(tx.error));
  });
}

async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(wrapDbError(req.error));
  });
}

const LEGACY_INITIAL_SEED_IDS = [
  'kannan_ayala',
  'kayal_koori',
  'vella_choora',
  'ayala',
  'kochu_mathi',
  'unnimery',
  'vaala',
  'mankada',
  'kera_choora',
  'valiya_mathi',
];

export function resolveEntryStatus(entry?: Partial<DailyFishEntry> | null): AvailabilityStatus {
  if (!entry) return 'not_listed';
  if (
    entry.status === 'available' ||
    entry.status === 'limited' ||
    entry.status === 'sold_out' ||
    entry.status === 'not_listed'
  ) {
    return entry.status;
  }
  return entry.available ? 'available' : 'not_listed';
}

export function normalizeDailyEntry(
  fishId: string,
  raw?: Partial<DailyFishEntry> | null
): DailyFishEntry {
  const status = resolveEntryStatus(raw);
  const available = status === 'available' || status === 'limited';
  const publicNote = raw?.publicNote !== undefined ? raw.publicNote : raw?.note;
  return {
    fishId: raw?.fishId || fishId,
    available,
    status,
    ...(publicNote !== undefined ? { note: publicNote, publicNote } : {}),
    ...(raw?.privateNote !== undefined ? { privateNote: raw.privateNote } : {}),
    ...(raw?.quantityNote !== undefined ? { quantityNote: raw.quantityNote } : {}),
    ...(raw?.sizeGrade !== undefined ? { sizeGrade: raw.sizeGrade } : {}),
    ...(raw?.sourcePlace !== undefined ? { sourcePlace: raw.sourcePlace } : {}),
    ...(raw?.priceAmount !== undefined ? { priceAmount: raw.priceAmount } : {}),
    ...(raw?.priceUnit ? { priceUnit: raw.priceUnit } : {}),
    sharePrice: raw?.sharePrice !== undefined ? Boolean(raw.sharePrice) : true,
    priceOnCall: Boolean(raw?.priceOnCall),
    ...(raw?.todayPhotoDataUrl ? { todayPhotoDataUrl: raw.todayPhotoDataUrl } : {}),
    ...(raw?.todayPosterDataUrl ? { todayPosterDataUrl: raw.todayPosterDataUrl } : {}),
    updatedAt: typeof raw?.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

export function normalizeDailyRecord(record: DailyRecord): DailyRecord {
  const entries: Record<string, DailyFishEntry> = {};
  for (const [k, v] of Object.entries(record.entries || {})) {
    entries[k] = normalizeDailyEntry(k, v);
  }
  return {
    ...record,
    entries,
  };
}

export async function initializeAndLoadCatalog(): Promise<FishItem[]> {
  const [existing, trashItems, seededRec, ackRec] = await Promise.all([
    getAllFromStore<FishItem>(STORES.FISH),
    getAllFromStore<TrashFishItem>(STORES.TRASH),
    getFromStore<{ key: string; value: boolean }>(STORES.SETTINGS, 'catalogSeeded'),
    getFromStore<{ key: string; value: string[] }>(
      STORES.SETTINGS,
      'acknowledgedSeedIds'
    ),
  ]);

  if (existing.length === 0 && trashItems.length === 0 && !seededRec?.value) {
    const db = await openDB();
    const allSeedIds = SEEDED_FISH_CATALOG.map((item) => item.id);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.FISH, STORES.SETTINGS], 'readwrite');
      const store = tx.objectStore(STORES.FISH);
      for (const item of SEEDED_FISH_CATALOG) {
        store.put(item);
      }
      tx.objectStore(STORES.SETTINGS).put({ key: 'catalogSeeded', value: true });
      tx.objectStore(STORES.SETTINGS).put({
        key: 'acknowledgedSeedIds',
        value: allSeedIds,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(wrapDbError(tx.error));
    });
    return SEEDED_FISH_CATALOG.map((item) => ({
      ...item,
      referenceImage: item.referenceImage ? resolvePublicAsset(item.referenceImage) : null,
    }));
  }

  // Incremental, strictly non-destructive seeding for returning installs:
  // never modifies existing records and never resurrects deleted baseline records.
  const existingIds = new Set(existing.map((item) => item.id));
  const trashIds = new Set(trashItems.map((item) => item.id));
  const acknowledged = new Set<string>(
    Array.isArray(ackRec?.value)
      ? ackRec.value
      : [
          ...LEGACY_INITIAL_SEED_IDS,
          ...existingIds,
          ...trashIds,
        ]
  );

  const newlyAdded: FishItem[] = [];
  for (const seedItem of SEEDED_FISH_CATALOG) {
    if (
      !acknowledged.has(seedItem.id) &&
      !existingIds.has(seedItem.id) &&
      !trashIds.has(seedItem.id)
    ) {
      newlyAdded.push(seedItem);
    }
    acknowledged.add(seedItem.id);
  }

  const seedById = new Map(SEEDED_FISH_CATALOG.map((item) => [item.id, item]));
  let maxNumber = 0;
  for (const s of SEEDED_FISH_CATALOG) {
    if (s.referenceNumber !== null && s.referenceNumber > maxNumber) {
      maxNumber = s.referenceNumber;
    }
  }
  for (const item of existing) {
    if (item.referenceNumber !== null && item.referenceNumber > maxNumber) {
      maxNumber = item.referenceNumber;
    }
  }
  for (const tItem of trashItems) {
    if (tItem.fish.referenceNumber !== null && tItem.fish.referenceNumber > maxNumber) {
      maxNumber = tItem.fish.referenceNumber;
    }
  }

  const existingWithNumbers: FishItem[] = [];
  const backfilledExisting: FishItem[] = [];
  for (const item of existing) {
    if (item.referenceNumber !== null) {
      existingWithNumbers.push(item);
      continue;
    }
    const seedMatch = seedById.get(item.id);
    const assignedNumber =
      seedMatch && seedMatch.referenceNumber !== null
        ? seedMatch.referenceNumber
        : ++maxNumber;
    const updatedItem: FishItem = {
      ...item,
      referenceNumber: assignedNumber,
    };
    existingWithNumbers.push(updatedItem);
    backfilledExisting.push(updatedItem);
  }

  const needsSettingsUpdate =
    !seededRec?.value ||
    !Array.isArray(ackRec?.value) ||
    newlyAdded.length > 0 ||
    backfilledExisting.length > 0;

  if (needsSettingsUpdate) {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.FISH, STORES.SETTINGS], 'readwrite');
      const fishStore = tx.objectStore(STORES.FISH);
      for (const item of backfilledExisting) {
        fishStore.put(item);
      }
      for (const item of newlyAdded) {
        fishStore.put(item);
      }
      tx.objectStore(STORES.SETTINGS).put({ key: 'catalogSeeded', value: true });
      tx.objectStore(STORES.SETTINGS).put({
        key: 'acknowledgedSeedIds',
        value: Array.from(acknowledged),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(wrapDbError(tx.error));
    });
  }

  const merged = [...existingWithNumbers, ...newlyAdded];

  return merged
    .map((item) => ({
      ...item,
      referenceImage: item.referenceImage ? resolvePublicAsset(item.referenceImage) : null,
    }))
    .sort((a, b) => {
      if (a.referenceNumber !== null && b.referenceNumber !== null) {
        return a.referenceNumber - b.referenceNumber;
      }
      if (a.referenceNumber !== null) return -1;
      if (b.referenceNumber !== null) return 1;
      return b.createdAt - a.createdAt;
    });
}

export async function saveFishItem(fish: FishItem): Promise<void> {
  await putInStore(STORES.FISH, fish);
}

export async function deleteFishItem(id: string): Promise<void> {
  await deleteFromStore(STORES.FISH, id);
}

export async function moveFishToTrash(fish: FishItem): Promise<void> {
  const db = await openDB();
  const entry: TrashFishItem = {
    id: fish.id,
    fish,
    deletedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.FISH, STORES.TRASH], 'readwrite');
    tx.objectStore(STORES.TRASH).put(entry);
    tx.objectStore(STORES.FISH).delete(fish.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(wrapDbError(tx.error));
  });
}

export async function loadTrashItems(): Promise<TrashFishItem[]> {
  const items = await getAllFromStore<TrashFishItem>(STORES.TRASH);
  return items
    .map((item) => ({
      ...item,
      fish: {
        ...item.fish,
        referenceImage: item.fish.referenceImage
          ? resolvePublicAsset(item.fish.referenceImage)
          : null,
      },
    }))
    .sort((a, b) => b.deletedAt - a.deletedAt);
}

export async function restoreFishFromTrash(trashItem: TrashFishItem): Promise<void> {
  const db = await openDB();
  const seedMatch = SEEDED_FISH_CATALOG.find((s) => s.id === trashItem.fish.id);
  const restored: FishItem = {
    ...trashItem.fish,
    referenceNumber:
      trashItem.fish.referenceNumber !== null
        ? trashItem.fish.referenceNumber
        : (seedMatch?.referenceNumber ?? null),
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.FISH, STORES.TRASH], 'readwrite');
    tx.objectStore(STORES.FISH).put(restored);
    tx.objectStore(STORES.TRASH).delete(trashItem.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(wrapDbError(tx.error));
  });
}

export async function restoreAllFishFromTrash(items: TrashFishItem[]): Promise<void> {
  if (items.length === 0) return;
  const db = await openDB();
  const now = Date.now();
  const seedById = new Map(SEEDED_FISH_CATALOG.map((s) => [s.id, s]));
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.FISH, STORES.TRASH], 'readwrite');
    const fishStore = tx.objectStore(STORES.FISH);
    const trashStore = tx.objectStore(STORES.TRASH);
    for (const item of items) {
      const seedMatch = seedById.get(item.fish.id);
      fishStore.put({
        ...item.fish,
        referenceNumber:
          item.fish.referenceNumber !== null
            ? item.fish.referenceNumber
            : (seedMatch?.referenceNumber ?? null),
        updatedAt: now,
      });
      trashStore.delete(item.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(wrapDbError(tx.error));
  });
}

export async function permanentlyDeleteFromTrash(id: string): Promise<void> {
  await deleteFromStore(STORES.TRASH, id);
}

export async function emptyTrashBin(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.TRASH, 'readwrite');
    tx.objectStore(STORES.TRASH).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(wrapDbError(tx.error));
  });
}

export async function loadSettings(): Promise<BusinessSettings> {
  const rec = await getFromStore<{ key: string; value: BusinessSettings }>(
    STORES.SETTINGS,
    'business'
  );
  if (!rec) {
    await putInStore(STORES.SETTINGS, { key: 'business', value: DEFAULT_BUSINESS_SETTINGS });
    return { ...DEFAULT_BUSINESS_SETTINGS };
  }

  // Strictly preserve existing user-customized values (location, defaultBackground, ownerName, etc.);
  // only populate newly introduced optional keys if absent.
  const existing = rec.value;
  const merged: BusinessSettings = {
    ...DEFAULT_BUSINESS_SETTINGS,
    ...existing,
    snapshotDefaults: {
      ...DEFAULT_BUSINESS_SETTINGS.snapshotDefaults!,
      ...(existing.snapshotDefaults || {}),
    },
    messageTemplates:
      Array.isArray(existing.messageTemplates) && existing.messageTemplates.length > 0
        ? existing.messageTemplates
        : DEFAULT_MESSAGE_TEMPLATES,
  };

  let changed = false;
  if (merged.whatsappGroupNameMl === 'ബിജുചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി') {
    merged.whatsappGroupNameMl = DEFAULT_BUSINESS_SETTINGS.whatsappGroupNameMl;
    changed = true;
  }
  if (!merged.ownerName || merged.ownerName === 'Biju') {
    merged.ownerName = DEFAULT_BUSINESS_SETTINGS.ownerName;
    changed = true;
  }
  if (existing.showPhoneToCustomers === undefined) {
    merged.showPhoneToCustomers = true;
    changed = true;
  }
  if (existing.showDirectionsLink === undefined) {
    merged.showDirectionsLink = false;
    changed = true;
  }
  if (!existing.snapshotDefaults || !existing.messageTemplates) {
    changed = true;
  }

  if (changed) {
    await putInStore(STORES.SETTINGS, { key: 'business', value: merged });
  }
  return merged;
}

export async function saveSettings(settings: BusinessSettings): Promise<void> {
  await putInStore(STORES.SETTINGS, { key: 'business', value: settings });
}

export async function loadDailyRecord(dateKey: string): Promise<DailyRecord> {
  const existing = await getFromStore<DailyRecord>(STORES.DAILY, dateKey);
  if (existing) return normalizeDailyRecord(existing);
  const fresh: DailyRecord = {
    dateKey,
    includePrices: false,
    entries: {},
    updatedAt: Date.now(),
  };
  await putInStore(STORES.DAILY, fresh);
  return fresh;
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  const normalized = normalizeDailyRecord(record);
  await putInStore(STORES.DAILY, { ...normalized, updatedAt: Date.now() });
}

export async function loadAllDailyRecords(): Promise<DailyRecord[]> {
  const records = await getAllFromStore<DailyRecord>(STORES.DAILY);
  return records
    .map(normalizeDailyRecord)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export async function savePosterHistoryItem(item: PosterHistoryItem): Promise<void> {
  await putInStore(STORES.POSTERS, item);
}

export async function loadPosterHistory(): Promise<PosterHistoryItem[]> {
  const items = await getAllFromStore<PosterHistoryItem>(STORES.POSTERS);
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function loadEnquiries(): Promise<CustomerEnquiry[]> {
  const items = await getAllFromStore<CustomerEnquiry>(STORES.ENQUIRIES);
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveEnquiry(item: CustomerEnquiry): Promise<void> {
  await putInStore(STORES.ENQUIRIES, item);
}

export async function deleteEnquiry(id: string): Promise<void> {
  await deleteFromStore(STORES.ENQUIRIES, id);
}

export async function buildFullBackup(): Promise<BackupPayload> {
  const [settings, fish, dailyRecords, posterHistory, trash, enquiries] =
    await Promise.all([
      loadSettings(),
      initializeAndLoadCatalog(),
      loadAllDailyRecords(),
      loadPosterHistory(),
      loadTrashItems(),
      loadEnquiries(),
    ]);

  return {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    app: 'biju-chettante-fresh-meen',
    settings,
    fish,
    dailyRecords,
    posterHistory,
    trash,
    enquiries,
  };
}

const SAFE_BACKUP_DATA_URL_RE =
  /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_LOCAL_ASSET_RE =
  /^\/?(?:[a-z0-9._-]+\/)*assets\/[a-z0-9._/-]+(?:\?v=[a-z0-9._~%-]+)?$/i;

export function isSafeImageSrc(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  return SAFE_BACKUP_DATA_URL_RE.test(value) || SAFE_LOCAL_ASSET_RE.test(value);
}

function asSafeString(value: unknown, fallback = '', maxLen = 500): string {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLen);
}

function asSafeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeFishItem(raw: unknown): FishItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asSafeString(item.id, '', 120).trim();
  const nameMl = asSafeString(item.nameMl, '', 200).trim();
  const pronunciationLatin = asSafeString(item.pronunciationLatin, '', 200).trim();
  if (!id || !nameMl || !pronunciationLatin) return null;

  const photosRaw = Array.isArray(item.customActualPhotos)
    ? item.customActualPhotos
    : [];
  const customActualPhotos = photosRaw
    .map((p) => {
      if (!p || typeof p !== 'object') return null;
      const photo = p as Record<string, unknown>;
      if (!isSafeImageSrc(photo.dataUrl)) return null;
      const pid = asSafeString(photo.id, `photo_${Date.now()}`, 120);
      return {
        id: pid,
        dataUrl: photo.dataUrl,
        createdAt: asSafeNumber(photo.createdAt, Date.now()),
        ...(typeof photo.label === 'string'
          ? { label: asSafeString(photo.label, '', 120) }
          : {}),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const aliasesMl = Array.isArray(item.aliasesMl)
    ? item.aliasesMl
        .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
        .map((a) => asSafeString(a.trim(), '', 120))
    : undefined;

  const sourceReferences = Array.isArray(item.sourceReferences)
    ? item.sourceReferences
        .map((ref) => {
          if (!ref || typeof ref !== 'object') return null;
          const r = ref as Record<string, unknown>;
          const url = asSafeString(r.url, '', 400).trim();
          const title = asSafeString(r.title, '', 200).trim();
          const accessedAt = asSafeString(r.accessedAt, '', 30).trim();
          if (!/^https:\/\//i.test(url) || !title) return null;
          return { title, url, accessedAt: accessedAt || '2026-11-15' };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
    : undefined;

  const confidence =
    item.identificationConfidence === 'confirmed' ||
    item.identificationConfidence === 'probable' ||
    item.identificationConfidence === 'needs_local_confirmation'
      ? item.identificationConfidence
      : undefined;

  const catalogueGroup =
    item.catalogueGroup === 'finfish' || item.catalogueGroup === 'seafood_other'
      ? item.catalogueGroup
      : undefined;

  const seafoodClass =
    item.seafoodClass === 'finfish' ||
    item.seafoodClass === 'crustacean' ||
    item.seafoodClass === 'bivalve_mollusc' ||
    item.seafoodClass === 'cephalopod'
      ? item.seafoodClass
      : undefined;

  return {
    id,
    referenceNumber:
      typeof item.referenceNumber === 'number' && Number.isFinite(item.referenceNumber)
        ? item.referenceNumber
        : null,
    ...(catalogueGroup ? { catalogueGroup } : {}),
    ...(seafoodClass ? { seafoodClass } : {}),
    nameMl,
    pronunciationLatin,
    ...(aliasesMl && aliasesMl.length > 0 ? { aliasesMl } : {}),
    ...(typeof item.nameEn === 'string' && item.nameEn.trim()
      ? { nameEn: asSafeString(item.nameEn.trim(), '', 200) }
      : {}),
    ...(typeof item.scientificName === 'string' && item.scientificName.trim()
      ? { scientificName: asSafeString(item.scientificName.trim(), '', 200) }
      : {}),
    ...(typeof item.family === 'string' && item.family.trim()
      ? { family: asSafeString(item.family.trim(), '', 120) }
      : {}),
    ...(typeof item.speciesNote === 'string' && item.speciesNote.trim()
      ? { speciesNote: asSafeString(item.speciesNote.trim(), '', 400) }
      : {}),
    ...(typeof item.identificationFeatures === 'string' &&
    item.identificationFeatures.trim()
      ? {
          identificationFeatures: asSafeString(
            item.identificationFeatures.trim(),
            '',
            500
          ),
        }
      : {}),
    ...(typeof item.habitatSummary === 'string' && item.habitatSummary.trim()
      ? { habitatSummary: asSafeString(item.habitatSummary.trim(), '', 400) }
      : {}),
    ...(typeof item.imageMethod === 'string' && item.imageMethod.trim()
      ? { imageMethod: asSafeString(item.imageMethod.trim(), '', 400) }
      : {}),
    ...(typeof item.imageLicenseNote === 'string' && item.imageLicenseNote.trim()
      ? { imageLicenseNote: asSafeString(item.imageLicenseNote.trim(), '', 400) }
      : {}),
    ...(sourceReferences && sourceReferences.length > 0
      ? { sourceReferences }
      : {}),
    ...(confidence ? { identificationConfidence: confidence } : {}),
    ...(typeof item.ambiguityNote === 'string' && item.ambiguityNote.trim()
      ? { ambiguityNote: asSafeString(item.ambiguityNote.trim(), '', 400) }
      : {}),
    referenceImage: isSafeImageSrc(item.referenceImage) ? item.referenceImage : null,
    isReferenceArtworkOnly: Boolean(item.isReferenceArtworkOnly),
    customActualPhotos,
    preferredBackground:
      item.preferredBackground === 'banana-leaf' ? 'banana-leaf' : 'blue-tray',
    createdAt: asSafeNumber(item.createdAt, Date.now()),
    updatedAt: asSafeNumber(item.updatedAt, Date.now()),
  };
}

function sanitizeDailyRecord(raw: unknown): DailyRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const dateKey = asSafeString(rec.dateKey, '', 20).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const cleanEntries: DailyRecord['entries'] = Object.create(null);
  if (rec.entries && typeof rec.entries === 'object') {
    for (const [k, v] of Object.entries(rec.entries as Record<string, unknown>)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (!v || typeof v !== 'object') continue;
      const entry = v as Record<string, unknown>;
      const safeKey = asSafeString(k, '', 120);
      if (!safeKey) continue;

      const status: AvailabilityStatus =
        entry.status === 'available' ||
        entry.status === 'limited' ||
        entry.status === 'sold_out' ||
        entry.status === 'not_listed'
          ? entry.status
          : entry.available
            ? 'available'
            : 'not_listed';
      const available = status === 'available' || status === 'limited';
      const publicNote =
        typeof entry.publicNote === 'string'
          ? asSafeString(entry.publicNote, '', 200)
          : typeof entry.note === 'string'
            ? asSafeString(entry.note, '', 200)
            : '';

      cleanEntries[safeKey] = {
        fishId: asSafeString(entry.fishId, safeKey, 120) || safeKey,
        available,
        status,
        ...(publicNote ? { note: publicNote, publicNote } : {}),
        ...(typeof entry.privateNote === 'string' && entry.privateNote
          ? { privateNote: asSafeString(entry.privateNote, '', 300) }
          : {}),
        ...(typeof entry.quantityNote === 'string' && entry.quantityNote
          ? { quantityNote: asSafeString(entry.quantityNote, '', 120) }
          : {}),
        ...(typeof entry.sizeGrade === 'string' && entry.sizeGrade
          ? { sizeGrade: asSafeString(entry.sizeGrade, '', 120) }
          : {}),
        ...(typeof entry.sourcePlace === 'string' && entry.sourcePlace
          ? { sourcePlace: asSafeString(entry.sourcePlace, '', 120) }
          : {}),
        ...(typeof entry.priceAmount === 'string' && entry.priceAmount
          ? { priceAmount: asSafeString(entry.priceAmount, '', 30) }
          : {}),
        ...(entry.priceUnit === 'per_kg' ||
        entry.priceUnit === 'per_piece' ||
        entry.priceUnit === 'per_packet'
          ? { priceUnit: entry.priceUnit }
          : {}),
        sharePrice:
          typeof entry.sharePrice === 'boolean' ? entry.sharePrice : true,
        priceOnCall: Boolean(entry.priceOnCall),
        ...(isSafeImageSrc(entry.todayPhotoDataUrl)
          ? { todayPhotoDataUrl: entry.todayPhotoDataUrl }
          : {}),
        ...(isSafeImageSrc(entry.todayPosterDataUrl)
          ? { todayPosterDataUrl: entry.todayPosterDataUrl }
          : {}),
        updatedAt: asSafeNumber(entry.updatedAt, Date.now()),
      };
    }
  }

  return {
    dateKey,
    includePrices: Boolean(rec.includePrices),
    entries: { ...cleanEntries },
    updatedAt: asSafeNumber(rec.updatedAt, Date.now()),
  };
}

function sanitizeEnquiry(raw: unknown): CustomerEnquiry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const id = asSafeString(e.id, '', 120).trim();
  const fishNameMl = asSafeString(e.fishNameMl, '', 160).trim();
  const dateKey = asSafeString(e.dateKey, '', 20).trim();
  if (!id || !fishNameMl || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const status =
    e.status === 'new' ||
    e.status === 'replied' ||
    e.status === 'confirmed' ||
    e.status === 'fulfilled' ||
    e.status === 'cancelled'
      ? e.status
      : 'new';

  return {
    id,
    createdAt: asSafeNumber(e.createdAt, Date.now()),
    updatedAt: asSafeNumber(e.updatedAt, Date.now()),
    dateKey,
    ...(typeof e.customerName === 'string' && e.customerName.trim()
      ? { customerName: asSafeString(e.customerName.trim(), '', 120) }
      : {}),
    ...(typeof e.customerPhone === 'string' && e.customerPhone.trim()
      ? { customerPhone: asSafeString(e.customerPhone.trim(), '', 40) }
      : {}),
    ...(typeof e.fishId === 'string' && e.fishId.trim()
      ? { fishId: asSafeString(e.fishId.trim(), '', 120) }
      : {}),
    fishNameMl,
    ...(typeof e.quantityNote === 'string' && e.quantityNote.trim()
      ? { quantityNote: asSafeString(e.quantityNote.trim(), '', 120) }
      : {}),
    status,
    ...(typeof e.note === 'string' && e.note.trim()
      ? { note: asSafeString(e.note.trim(), '', 300) }
      : {}),
  };
}

export function validateBackupPayload(raw: unknown): BackupPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.fish) || !Array.isArray(obj.dailyRecords)) return null;
  if (!obj.settings || typeof obj.settings !== 'object') return null;

  const rawSettings = obj.settings as Record<string, unknown>;
  const rawSnapDefaults =
    rawSettings.snapshotDefaults && typeof rawSettings.snapshotDefaults === 'object'
      ? (rawSettings.snapshotDefaults as Record<string, unknown>)
      : {};

  const snapshotDefaults: SnapshotDefaultPreferences = {
    includePhone:
      typeof rawSnapDefaults.includePhone === 'boolean'
        ? rawSnapDefaults.includePhone
        : true,
    includePrices:
      typeof rawSnapDefaults.includePrices === 'boolean'
        ? rawSnapDefaults.includePrices
        : true,
    includeQuantity:
      typeof rawSnapDefaults.includeQuantity === 'boolean'
        ? rawSnapDefaults.includeQuantity
        : true,
    includeNotes:
      typeof rawSnapDefaults.includeNotes === 'boolean'
        ? rawSnapDefaults.includeNotes
        : true,
    includeDirections:
      typeof rawSnapDefaults.includeDirections === 'boolean'
        ? rawSnapDefaults.includeDirections
        : false,
    customerLang: rawSnapDefaults.customerLang === 'en' ? 'en' : 'ml',
  };

  const rawTemplates = Array.isArray(rawSettings.messageTemplates)
    ? rawSettings.messageTemplates
    : DEFAULT_MESSAGE_TEMPLATES;
  const messageTemplates: MessageTemplateItem[] = rawTemplates
    .map((tpl) => {
      if (!tpl || typeof tpl !== 'object') return null;
      const r = tpl as Record<string, unknown>;
      const id = asSafeString(r.id, '', 80).trim();
      const bodyMl = asSafeString(r.bodyMl, '', 800).trim();
      if (!id || !bodyMl) return null;
      return {
        id,
        labelMl: asSafeString(r.labelMl, id, 120),
        labelEn: asSafeString(r.labelEn, id, 120),
        bodyMl,
        bodyEn: asSafeString(r.bodyEn, bodyMl, 800),
      };
    })
    .filter((tpl): tpl is MessageTemplateItem => tpl !== null);

  const rawMapsUrl = asSafeString(rawSettings.mapsQueryUrl, '', 400).trim();
  const safeMapsUrl =
    /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.com\/maps)/i.test(
      rawMapsUrl
    )
      ? rawMapsUrl
      : '';

  const settings: BusinessSettings = {
    businessNameMl: asSafeString(
      rawSettings.businessNameMl,
      DEFAULT_BUSINESS_SETTINGS.businessNameMl,
      200
    ),
    businessNameEn: asSafeString(
      rawSettings.businessNameEn,
      DEFAULT_BUSINESS_SETTINGS.businessNameEn,
      200
    ),
    whatsappGroupNameMl: asSafeString(
      rawSettings.whatsappGroupNameMl,
      DEFAULT_BUSINESS_SETTINGS.whatsappGroupNameMl,
      200
    ),
    whatsappGroupNameEn: asSafeString(
      rawSettings.whatsappGroupNameEn,
      DEFAULT_BUSINESS_SETTINGS.whatsappGroupNameEn,
      200
    ),
    ownerName: asSafeString(
      rawSettings.ownerName,
      DEFAULT_BUSINESS_SETTINGS.ownerName,
      120
    ),
    locationMl: asSafeString(
      rawSettings.locationMl,
      DEFAULT_BUSINESS_SETTINGS.locationMl,
      200
    ),
    locationEn: asSafeString(
      rawSettings.locationEn,
      DEFAULT_BUSINESS_SETTINGS.locationEn,
      200
    ),
    phoneDisplay: asSafeString(
      rawSettings.phoneDisplay,
      DEFAULT_BUSINESS_SETTINGS.phoneDisplay,
      40
    ),
    phoneDigits: asSafeString(
      rawSettings.phoneDigits,
      DEFAULT_BUSINESS_SETTINGS.phoneDigits,
      25
    ),
    posterHeadingMl: asSafeString(
      rawSettings.posterHeadingMl,
      DEFAULT_BUSINESS_SETTINGS.posterHeadingMl,
      200
    ),
    posterHeadingEn: asSafeString(
      rawSettings.posterHeadingEn,
      DEFAULT_BUSINESS_SETTINGS.posterHeadingEn,
      200
    ),
    disclaimerMl: asSafeString(
      rawSettings.disclaimerMl,
      DEFAULT_BUSINESS_SETTINGS.disclaimerMl,
      300
    ),
    disclaimerEn: asSafeString(
      rawSettings.disclaimerEn,
      DEFAULT_BUSINESS_SETTINGS.disclaimerEn,
      300
    ),
    showDisclaimerOnPoster:
      typeof rawSettings.showDisclaimerOnPoster === 'boolean'
        ? rawSettings.showDisclaimerOnPoster
        : DEFAULT_BUSINESS_SETTINGS.showDisclaimerOnPoster,
    posterLanguage:
      rawSettings.posterLanguage === 'ml' ||
      rawSettings.posterLanguage === 'en' ||
      rawSettings.posterLanguage === 'bilingual'
        ? rawSettings.posterLanguage
        : DEFAULT_BUSINESS_SETTINGS.posterLanguage,
    defaultBackground:
      rawSettings.defaultBackground === 'banana-leaf' ? 'banana-leaf' : 'blue-tray',
    showPhoneToCustomers:
      typeof rawSettings.showPhoneToCustomers === 'boolean'
        ? rawSettings.showPhoneToCustomers
        : true,
    showDirectionsLink:
      typeof rawSettings.showDirectionsLink === 'boolean'
        ? rawSettings.showDirectionsLink
        : false,
    mapsQueryUrl: safeMapsUrl,
    ...(typeof rawSettings.lastBackupAt === 'number'
      ? { lastBackupAt: rawSettings.lastBackupAt }
      : {}),
    snapshotDefaults,
    messageTemplates:
      messageTemplates.length > 0 ? messageTemplates : DEFAULT_MESSAGE_TEMPLATES,
  };

  const fish = obj.fish
    .map(sanitizeFishItem)
    .filter((f): f is FishItem => f !== null);
  const dailyRecords = obj.dailyRecords
    .map(sanitizeDailyRecord)
    .filter((d): d is DailyRecord => d !== null);

  const posterHistory: PosterHistoryItem[] = Array.isArray(obj.posterHistory)
    ? obj.posterHistory
        .map((rawItem) => {
          if (!rawItem || typeof rawItem !== 'object') return null;
          const p = rawItem as Record<string, unknown>;
          const id = asSafeString(p.id, '', 120).trim();
          const dateKey = asSafeString(p.dateKey, '', 20).trim();
          const fishId = asSafeString(p.fishId, '', 120).trim();
          if (!id || !dateKey || !fishId || !isSafeImageSrc(p.posterDataUrl)) {
            return null;
          }
          return {
            id,
            dateKey,
            fishId,
            fishNameMl: asSafeString(p.fishNameMl, fishId, 200),
            background:
              p.background === 'banana-leaf'
                ? ('banana-leaf' as const)
                : ('blue-tray' as const),
            posterDataUrl: p.posterDataUrl,
            createdAt: asSafeNumber(p.createdAt, Date.now()),
          };
        })
        .filter((p): p is PosterHistoryItem => p !== null)
    : [];

  const trash: TrashFishItem[] = Array.isArray(obj.trash)
    ? obj.trash
        .map((rawTrash) => {
          if (!rawTrash || typeof rawTrash !== 'object') return null;
          const tr = rawTrash as Record<string, unknown>;
          const safeFish = sanitizeFishItem(tr.fish);
          if (!safeFish) return null;
          return {
            id: asSafeString(tr.id, safeFish.id, 120) || safeFish.id,
            fish: safeFish,
            deletedAt: asSafeNumber(tr.deletedAt, Date.now()),
          };
        })
        .filter((tr): tr is TrashFishItem => tr !== null)
    : [];

  const enquiries: CustomerEnquiry[] = Array.isArray(obj.enquiries)
    ? obj.enquiries
        .map(sanitizeEnquiry)
        .filter((e): e is CustomerEnquiry => e !== null)
    : [];

  return {
    schemaVersion: asSafeNumber(obj.schemaVersion, 1),
    exportedAt: asSafeString(obj.exportedAt, new Date().toISOString(), 60),
    app: asSafeString(obj.app, 'biju-chettante-fresh-meen', 80),
    settings,
    fish,
    dailyRecords,
    posterHistory,
    trash,
    enquiries,
  };
}

export async function restoreFullBackup(payload: BackupPayload): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [
        STORES.FISH,
        STORES.DAILY,
        STORES.POSTERS,
        STORES.SETTINGS,
        STORES.TRASH,
        STORES.ENQUIRIES,
      ],
      'readwrite'
    );
    const fishStore = tx.objectStore(STORES.FISH);
    const dailyStore = tx.objectStore(STORES.DAILY);
    const posterStore = tx.objectStore(STORES.POSTERS);
    const settingsStore = tx.objectStore(STORES.SETTINGS);
    const trashStore = tx.objectStore(STORES.TRASH);
    const enquiriesStore = tx.objectStore(STORES.ENQUIRIES);

    fishStore.clear();
    dailyStore.clear();
    posterStore.clear();
    trashStore.clear();
    enquiriesStore.clear();

    for (const f of payload.fish) fishStore.put(f);
    for (const d of payload.dailyRecords) dailyStore.put(normalizeDailyRecord(d));
    for (const p of payload.posterHistory) posterStore.put(p);
    for (const tr of payload.trash || []) trashStore.put(tr);
    for (const enq of payload.enquiries || []) enquiriesStore.put(enq);
    settingsStore.put({ key: 'business', value: payload.settings });
    settingsStore.put({ key: 'catalogSeeded', value: true });
    settingsStore.put({
      key: 'acknowledgedSeedIds',
      value: SEEDED_FISH_CATALOG.map((item) => item.id),
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(wrapDbError(tx.error));
  });
}
