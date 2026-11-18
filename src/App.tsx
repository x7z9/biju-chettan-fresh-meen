import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarCheck,
  Fish,
  Moon,
  MoreHorizontal,
  PlusCircle,
  RotateCcw,
  Sun,
  WifiOff,
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import { TodayScreen } from './components/TodayScreen';

const FishCatalogueScreen = lazy(() =>
  import('./components/FishCatalogueScreen').then((m) => ({
    default: m.FishCatalogueScreen,
  }))
);
const AddEditFishScreen = lazy(() =>
  import('./components/AddEditFishScreen').then((m) => ({
    default: m.AddEditFishScreen,
  }))
);
const MoreScreen = lazy(() =>
  import('./components/MoreScreen').then((m) => ({
    default: m.MoreScreen,
  }))
);
const PosterStudioModal = lazy(() =>
  import('./components/PosterStudioModal').then((m) => ({
    default: m.PosterStudioModal,
  }))
);
const ShareListModal = lazy(() =>
  import('./components/ShareListModal').then((m) => ({
    default: m.ShareListModal,
  }))
);
const CustomerSnapshotModal = lazy(() =>
  import('./components/CustomerSnapshotModal').then((m) => ({
    default: m.CustomerSnapshotModal,
  }))
);
const CustomerViewScreen = lazy(() =>
  import('./components/CustomerViewScreen').then((m) => ({
    default: m.CustomerViewScreen,
  }))
);

import {
  BUSINESS_LOGO_PATH,
  DEFAULT_BUSINESS_SETTINGS,
  SEEDED_FISH_CATALOG,
} from './data/seedCatalog';
import { t } from './data/translations';
import {
  deleteEnquiry as dbDeleteEnquiry,
  emptyTrashBin,
  initializeAndLoadCatalog,
  loadAllDailyRecords,
  loadDailyRecord,
  loadEnquiries,
  loadSettings,
  loadTrashItems,
  moveFishToTrash,
  permanentlyDeleteFromTrash,
  resolveEntryStatus,
  restoreAllFishFromTrash,
  restoreFishFromTrash,
  saveDailyRecord,
  saveEnquiry as dbSaveEnquiry,
  saveFishItem,
  savePosterHistoryItem,
  saveSettings,
  StorageQuotaError,
} from './db/indexedDb';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type {
  ActiveTab,
  BusinessSettings,
  CustomerEnquiry,
  CustomerSnapshotV1,
  DailyFishEntry,
  DailyRecord,
  FishItem,
  Language,
  PosterBackground,
  TrashFishItem,
} from './types';
import { decodeCustomerSnapshotToken } from './utils/customerSnapshot';
import type { SearchActionTarget } from './utils/offlineSearch';
import {
  formatDisplayDate,
  getLocalDateKey,
  triggerHaptic,
} from './utils/speechAndDate';

const LANG_STORAGE_KEY = 'biju_meen_lang';
const THEME_STORAGE_KEY = 'biju_meen_theme';

function checkIsCustomerViewUrl(): { isCustomer: boolean; token: string } {
  if (typeof window === 'undefined') return { isCustomer: false, token: '' };
  const params = new URLSearchParams(window.location.search);
  const isCustomer = params.get('view') === 'customer';
  const hash = window.location.hash || '';
  const match = hash.match(/(?:^#|&)market=([^&]+)/);
  const token = match ? decodeURIComponent(match[1]) : '';
  return { isCustomer, token };
}

export default function App() {
  const [urlViewState, setUrlViewState] = useState<{
    isCustomer: boolean;
    token: string;
  }>(() => checkIsCustomerViewUrl());
  const [decodedSnapshot, setDecodedSnapshot] = useState<CustomerSnapshotV1 | null>(
    null
  );
  const [snapshotReady, setSnapshotReady] = useState(
    () => !checkIsCustomerViewUrl().isCustomer
  );

  const [lang, setLang] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      return stored === 'en' ? 'en' : 'ml';
    } catch {
      return 'ml';
    }
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }
      return 'light';
    } catch {
      return 'light';
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [todayKey, setTodayKey] = useState<string>(() => getLocalDateKey());
  const [fishList, setFishList] = useState<FishItem[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(
    DEFAULT_BUSINESS_SETTINGS
  );
  const [dailyRecord, setDailyRecord] = useState<DailyRecord>({
    dateKey: getLocalDateKey(),
    includePrices: false,
    entries: {},
    updatedAt: Date.now(),
  });
  const [allDailyRecords, setAllDailyRecords] = useState<DailyRecord[]>([]);
  const [trashList, setTrashList] = useState<TrashFishItem[]>([]);
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveNotice, setSaveNotice] = useState('');
  const [quotaError, setQuotaError] = useState(false);

  const [editingFish, setEditingFish] = useState<FishItem | null>(null);
  const [posterTargetFish, setPosterTargetFish] = useState<FishItem | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCustomerSnapshot, setShowCustomerSnapshot] = useState(false);
  const [moreFocusSection, setMoreFocusSection] = useState<string | null>(null);

  const [undoState, setUndoState] = useState<{
    fishId: string;
    prevEntry: DailyFishEntry | undefined;
    message: string;
  } | null>(null);

  const isOnline = useOnlineStatus();

  const dailyRecordRef = useRef(dailyRecord);
  dailyRecordRef.current = dailyRecord;
  const fishListRef = useRef(fishList);
  fishListRef.current = fishList;
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    const syncFromUrl = () => {
      setUrlViewState(checkIsCustomerViewUrl());
    };
    window.addEventListener('hashchange', syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!urlViewState.isCustomer) {
      setDecodedSnapshot(null);
      setSnapshotReady(true);
      return;
    }
    if (!urlViewState.token) {
      setDecodedSnapshot(null);
      setSnapshotReady(true);
      return;
    }
    setSnapshotReady(false);
    decodeCustomerSnapshotToken(urlViewState.token)
      .then((snap) => {
        if (!cancelled) {
          setDecodedSnapshot(snap);
          setSnapshotReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDecodedSnapshot(null);
          setSnapshotReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [urlViewState]);

  const handleExitCustomerMode = () => {
    if (typeof window === 'undefined') return;
    const base = import.meta.env.BASE_URL || '/';
    window.history.pushState(null, '', base);
    setUrlViewState({ isCustomer: false, token: '' });
  };

  const handleLanguageChange = (next: Language) => {
    setLang(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  };

  const loadAllData = useCallback(async () => {
    const currentKey = getLocalDateKey();
    setTodayKey(currentKey);
    try {
      const [
        catalog,
        loadedSettings,
        todayRec,
        allRecords,
        loadedTrash,
        loadedEnquiries,
      ] = await Promise.all([
        initializeAndLoadCatalog(),
        loadSettings(),
        loadDailyRecord(currentKey),
        loadAllDailyRecords(),
        loadTrashItems(),
        loadEnquiries(),
      ]);
      setFishList(catalog);
      setSettings(loadedSettings);
      setDailyRecord(todayRec);
      setAllDailyRecords(allRecords);
      setTrashList(loadedTrash);
      setEnquiries(loadedEnquiries);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (urlViewState.isCustomer) {
      setIsLoading(false);
      return;
    }
    loadAllData();
  }, [urlViewState.isCustomer, loadAllData]);

  useEffect(() => {
    if (
      urlViewState.isCustomer ||
      !isOnline ||
      fishList.length === 0 ||
      typeof window === 'undefined'
    ) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const urls = Array.from(
          new Set(
            [
              BUSINESS_LOGO_PATH,
              ...fishList.map((f) => f.referenceImage),
            ].filter(
              (u): u is string =>
                typeof u === 'string' &&
                u.length > 0 &&
                !u.startsWith('data:') &&
                !u.startsWith('blob:')
            )
          )
        );
        const cache =
          'caches' in window ? await caches.open('biju-fish-images-v3') : null;
        for (const url of urls) {
          if (cancelled || !navigator.onLine) break;
          if (cache) {
            const hit = await cache.match(url);
            if (hit) continue;
          }
          await fetch(url, { credentials: 'same-origin' }).catch(() => {});
        }
      } catch {
        // Non-critical offline cache warmup
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [urlViewState.isCustomer, fishList, isOnline]);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#000000' : '#082d59');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    triggerHaptic();
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check if local date rolled over when returning to app
  useEffect(() => {
    if (urlViewState.isCustomer) return;
    const checkDateRollover = () => {
      const latestKey = getLocalDateKey();
      if (latestKey !== todayKey) {
        loadAllData();
      }
    };
    window.addEventListener('focus', checkDateRollover);
    return () => window.removeEventListener('focus', checkDateRollover);
  }, [urlViewState.isCustomer, todayKey, loadAllData]);

  const saveNoticeTimerRef = useRef<number | undefined>(undefined);
  const entryDebounceTimerRef = useRef<number | undefined>(undefined);
  const undoTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current !== undefined) {
        window.clearTimeout(saveNoticeTimerRef.current);
      }
      if (entryDebounceTimerRef.current !== undefined) {
        window.clearTimeout(entryDebounceTimerRef.current);
      }
      if (undoTimerRef.current !== undefined) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const flashSaved = useCallback(
    (msg?: string) => {
      setSaveNotice(msg || t(lang, 'saved'));
      if (saveNoticeTimerRef.current !== undefined) {
        window.clearTimeout(saveNoticeTimerRef.current);
      }
      saveNoticeTimerRef.current = window.setTimeout(() => {
        setSaveNotice('');
      }, 2000);
    },
    [lang]
  );

  const upsertDailyRecordInState = useCallback((record: DailyRecord) => {
    setAllDailyRecords((prev) => {
      const idx = prev.findIndex((r) => r.dateKey === record.dateKey);
      if (idx === -1) {
        return [record, ...prev].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      }
      const next = [...prev];
      next[idx] = record;
      return next;
    });
  }, []);

  const handleDbOperation = useCallback(async (fn: () => Promise<void>) => {
    try {
      setQuotaError(false);
      await fn();
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setQuotaError(true);
      } else {
        throw err;
      }
    }
  }, []);

  const persistDailyRecord = useCallback(
    async (next: DailyRecord) => {
      dailyRecordRef.current = next;
      setDailyRecord(next);
      upsertDailyRecordInState(next);
      await handleDbOperation(async () => {
        await saveDailyRecord(next);
        flashSaved();
      });
    },
    [flashSaved, handleDbOperation, upsertDailyRecordInState]
  );

  const showUndoToast = useCallback(
    (
      fishId: string,
      prevEntry: DailyFishEntry | undefined,
      fishName: string,
      nextStatusLabel: string
    ) => {
      setUndoState({
        fishId,
        prevEntry,
        message: `${fishName}: ${nextStatusLabel}`,
      });
      if (undoTimerRef.current !== undefined) {
        window.clearTimeout(undoTimerRef.current);
      }
      undoTimerRef.current = window.setTimeout(() => {
        setUndoState(null);
      }, 5500);
    },
    []
  );

  const handleUndoLastToggle = useCallback(() => {
    if (!undoState) return;
    triggerHaptic();
    const { fishId, prevEntry } = undoState;
    setUndoState(null);
    if (undoTimerRef.current !== undefined) {
      window.clearTimeout(undoTimerRef.current);
    }
    const latest = dailyRecordRef.current;
    const nextEntries = { ...latest.entries };
    if (prevEntry) {
      nextEntries[fishId] = prevEntry;
    } else {
      delete nextEntries[fishId];
    }
    const nextRecord: DailyRecord = {
      ...latest,
      entries: nextEntries,
      updatedAt: Date.now(),
    };
    void persistDailyRecord(nextRecord);
  }, [persistDailyRecord, undoState]);

  const handleToggleAvailability = useCallback(
    (fishId: string) => {
      triggerHaptic();
      const latest = dailyRecordRef.current;
      const prevEntry = latest.entries[fishId];
      const currentStatus = resolveEntryStatus(prevEntry);
      const nextAvailable =
        currentStatus === 'not_listed' || currentStatus === 'sold_out';
      const nextStatus = nextAvailable ? 'available' : 'not_listed';
      const now = Date.now();
      const nextRecord: DailyRecord = {
        ...latest,
        entries: {
          ...latest.entries,
          [fishId]: {
            ...prevEntry,
            fishId,
            available: nextAvailable,
            status: nextStatus,
            updatedAt: now,
          },
        },
        updatedAt: now,
      };
      void persistDailyRecord(nextRecord);

      const matchedFish = fishListRef.current.find((f) => f.id === fishId);
      if (matchedFish) {
        showUndoToast(
          fishId,
          prevEntry,
          matchedFish.nameMl,
          t(langRef.current, `status_${nextStatus}` as const)
        );
      }
    },
    [persistDailyRecord, showUndoToast]
  );

  const handleToggleIncludePrices = useCallback(
    (include: boolean) => {
      const latest = dailyRecordRef.current;
      const nextRecord: DailyRecord = {
        ...latest,
        includePrices: include,
        updatedAt: Date.now(),
      };
      void persistDailyRecord(nextRecord);
    },
    [persistDailyRecord]
  );

  const handleUpdateEntry = useCallback(
    (fishId: string, patch: Partial<DailyFishEntry>) => {
      const latest = dailyRecordRef.current;
      const now = Date.now();
      const prevEntry = latest.entries[fishId] || {
        fishId,
        available: true,
        status: 'available' as const,
        updatedAt: now,
      };
      const merged: DailyFishEntry = {
        ...prevEntry,
        ...patch,
        fishId,
        updatedAt: now,
      };
      if (patch.status) {
        merged.available =
          patch.status === 'available' || patch.status === 'limited';
      } else if (typeof patch.available === 'boolean') {
        merged.status = patch.available ? 'available' : 'not_listed';
      }

      const nextRecord: DailyRecord = {
        ...latest,
        entries: {
          ...latest.entries,
          [fishId]: merged,
        },
        updatedAt: now,
      };
      dailyRecordRef.current = nextRecord;
      setDailyRecord(nextRecord);
      upsertDailyRecordInState(nextRecord);

      if (entryDebounceTimerRef.current !== undefined) {
        window.clearTimeout(entryDebounceTimerRef.current);
      }
      entryDebounceTimerRef.current = window.setTimeout(() => {
        void handleDbOperation(async () => {
          await saveDailyRecord(nextRecord);
          flashSaved();
        });
      }, 300);
    },
    [flashSaved, handleDbOperation, upsertDailyRecordInState]
  );

  const handleOpenPosterStudio = useCallback((fish: FishItem) => {
    setPosterTargetFish(fish);
  }, []);

  const handleOpenShareList = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleOpenCustomerSnapshot = useCallback(() => {
    setShowCustomerSnapshot(true);
  }, []);

  const handleSaveFish = async (fish: FishItem) => {
    let nextRefNumber = fish.referenceNumber;
    if (nextRefNumber === null) {
      let maxNum = SEEDED_FISH_CATALOG.length;
      for (const f of fishList) {
        if (f.referenceNumber !== null && f.referenceNumber > maxNum) {
          maxNum = f.referenceNumber;
        }
      }
      for (const tr of trashList) {
        if (tr.fish.referenceNumber !== null && tr.fish.referenceNumber > maxNum) {
          maxNum = tr.fish.referenceNumber;
        }
      }
      nextRefNumber = maxNum + 1;
    }

    await handleDbOperation(async () => {
      await saveFishItem({ ...fish, referenceNumber: nextRefNumber });
      const refreshed = await initializeAndLoadCatalog();
      setFishList(refreshed);
      setEditingFish(null);
      setActiveTab('fish');
      flashSaved();
    });
  };

  const handleDeleteFish = async (fishId: string) => {
    const target = fishList.find((f) => f.id === fishId);
    if (!target) return;
    await handleDbOperation(async () => {
      await moveFishToTrash(target);
      const [refreshed, refreshedTrash] = await Promise.all([
        initializeAndLoadCatalog(),
        loadTrashItems(),
      ]);
      setFishList(refreshed);
      setTrashList(refreshedTrash);
      flashSaved(t(lang, 'trash_moved'));
    });
  };

  const handleRestoreFromTrash = async (item: TrashFishItem) => {
    await handleDbOperation(async () => {
      await restoreFishFromTrash(item);
      const [refreshed, refreshedTrash] = await Promise.all([
        initializeAndLoadCatalog(),
        loadTrashItems(),
      ]);
      setFishList(refreshed);
      setTrashList(refreshedTrash);
      flashSaved(t(lang, 'trash_restored'));
    });
  };

  const handleRestoreAllTrash = async () => {
    if (trashList.length === 0) return;
    await handleDbOperation(async () => {
      await restoreAllFishFromTrash(trashList);
      const [refreshed, refreshedTrash] = await Promise.all([
        initializeAndLoadCatalog(),
        loadTrashItems(),
      ]);
      setFishList(refreshed);
      setTrashList(refreshedTrash);
      flashSaved(t(lang, 'trash_restored'));
    });
  };

  const handlePermanentDeleteTrash = async (id: string) => {
    await handleDbOperation(async () => {
      await permanentlyDeleteFromTrash(id);
      const refreshedTrash = await loadTrashItems();
      setTrashList(refreshedTrash);
      flashSaved();
    });
  };

  const handleEmptyTrash = async () => {
    await handleDbOperation(async () => {
      await emptyTrashBin();
      setTrashList([]);
      flashSaved();
    });
  };

  const handleSaveEnquiry = async (enquiry: CustomerEnquiry) => {
    await handleDbOperation(async () => {
      await dbSaveEnquiry(enquiry);
      const refreshed = await loadEnquiries();
      setEnquiries(refreshed);
      flashSaved();
    });
  };

  const handleDeleteEnquiry = async (id: string) => {
    await handleDbOperation(async () => {
      await dbDeleteEnquiry(id);
      const refreshed = await loadEnquiries();
      setEnquiries(refreshed);
      flashSaved();
    });
  };

  const handleMarkBackupCompleted = async (ts: number) => {
    const nextSettings = { ...settings, lastBackupAt: ts };
    await handleDbOperation(async () => {
      await saveSettings(nextSettings);
      setSettings(nextSettings);
    });
  };

  const handleSavePosterAndPhoto = async ({
    fishId,
    actualPhotoDataUrl,
    posterDataUrl,
    background,
  }: {
    fishId: string;
    actualPhotoDataUrl: string;
    posterDataUrl: string;
    background: PosterBackground;
  }) => {
    await handleDbOperation(async () => {
      const target = fishList.find((f) => f.id === fishId);
      if (target) {
        const alreadySaved = target.customActualPhotos.some(
          (p) => p.dataUrl === actualPhotoDataUrl
        );
        const updatedFish: FishItem = {
          ...target,
          preferredBackground: background,
          customActualPhotos: alreadySaved
            ? target.customActualPhotos
            : [
                {
                  id: `photo_${Date.now()}`,
                  dataUrl: actualPhotoDataUrl,
                  createdAt: Date.now(),
                },
                ...target.customActualPhotos,
              ],
          updatedAt: Date.now(),
        };
        await saveFishItem(updatedFish);
        const refreshed = await initializeAndLoadCatalog();
        setFishList(refreshed);
        setPosterTargetFish(updatedFish);

        await savePosterHistoryItem({
          id: `poster_${fishId}_${Date.now()}`,
          dateKey: dailyRecord.dateKey,
          fishId,
          fishNameMl: target.nameMl,
          background,
          posterDataUrl,
          createdAt: Date.now(),
        });
      }

      const prevEntry = dailyRecord.entries[fishId];
      const nextRecord: DailyRecord = {
        ...dailyRecord,
        entries: {
          ...dailyRecord.entries,
          [fishId]: {
            ...prevEntry,
            fishId,
            available: true,
            status: 'available',
            todayPhotoDataUrl: actualPhotoDataUrl,
            todayPosterDataUrl: posterDataUrl,
            updatedAt: Date.now(),
          },
        },
        updatedAt: Date.now(),
      };
      await saveDailyRecord(nextRecord);
      setDailyRecord(nextRecord);
      upsertDailyRecordInState(nextRecord);
      flashSaved();
    });
  };

  const handleSaveSettings = async (nextSettings: BusinessSettings) => {
    await handleDbOperation(async () => {
      await saveSettings(nextSettings);
      setSettings(nextSettings);
      flashSaved(t(lang, 'settings_saved'));
    });
  };

  const handleNavigateFromSearch = (target: SearchActionTarget) => {
    if (target.type === 'share') {
      setShowShareModal(true);
    } else if (target.type === 'poster') {
      setPosterTargetFish(target.fish);
    } else if (target.type === 'edit_fish') {
      setEditingFish(target.fish);
      setActiveTab('add');
    } else if (target.type === 'toggle_theme') {
      handleToggleTheme();
    } else if (target.type === 'switch_lang') {
      handleLanguageChange(target.lang);
    } else if (target.type === 'tab') {
      if (target.tab === 'add') setEditingFish(null);
      setMoreFocusSection(target.moreSection || null);
      setActiveTab(target.tab);
    }
  };

  // Strict Customer Read-Only Mode (?view=customer#market=...)
  if (urlViewState.isCustomer) {
    if (!snapshotReady) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-[#f5f8fc] dark:bg-black text-slate-700 dark:text-neutral-200 p-6">
          <div className="w-8 h-8 rounded-full border-2 border-[#0879d9] border-t-transparent animate-spin" />
        </div>
      );
    }
    return (
      <Suspense
        fallback={
          <div className="min-h-dvh flex items-center justify-center bg-[#f5f8fc] dark:bg-black" />
        }
      >
        <CustomerViewScreen
          snapshot={decodedSnapshot}
          fallbackPhoneDisplay={DEFAULT_BUSINESS_SETTINGS.phoneDisplay}
          fallbackPhoneDigits={DEFAULT_BUSINESS_SETTINGS.phoneDigits}
          catalogForGlossary={SEEDED_FISH_CATALOG}
          onExitToSeller={handleExitCustomerMode}
        />
      </Suspense>
    );
  }

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'today',
      label: t(lang, 'today'),
      icon: <CalendarCheck className="w-5 h-5" />,
    },
    {
      id: 'fish',
      label: t(lang, 'fish_list'),
      icon: <Fish className="w-5 h-5" />,
    },
    {
      id: 'add',
      label: t(lang, 'add_short'),
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      id: 'more',
      label: t(lang, 'more'),
      icon: <MoreHorizontal className="w-5 h-5" />,
    },
  ];

  const brandName =
    lang === 'en' ? settings.businessNameEn : settings.businessNameMl;
  const brandShort = t(lang, 'app_short');

  return (
    <div className="min-h-dvh flex flex-col bg-[#f5f8fc] dark:bg-black text-slate-900 dark:text-white transition-colors">
      {/* Compact Frosted Coastal Top App Bar */}
      <header className="sticky top-0 z-30 bg-white/92 dark:bg-black/95 backdrop-blur-xl text-[#0b1c30] dark:text-white shadow-[0_4px_20px_-4px_rgba(8,45,89,0.08)] border-b border-slate-200/70 dark:border-neutral-800 pt-safe">
        <div className="max-w-6xl mx-auto px-2.5 sm:px-5 h-14 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={BUSINESS_LOGO_PATH}
              alt={brandName}
              className="w-9 h-9 rounded-full object-cover shrink-0 bg-white ring-2 ring-[#082d59]/15 dark:ring-sky-400/30 shadow-xs"
            />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-extrabold text-[#082d59] dark:text-sky-300 leading-tight truncate">
                <span className="hidden min-[420px]:inline">{brandName}</span>
                <span className="min-[420px]:hidden">{brandShort}</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-[#0d9488] dark:text-teal-300 leading-tight truncate">
                {formatDisplayDate(todayKey, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <PWAInstallButton lang={lang} variant="header" />

            {/* Light / Dark Theme Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={
                theme === 'dark' ? t(lang, 'theme_light') : t(lang, 'theme_dark')
              }
              title={
                theme === 'dark' ? t(lang, 'theme_light') : t(lang, 'theme_dark')
              }
              aria-pressed={theme === 'dark'}
              className="min-w-[38px] min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] dark:bg-neutral-900 dark:border dark:border-neutral-700 dark:hover:bg-neutral-800 text-[#082d59] dark:text-white flex items-center justify-center gap-1.5 text-xs font-bold transition shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#facc15] shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-[#082d59] shrink-0" />
              )}
              <span className="hidden md:inline">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Clear Bilingual Toggle */}
            <div
              className="flex items-center p-0.5 bg-[#eff4ff] dark:bg-neutral-900 dark:border dark:border-neutral-800 rounded-full"
              role="group"
              aria-label={t(lang, 'language')}
            >
              <button
                type="button"
                onClick={() => handleLanguageChange('ml')}
                className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold transition whitespace-nowrap ${
                  lang === 'ml'
                    ? 'bg-[#082d59] dark:bg-[#0879d9] text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-300 hover:text-[#082d59] dark:hover:text-white'
                }`}
              >
                <span className="hidden min-[380px]:inline">മലയാളം</span>
                <span className="min-[380px]:hidden">മ</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold transition whitespace-nowrap ${
                  lang === 'en'
                    ? 'bg-[#082d59] dark:bg-[#0879d9] text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-300 hover:text-[#082d59] dark:hover:text-white'
                }`}
              >
                <span className="hidden min-[380px]:inline">English</span>
                <span className="min-[380px]:hidden">EN</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Shell (Side rail on md+, Bottom bar on mobile) */}
      <div className="flex-1 max-w-6xl w-full mx-auto flex flex-col md:flex-row gap-4 px-2.5 sm:px-5 pt-3 sm:pt-5">
        {/* Desktop / Tablet Side Rail */}
        <aside className="hidden md:flex md:flex-col md:w-52 shrink-0 gap-1.5">
          <nav
            aria-label="Primary"
            className="sticky top-20 rounded-3xl bg-white dark:bg-[#0a0a0a] p-2.5 border border-slate-200/70 dark:border-neutral-800 shadow-[0_4px_20px_-4px_rgba(8,45,89,0.06)] space-y-1"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'add') setEditingFish(null);
                    setMoreFocusSection(null);
                    setActiveTab(item.id);
                  }}
                  className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-3 transition ${
                    active
                      ? 'bg-[#082d59] dark:bg-[#0879d9] text-white shadow-xs'
                      : 'text-slate-700 dark:text-neutral-300 hover:bg-[#eff4ff] dark:hover:bg-neutral-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Active Screen */}
        <main className="flex-1 min-w-0">
          {!isOnline && (
            <div className="mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'offline_ready')}</span>
            </div>
          )}

          {quotaError && (
            <div
              role="alert"
              className="mb-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm font-semibold text-rose-900 dark:text-rose-200"
            >
              {t(lang, 'quota_error')}
            </div>
          )}

          {(saveNotice || undoState) && (
            <div className="fixed top-[62px] left-1/2 -translate-x-1/2 md:left-auto md:right-5 md:translate-x-0 z-40 w-[calc(100%-1.5rem)] max-w-md pointer-events-none flex flex-col items-stretch gap-1.5">
              {undoState ? (
                <div
                  role="status"
                  aria-live="polite"
                  data-testid="undo-toast"
                  className="pointer-events-auto rounded-2xl bg-slate-900 dark:bg-neutral-900 text-white border border-slate-700 px-3.5 py-2 shadow-xl flex items-center justify-between gap-3"
                >
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {undoState.message}
                  </span>
                  <button
                    type="button"
                    onClick={handleUndoLastToggle}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>{t(lang, 'undo_action')}</span>
                  </button>
                </div>
              ) : (
                saveNotice && (
                  <div className="self-end rounded-xl bg-[#082d59] dark:bg-[#0879d9] text-white px-3.5 py-2 text-xs font-semibold shadow-lg">
                    {saveNotice}
                  </div>
                )
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="aspect-[3/4] rounded-3xl bg-slate-200/70 dark:bg-neutral-900 animate-pulse"
                />
              ))}
            </div>
          ) : activeTab === 'today' ? (
            <TodayScreen
              lang={lang}
              fishList={fishList}
              dailyRecord={dailyRecord}
              allDailyRecords={allDailyRecords}
              trashList={trashList}
              settings={settings}
              onToggleAvailability={handleToggleAvailability}
              onToggleIncludePrices={handleToggleIncludePrices}
              onUpdateEntry={handleUpdateEntry}
              onOpenPosterStudio={handleOpenPosterStudio}
              onOpenShareList={handleOpenShareList}
              onOpenCustomerSnapshot={handleOpenCustomerSnapshot}
              onNavigateFromSearch={handleNavigateFromSearch}
            />
          ) : (
            <Suspense
              fallback={
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="aspect-[3/4] rounded-3xl bg-slate-200/70 dark:bg-neutral-900 animate-pulse"
                    />
                  ))}
                </div>
              }
            >
              {activeTab === 'fish' ? (
                <FishCatalogueScreen
                  lang={lang}
                  fishList={fishList}
                  onAddNew={() => {
                    setEditingFish(null);
                    setActiveTab('add');
                  }}
                  onEditFish={(fish) => {
                    setEditingFish(fish);
                    setActiveTab('add');
                  }}
                  onDeleteFish={handleDeleteFish}
                  onOpenPosterStudio={(fish) => setPosterTargetFish(fish)}
                />
              ) : activeTab === 'add' ? (
                <AddEditFishScreen
                  key={editingFish?.id ?? 'new'}
                  lang={lang}
                  editingFish={editingFish}
                  defaultBackground={settings.defaultBackground}
                  onSave={handleSaveFish}
                  onCancel={() => {
                    setEditingFish(null);
                    setActiveTab('fish');
                  }}
                />
              ) : (
                <MoreScreen
                  lang={lang}
                  onChangeLang={handleLanguageChange}
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  fishList={fishList}
                  dailyRecord={dailyRecord}
                  allDailyRecords={allDailyRecords}
                  trashList={trashList}
                  enquiries={enquiries}
                  onSaveEnquiry={handleSaveEnquiry}
                  onDeleteEnquiry={handleDeleteEnquiry}
                  onOpenCustomerSnapshot={() => setShowCustomerSnapshot(true)}
                  onMarkBackupCompleted={handleMarkBackupCompleted}
                  onRestoreFromTrash={handleRestoreFromTrash}
                  onRestoreAllTrash={handleRestoreAllTrash}
                  onPermanentDeleteTrash={handlePermanentDeleteTrash}
                  onEmptyTrash={handleEmptyTrash}
                  onAfterRestore={loadAllData}
                  focusSection={moreFocusSection}
                />
              )}
            </Suspense>
          )}
        </main>
      </div>

      {/* Mobile Fixed Frosted Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-[0_-4px_20px_-4px_rgba(8,45,89,0.08)] border-t border-slate-200/70 dark:border-neutral-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-15">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'add') setEditingFish(null);
                  setMoreFocusSection(null);
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
                  active
                    ? 'text-[#082d59] dark:text-sky-300'
                    : 'text-[#43474f] dark:text-neutral-400 hover:text-[#082d59] dark:hover:text-white'
                }`}
              >
                <span
                  className={`px-3 py-1 rounded-full transition-colors ${
                    active
                      ? 'bg-[#eff4ff] dark:bg-sky-950 text-[#082d59] dark:text-sky-300'
                      : ''
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate max-w-full px-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3:4 Poster Studio Modal */}
      {posterTargetFish && (
        <Suspense fallback={null}>
          <PosterStudioModal
            lang={lang}
            fish={posterTargetFish}
            dateKey={dailyRecord.dateKey}
            entry={dailyRecord.entries[posterTargetFish.id]}
            includePrices={dailyRecord.includePrices}
            settings={settings}
            onClose={() => setPosterTargetFish(null)}
            onSavePosterAndPhoto={handleSavePosterAndPhoto}
          />
        </Suspense>
      )}

      {/* WhatsApp Share Today's List Modal */}
      {showShareModal && (
        <Suspense fallback={null}>
          <ShareListModal
            lang={lang}
            fishList={fishList}
            dailyRecord={dailyRecord}
            settings={settings}
            onClose={() => setShowShareModal(false)}
          />
        </Suspense>
      )}

      {/* Customer Snapshot Share & Offline HTML Export Modal */}
      {showCustomerSnapshot && (
        <Suspense fallback={null}>
          <CustomerSnapshotModal
            lang={lang}
            fishList={fishList}
            dailyRecord={dailyRecord}
            settings={settings}
            onSaveDefaults={handleSaveSettings}
            onClose={() => setShowCustomerSnapshot(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
