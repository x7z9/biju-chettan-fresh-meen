import {
  DEFAULT_BUSINESS_SETTINGS,
  resolvePublicAsset,
  SEEDED_FISH_CATALOG,
} from '../data/seedCatalog';
import type {
  BackupPayload,
  BusinessSettings,
  DailyRecord,
  FishItem,
  PosterHistoryItem,
  TrashFishItem,
} from '../types';

const DB_NAME = 'biju_fresh_meen_db';
const DB_VERSION = 2;

const STORES = {
  FISH: 'fish',
  DAILY: 'dailyRecords',
  POSTERS: 'posterHistory',
  SETTINGS: 'settings',
  TRASH: 'trash',
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

export async function initializeAndLoadCatalog(): Promise<FishItem[]> {
  const [existing, trashItems, seededRec] = await Promise.all([
    getAllFromStore<FishItem>(STORES.FISH),
    getAllFromStore<TrashFishItem>(STORES.TRASH),
    getFromStore<{ key: string; value: boolean }>(STORES.SETTINGS, 'catalogSeeded'),
  ]);

  if (existing.length === 0 && trashItems.length === 0 && !seededRec?.value) {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.FISH, STORES.SETTINGS], 'readwrite');
      const store = tx.objectStore(STORES.FISH);
      for (const item of SEEDED_FISH_CATALOG) {
        store.put(item);
      }
      tx.objectStore(STORES.SETTINGS).put({ key: 'catalogSeeded', value: true });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(wrapDbError(tx.error));
    });
    return SEEDED_FISH_CATALOG.map((item) => ({
      ...item,
      referenceImage: item.referenceImage ? resolvePublicAsset(item.referenceImage) : null,
    }));
  }

  if (existing.length > 0 && !seededRec?.value) {
    await putInStore(STORES.SETTINGS, { key: 'catalogSeeded', value: true });
  }

  return existing
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
  const restored: FishItem = {
    ...trashItem.fish,
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
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.FISH, STORES.TRASH], 'readwrite');
    const fishStore = tx.objectStore(STORES.FISH);
    const trashStore = tx.objectStore(STORES.TRASH);
    for (const item of items) {
      fishStore.put({ ...item.fish, updatedAt: now });
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
  const merged = { ...DEFAULT_BUSINESS_SETTINGS, ...rec.value };
  if (merged.whatsappGroupNameMl === 'ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി') {
    merged.whatsappGroupNameMl = DEFAULT_BUSINESS_SETTINGS.whatsappGroupNameMl;
    await putInStore(STORES.SETTINGS, { key: 'business', value: merged });
  }
  return merged;
}

export async function saveSettings(settings: BusinessSettings): Promise<void> {
  await putInStore(STORES.SETTINGS, { key: 'business', value: settings });
}

export async function loadDailyRecord(dateKey: string): Promise<DailyRecord> {
  const existing = await getFromStore<DailyRecord>(STORES.DAILY, dateKey);
  if (existing) return existing;
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
  await putInStore(STORES.DAILY, { ...record, updatedAt: Date.now() });
}

export async function loadAllDailyRecords(): Promise<DailyRecord[]> {
  const records = await getAllFromStore<DailyRecord>(STORES.DAILY);
  return records.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export async function savePosterHistoryItem(item: PosterHistoryItem): Promise<void> {
  await putInStore(STORES.POSTERS, item);
}

export async function loadPosterHistory(): Promise<PosterHistoryItem[]> {
  const items = await getAllFromStore<PosterHistoryItem>(STORES.POSTERS);
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function buildFullBackup(): Promise<BackupPayload> {
  const [settings, fish, dailyRecords, posterHistory, trash] = await Promise.all([
    loadSettings(),
    initializeAndLoadCatalog(),
    loadAllDailyRecords(),
    loadPosterHistory(),
    loadTrashItems(),
  ]);

  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    app: 'biju-chettante-fresh-meen',
    settings,
    fish,
    dailyRecords,
    posterHistory,
    trash,
  };
}

export function validateBackupPayload(raw: unknown): BackupPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.fish) || !Array.isArray(obj.dailyRecords)) return null;
  if (!obj.settings || typeof obj.settings !== 'object') return null;
  return {
    schemaVersion: typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    app: typeof obj.app === 'string' ? obj.app : 'biju-chettante-fresh-meen',
    settings: { ...DEFAULT_BUSINESS_SETTINGS, ...(obj.settings as Partial<BusinessSettings>) },
    fish: obj.fish as FishItem[],
    dailyRecords: obj.dailyRecords as DailyRecord[],
    posterHistory: Array.isArray(obj.posterHistory)
      ? (obj.posterHistory as PosterHistoryItem[])
      : [],
    trash: Array.isArray(obj.trash) ? (obj.trash as TrashFishItem[]) : [],
  };
}

export async function restoreFullBackup(payload: BackupPayload): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [STORES.FISH, STORES.DAILY, STORES.POSTERS, STORES.SETTINGS, STORES.TRASH],
      'readwrite'
    );
    const fishStore = tx.objectStore(STORES.FISH);
    const dailyStore = tx.objectStore(STORES.DAILY);
    const posterStore = tx.objectStore(STORES.POSTERS);
    const settingsStore = tx.objectStore(STORES.SETTINGS);
    const trashStore = tx.objectStore(STORES.TRASH);

    fishStore.clear();
    dailyStore.clear();
    posterStore.clear();
    trashStore.clear();

    for (const f of payload.fish) fishStore.put(f);
    for (const d of payload.dailyRecords) dailyStore.put(d);
    for (const p of payload.posterHistory) posterStore.put(p);
    for (const tr of payload.trash || []) trashStore.put(tr);
    settingsStore.put({ key: 'business', value: payload.settings });
    settingsStore.put({ key: 'catalogSeeded', value: true });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(wrapDbError(tx.error));
  });
}
