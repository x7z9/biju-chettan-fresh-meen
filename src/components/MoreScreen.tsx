import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Download,
  Image as ImageIcon,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { BUSINESS_LOGO_PATH, REFERENCE_SHEET_PATH } from '../data/seedCatalog';
import { t } from '../data/translations';
import {
  buildFullBackup,
  restoreFullBackup,
  validateBackupPayload,
} from '../db/indexedDb';
import type {
  BackupPayload,
  BusinessSettings,
  DailyRecord,
  FishItem,
  Language,
  PosterBackground,
  PosterLanguageMode,
  TrashFishItem,
} from '../types';
import {
  downloadBlob,
  formatDisplayDate,
  getLocalDateKey,
} from '../utils/speechAndDate';
import { PWAInstallButton } from './PWAInstallButton';

interface MoreScreenProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  settings: BusinessSettings;
  onSaveSettings: (settings: BusinessSettings) => Promise<void>;
  fishList: FishItem[];
  allDailyRecords: DailyRecord[];
  trashList: TrashFishItem[];
  onRestoreFromTrash: (item: TrashFishItem) => Promise<void>;
  onRestoreAllTrash: () => Promise<void>;
  onPermanentDeleteTrash: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
  onAfterRestore: () => Promise<void>;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  lang,
  onChangeLang,
  settings,
  onSaveSettings,
  fishList,
  allDailyRecords,
  trashList,
  onRestoreFromTrash,
  onRestoreAllTrash,
  onPermanentDeleteTrash,
  onEmptyTrash,
  onAfterRestore,
}) => {
  const [formSettings, setFormSettings] = useState<BusinessSettings>(settings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [restorePreview, setRestorePreview] = useState<BackupPayload | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [showReferences, setShowReferences] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [trashBusy, setTrashBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(formSettings);
    setSettingsSavedMsg(t(lang, 'settings_saved'));
    setTimeout(() => setSettingsSavedMsg(''), 2500);
  };

  const handleExportFullBackup = async () => {
    const payload = await buildFullBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `biju-fresh-meen-backup-${dateStr}.json`);
    setBackupMsg(t(lang, 'backup_success'));
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const handleExportCatalogOnly = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      fish: fishList,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `biju-fish-catalogue-${dateStr}.json`);
    setBackupMsg(t(lang, 'backup_success'));
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const handlePickRestoreFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const valid = validateBackupPayload(parsed);
      if (!valid) {
        setRestoreError(t(lang, 'restore_invalid'));
        return;
      }
      setRestorePreview(valid);
    } catch {
      setRestoreError(t(lang, 'restore_invalid'));
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!restorePreview) return;
    await restoreFullBackup(restorePreview);
    setRestorePreview(null);
    await onAfterRestore();
    setBackupMsg(t(lang, 'restore_success'));
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const historyWithAvailable = allDailyRecords.filter((rec) =>
    Object.values(rec.entries).some((e) => e.available)
  );

  const countPhotosInBackup = (payload: BackupPayload) =>
    payload.fish.reduce((sum, f) => sum + (f.customActualPhotos?.length || 0), 0);

  return (
    <div className="space-y-4 pb-24 max-w-3xl mx-auto">
      {/* Install App & Language Card */}
      <section className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800">
          <img
            src={BUSINESS_LOGO_PATH}
            alt={settings.whatsappGroupNameMl}
            className="w-14 h-14 rounded-full object-cover shrink-0 border border-slate-200 dark:border-neutral-700"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
              {settings.whatsappGroupNameMl}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-snug break-words mt-0.5">
              {lang === 'en' ? settings.locationEn : settings.locationMl} · {settings.phoneDisplay}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug">
            {t(lang, 'language')}
          </h2>
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-black border border-transparent dark:border-neutral-800 rounded-xl">
            <button
              type="button"
              onClick={() => onChangeLang('ml')}
              className={`min-h-[42px] px-4 py-1.5 rounded-lg text-sm font-bold leading-snug ${
                lang === 'ml'
                  ? 'bg-[#082d59] dark:bg-[#0879d9] text-white'
                  : 'text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              മലയാളം
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`min-h-[42px] px-4 py-1.5 rounded-lg text-sm font-bold leading-snug ${
                lang === 'en'
                  ? 'bg-[#082d59] dark:bg-[#0879d9] text-white'
                  : 'text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <PWAInstallButton lang={lang} variant="card" />

        <div className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3.5 text-xs sm:text-sm text-slate-700 dark:text-neutral-300 flex items-start gap-2.5 leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span className="break-words">{t(lang, 'privacy_note')}</span>
        </div>
      </section>

      {/* Trash Bin (Restore Accidentally Deleted Fish) */}
      <section
        aria-labelledby="trash-bin-heading"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Trash2 className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
            <h2
              id="trash-bin-heading"
              className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words"
            >
              {t(lang, 'trash_bin')}
              {trashList.length > 0 && (
                <span className="ml-1.5 tabular-nums text-sm font-bold text-slate-600 dark:text-neutral-400">
                  ({trashList.length})
                </span>
              )}
            </h2>
          </div>

          {trashList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={trashBusy}
                onClick={async () => {
                  setTrashBusy(true);
                  try {
                    await onRestoreAllTrash();
                  } finally {
                    setTrashBusy(false);
                  }
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 leading-snug"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span className="break-words">{t(lang, 'trash_restore_all')}</span>
              </button>
              <button
                type="button"
                disabled={trashBusy}
                onClick={() => setConfirmEmptyTrash(true)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50 text-xs sm:text-sm font-semibold leading-snug"
              >
                {t(lang, 'trash_empty_action')}
              </button>
            </div>
          )}
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed break-words">
          {t(lang, 'trash_hint')}
        </p>

        {trashList.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-4 text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">
            {t(lang, 'trash_empty')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {trashList.map((item) => {
              const photoSrc =
                item.fish.customActualPhotos[0]?.dataUrl || item.fish.referenceImage;
              const deletedDateKey = getLocalDateKey(new Date(item.deletedAt));

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-14 h-16 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={item.fish.nameMl}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 p-1 text-center break-words">
                          {item.fish.nameMl}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug break-words">
                        {item.fish.nameMl}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-snug break-words">
                        {item.fish.pronunciationLatin}
                        {item.fish.nameEn ? ` · ${item.fish.nameEn}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-500 leading-snug mt-0.5 break-words">
                        {t(lang, 'trash_deleted_on')}:{' '}
                        {formatDisplayDate(deletedDateKey, lang)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={trashBusy}
                      onClick={async () => {
                        setTrashBusy(true);
                        try {
                          await onRestoreFromTrash(item);
                        } finally {
                          setTrashBusy(false);
                        }
                      }}
                      className="flex-1 min-[420px]:flex-initial min-h-[44px] px-3.5 py-2 rounded-xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] disabled:opacity-50 leading-snug"
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span>{t(lang, 'trash_restore')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={trashBusy}
                      onClick={async () => {
                        setTrashBusy(true);
                        try {
                          await onPermanentDeleteTrash(item.id);
                        } finally {
                          setTrashBusy(false);
                        }
                      }}
                      className="min-w-[44px] min-h-[44px] px-2.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50"
                      aria-label={`${t(lang, 'trash_delete_forever')} ${item.fish.nameMl}`}
                      title={t(lang, 'trash_delete_forever')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Daily History */}
      <section className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
          <h2 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug">
            {t(lang, 'history')}
          </h2>
        </div>

        {historyWithAvailable.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">{t(lang, 'no_history')}</p>
        ) : (
          <div className="space-y-2.5">
            {historyWithAvailable.slice(0, 14).map((rec) => {
              const names = Object.values(rec.entries)
                .filter((e) => e.available)
                .map((e) => {
                  const found = fishList.find((f) => f.id === e.fishId);
                  return found ? found.nameMl : e.fishId;
                });

              return (
                <div
                  key={rec.dateKey}
                  className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3.5 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold text-[#082d59] dark:text-sky-300 leading-snug">
                    <span className="break-words">{formatDisplayDate(rec.dateKey, lang)}</span>
                    <span className="tabular-nums text-slate-600 dark:text-neutral-400 shrink-0">
                      {names.length} {t(lang, 'fish_word')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-neutral-200 leading-relaxed break-words">
                    {names.join(' · ')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Backup & Restore */}
      <section className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3">
        <h2 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug">
          {t(lang, 'backup')}
        </h2>

        {backupMsg && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 leading-snug">
            <Check className="w-4 h-4 shrink-0" />
            <span className="break-words">{backupMsg}</span>
          </div>
        )}

        {restoreError && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-sm font-semibold text-rose-800 dark:text-rose-200 leading-snug break-words">
            {restoreError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportFullBackup}
            className="min-h-[48px] px-4 py-3 rounded-2xl bg-[#0879d9] text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-[#0667ba] leading-snug text-center"
          >
            <Download className="w-5 h-5 shrink-0" />
            <span className="break-words">{t(lang, 'export')}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[48px] px-4 py-3 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-neutral-800 leading-snug text-center"
          >
            <Upload className="w-5 h-5 shrink-0" />
            <span className="break-words">{t(lang, 'restore')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handlePickRestoreFile}
            className="sr-only"
          />
        </div>

        <button
          type="button"
          onClick={handleExportCatalogOnly}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 font-semibold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-neutral-900 leading-snug text-center break-words"
        >
          {t(lang, 'export_catalog')}
        </button>
      </section>

      {/* Business & Poster Settings */}
      <section className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
          <h2 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug">
            {t(lang, 'app_settings')}
          </h2>
        </div>

        <form onSubmit={handleSettingsSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
                {t(lang, 'business_name_ml')}
              </label>
              <input
                type="text"
                value={formSettings.businessNameMl}
                onChange={(e) =>
                  setFormSettings((s) => ({ ...s, businessNameMl: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
                {t(lang, 'business_name_en')}
              </label>
              <input
                type="text"
                value={formSettings.businessNameEn}
                onChange={(e) =>
                  setFormSettings((s) => ({ ...s, businessNameEn: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
                {t(lang, 'whatsapp_group_label')}
              </label>
              <input
                type="text"
                value={formSettings.whatsappGroupNameMl}
                onChange={(e) =>
                  setFormSettings((s) => ({
                    ...s,
                    whatsappGroupNameMl: e.target.value,
                  }))
                }
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
                {t(lang, 'phone_label')}
              </label>
              <input
                type="text"
                value={formSettings.phoneDisplay}
                onChange={(e) =>
                  setFormSettings((s) => ({ ...s, phoneDisplay: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
                {t(lang, 'location_ml')}
              </label>
              <input
                type="text"
                value={formSettings.locationMl}
                onChange={(e) =>
                  setFormSettings((s) => ({ ...s, locationMl: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
                {t(lang, 'location_en')}
              </label>
              <input
                type="text"
                value={formSettings.locationEn}
                onChange={(e) =>
                  setFormSettings((s) => ({ ...s, locationEn: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
                {t(lang, 'poster_lang_label')}
              </label>
              <select
                value={formSettings.posterLanguage}
                onChange={(e) =>
                  setFormSettings((s) => ({
                    ...s,
                    posterLanguage: e.target.value as PosterLanguageMode,
                  }))
                }
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm"
              >
                <option value="ml">{t(lang, 'poster_lang_ml')}</option>
                <option value="en">{t(lang, 'poster_lang_en')}</option>
                <option value="bilingual">{t(lang, 'poster_lang_bilingual')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
                {t(lang, 'preferred_bg')}
              </label>
              <select
                value={formSettings.defaultBackground}
                onChange={(e) =>
                  setFormSettings((s) => ({
                    ...s,
                    defaultBackground: e.target.value as PosterBackground,
                  }))
                }
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm"
              >
                <option value="blue-tray">{t(lang, 'blue_tray')}</option>
                <option value="banana-leaf">{t(lang, 'banana_leaf')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 leading-snug">
              {t(lang, 'disclaimer_ml')}
            </label>
            <input
              type="text"
              value={formSettings.disclaimerMl}
              onChange={(e) =>
                setFormSettings((s) => ({ ...s, disclaimerMl: e.target.value }))
              }
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white text-sm"
            />
          </div>

          {settingsSavedMsg && (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 leading-snug">
              {settingsSavedMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-base hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] leading-snug text-center"
          >
            {t(lang, 'save')}
          </button>
        </form>
      </section>

      {/* Poster Reference Sheet Section */}
      <section className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3">
        <button
          type="button"
          onClick={() => setShowReferences((v) => !v)}
          className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
            <h2 className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
              {t(lang, 'poster_references')}
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#0879d9] dark:text-sky-400 shrink-0 leading-snug">
            {showReferences ? t(lang, 'close') : t(lang, 'view_day')}
          </span>
        </button>

        {showReferences && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed break-words">
              {t(lang, 'reference_sheet_caption')}
            </p>
            <img
              src={REFERENCE_SHEET_PATH}
              alt={t(lang, 'poster_references')}
              className="w-full rounded-2xl border border-slate-200 dark:border-neutral-800 object-contain bg-slate-50 dark:bg-black"
            />
          </div>
        )}
      </section>

      {/* Restore Preview & Confirmation Modal */}
      {restorePreview && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 p-6 shadow-2xl space-y-4 pb-safe">
            <h3 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
              {t(lang, 'restore_preview_title')}
            </h3>
            <div className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-4 text-sm text-slate-800 dark:text-neutral-200 space-y-1.5 tabular-nums">
              <p>
                {restorePreview.fish.length} {t(lang, 'fish_word')}
              </p>
              <p>
                {countPhotosInBackup(restorePreview)} {t(lang, 'photos_word')}
              </p>
              <p>
                {restorePreview.dailyRecords.length} {t(lang, 'days_word')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRestorePreview(null)}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-transparent dark:border-neutral-800 text-slate-800 dark:text-neutral-200 font-bold leading-snug text-center"
              >
                {t(lang, 'cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold leading-snug text-center"
              >
                {t(lang, 'restore_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Empty Trash Modal (No window.confirm) */}
      {confirmEmptyTrash && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0a0a0a] border border-transparent dark:border-neutral-800 p-6 shadow-2xl space-y-4 pb-safe">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
              {t(lang, 'trash_confirm_empty')}
            </h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmEmptyTrash(false)}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border border-transparent dark:border-neutral-800 font-semibold leading-snug text-center"
              >
                {t(lang, 'cancel')}
              </button>
              <button
                type="button"
                disabled={trashBusy}
                onClick={async () => {
                  setTrashBusy(true);
                  try {
                    await onEmptyTrash();
                    setConfirmEmptyTrash(false);
                  } finally {
                    setTrashBusy(false);
                  }
                }}
                className="flex-1 min-h-[48px] px-3 py-2.5 rounded-2xl bg-rose-600 text-white font-semibold leading-snug text-center disabled:opacity-50"
              >
                {t(lang, 'trash_empty_action')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
