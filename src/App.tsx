import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarCheck,
  Fish,
  Moon,
  MoreHorizontal,
  PlusCircle,
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
import {
  BUSINESS_LOGO_PATH,
  DEFAULT_BUSINESS_SETTINGS,
} from './data/seedCatalog';
import { t } from './data/translations';
import {
  emptyTrashBin,
  initializeAndLoadCatalog,
  loadAllDailyRecords,
  loadDailyRecord,
  loadSettings,
  loadTrashItems,
  moveFishToTrash,
  permanentlyDeleteFromTrash,
  restoreAllFishFromTrash,
  restoreFishFromTrash,
  saveDailyRecord,
  saveFishItem,
  savePosterHistoryItem,
  saveSettings,
  StorageQuotaError,
} from './db/indexedDb';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type {
  ActiveTab,
  BusinessSettings,
  DailyFishEntry,
  DailyRecord,
  FishItem,
  Language,
  PosterBackground,
  TrashFishItem,
} from './types';
import {
  formatDisplayDate,
  getLocalDateKey,
  triggerHaptic,
} from './utils/speechAndDate';

const LANG_STORAGE_KEY = 'biju_meen_lang';
const THEME_STORAGE_KEY = 'biju_meen_theme';

export default function App() {
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
  const [isLoading, setIsLoading] = useState(true);
  const [saveNotice, setSaveNotice] = useState('');
  const [quotaError, setQuotaError] = useState(false);

  const [editingFish, setEditingFish] = useState<FishItem | null>(null);
  const [posterTargetFish, setPosterTargetFish] = useState<FishItem | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const isOnline = useOnlineStatus();

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
      const [catalog, loadedSettings, todayRec, allRecords, loadedTrash] =
        await Promise.all([
          initializeAndLoadCatalog(),
          loadSettings(),
          loadDailyRecord(currentKey),
          loadAllDailyRecords(),
          loadTrashItems(),
        ]);
      setFishList(catalog);
      setSettings(loadedSettings);
      setDailyRecord(todayRec);
      setAllDailyRecords(allRecords);
      setTrashList(loadedTrash);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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
    const checkDateRollover = () => {
      const latestKey = getLocalDateKey();
      if (latestKey !== todayKey) {
        loadAllData();
      }
    };
    window.addEventListener('focus', checkDateRollover);
    return () => window.removeEventListener('focus', checkDateRollover);
  }, [todayKey, loadAllData]);

  const saveNoticeTimerRef = useRef<number | undefined>(undefined);
  const entryDebounceTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current !== undefined) {
        window.clearTimeout(saveNoticeTimerRef.current);
      }
      if (entryDebounceTimerRef.current !== undefined) {
        window.clearTimeout(entryDebounceTimerRef.current);
      }
    };
  }, []);

  const flashSaved = useCallback((msg?: string) => {
    setSaveNotice(msg || t(lang, 'saved'));
    if (saveNoticeTimerRef.current !== undefined) {
      window.clearTimeout(saveNoticeTimerRef.current);
    }
    saveNoticeTimerRef.current = window.setTimeout(() => {
      setSaveNotice('');
    }, 2000);
  }, [lang]);

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

  const handleDbOperation = async (fn: () => Promise<void>) => {
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
  };

  const persistDailyRecord = async (next: DailyRecord) => {
    setDailyRecord(next);
    upsertDailyRecordInState(next);
    await handleDbOperation(async () => {
      await saveDailyRecord(next);
      flashSaved();
    });
  };

  const handleToggleAvailability = (fishId: string) => {
    triggerHaptic();
    const prevEntry = dailyRecord.entries[fishId];
    const nextAvailable = !prevEntry?.available;
    const nextRecord: DailyRecord = {
      ...dailyRecord,
      entries: {
        ...dailyRecord.entries,
        [fishId]: {
          ...prevEntry,
          fishId,
          available: nextAvailable,
          updatedAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    };
    persistDailyRecord(nextRecord);
  };

  const handleToggleIncludePrices = (include: boolean) => {
    const nextRecord: DailyRecord = {
      ...dailyRecord,
      includePrices: include,
      updatedAt: Date.now(),
    };
    persistDailyRecord(nextRecord);
  };

  const handleUpdateEntry = (
    fishId: string,
    patch: Partial<DailyFishEntry>
  ) => {
    const prevEntry = dailyRecord.entries[fishId] || {
      fishId,
      available: true,
      updatedAt: Date.now(),
    };
    const nextRecord: DailyRecord = {
      ...dailyRecord,
      entries: {
        ...dailyRecord.entries,
        [fishId]: {
          ...prevEntry,
          ...patch,
          fishId,
          updatedAt: Date.now(),
        },
      },
      updatedAt: Date.now(),
    };
    setDailyRecord(nextRecord);
    upsertDailyRecordInState(nextRecord);

    if (entryDebounceTimerRef.current !== undefined) {
      window.clearTimeout(entryDebounceTimerRef.current);
    }
    entryDebounceTimerRef.current = window.setTimeout(() => {
      handleDbOperation(async () => {
        await saveDailyRecord(nextRecord);
        flashSaved();
      });
    }, 300);
  };

  const handleSaveFish = async (fish: FishItem) => {
    await handleDbOperation(async () => {
      await saveFishItem(fish);
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
      {/* Compact Top App Bar */}
      <header className="sticky top-0 z-30 bg-[#082d59] dark:bg-black text-white shadow-sm border-b border-transparent dark:border-neutral-800 pt-safe">
        <div className="max-w-6xl mx-auto px-2.5 sm:px-5 h-14 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={BUSINESS_LOGO_PATH}
              alt={brandName}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 bg-white ring-1 ring-white/30"
            />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold leading-tight truncate">
                <span className="hidden min-[420px]:inline">{brandName}</span>
                <span className="min-[420px]:hidden">{brandShort}</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-sky-200 dark:text-sky-300 leading-tight truncate">
                {formatDisplayDate(todayKey, lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <PWAInstallButton lang={lang} variant="header" />

            {/* Light / Dark Theme Toggle Button in Navigation Bar */}
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
              className="min-w-[38px] min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 dark:bg-neutral-900 dark:border dark:border-neutral-700 dark:hover:bg-neutral-800 text-white flex items-center justify-center gap-1.5 text-xs font-bold transition shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#facc15] shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-sky-200 shrink-0" />
              )}
              <span className="hidden md:inline">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Clear Bilingual Toggle */}
            <div
              className="flex items-center p-0.5 bg-white/15 dark:bg-neutral-900 dark:border dark:border-neutral-800 rounded-xl"
              role="group"
              aria-label={t(lang, 'language')}
            >
              <button
                type="button"
                onClick={() => handleLanguageChange('ml')}
                className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition whitespace-nowrap ${
                  lang === 'ml'
                    ? 'bg-white text-[#082d59] dark:text-black'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                മലയാളം
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition whitespace-nowrap ${
                  lang === 'en'
                    ? 'bg-white text-[#082d59] dark:text-black'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                English
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
            className="sticky top-20 rounded-3xl bg-white dark:bg-[#0a0a0a] p-2.5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-1"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'add') setEditingFish(null);
                    setActiveTab(item.id);
                  }}
                  className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-3 transition ${
                    active
                      ? 'bg-[#082d59] dark:bg-[#0879d9] text-white'
                      : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-900'
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

          {saveNotice && (
            <div className="fixed top-16 right-4 z-40 rounded-xl bg-[#082d59] dark:bg-[#0879d9] text-white px-3.5 py-2 text-xs font-semibold shadow-lg">
              {saveNotice}
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
              onToggleAvailability={handleToggleAvailability}
              onToggleIncludePrices={handleToggleIncludePrices}
              onUpdateEntry={handleUpdateEntry}
              onOpenPosterStudio={(fish) => setPosterTargetFish(fish)}
              onOpenShareList={() => setShowShareModal(true)}
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
                  allDailyRecords={allDailyRecords}
                  trashList={trashList}
                  onRestoreFromTrash={handleRestoreFromTrash}
                  onRestoreAllTrash={handleRestoreAllTrash}
                  onPermanentDeleteTrash={handlePermanentDeleteTrash}
                  onEmptyTrash={handleEmptyTrash}
                  onAfterRestore={loadAllData}
                />
              )}
            </Suspense>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-slate-200 dark:border-neutral-800 pb-safe"
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
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
                  active
                    ? 'text-[#082d59] dark:text-sky-300'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span
                  className={`p-1 rounded-xl ${
                    active
                      ? 'bg-sky-100 dark:bg-sky-950 text-[#0879d9] dark:text-sky-300'
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
    </div>
  );
}
