import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Check,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  MessageCircle,
  MessageSquareQuote,
  QrCode,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  COASTAL_DIRECTORY_ENTRIES,
  COASTAL_DIRECTORY_META,
  DEFAULT_MESSAGE_TEMPLATES,
} from '../data/coastalDirectory';
import { BUSINESS_LOGO_PATH, REFERENCE_SHEET_PATH } from '../data/seedCatalog';
import { t } from '../data/translations';
import {
  buildFullBackup,
  resolveEntryStatus,
  restoreFullBackup,
  validateBackupPayload,
} from '../db/indexedDb';
import type {
  BackupPayload,
  BusinessSettings,
  CustomerEnquiry,
  DailyRecord,
  FishItem,
  Language,
  MessageTemplateItem,
  PosterBackground,
  PosterLanguageMode,
  TrashFishItem,
} from '../types';
import { formatBytes } from '../utils/customerHtmlExport';
import {
  buildCustomerSnapshotPayload,
  buildCustomerSnapshotUrl,
} from '../utils/customerSnapshot';
import { renderQrToPngDataUrl, renderQrToSvgString } from '../utils/qrCode';
import {
  dataUrlToBlob,
  downloadBlob,
  formatDisplayDate,
  getLocalDateKey,
} from '../utils/speechAndDate';
import { applyMessageTemplate, openWhatsAppTextLink } from '../utils/whatsappHelper';
import { EnquiryNotebookSection } from './EnquiryNotebookSection';
import { GlossaryModal } from './GlossaryModal';
import { PWAInstallButton } from './PWAInstallButton';

interface MoreScreenProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  settings: BusinessSettings;
  onSaveSettings: (settings: BusinessSettings) => Promise<void>;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  allDailyRecords: DailyRecord[];
  trashList: TrashFishItem[];
  enquiries: CustomerEnquiry[];
  onSaveEnquiry: (enquiry: CustomerEnquiry) => Promise<void>;
  onDeleteEnquiry: (id: string) => Promise<void>;
  onOpenCustomerSnapshot: () => void;
  onMarkBackupCompleted: (ts: number) => Promise<void>;
  onRestoreFromTrash: (item: TrashFishItem) => Promise<void>;
  onRestoreAllTrash: () => Promise<void>;
  onPermanentDeleteTrash: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
  onAfterRestore: () => Promise<void>;
  focusSection?: string | null;
}

type QrMode = 'shop' | 'customer' | 'whatsapp';

export const MoreScreen: React.FC<MoreScreenProps> = ({
  lang,
  onChangeLang,
  settings,
  onSaveSettings,
  fishList,
  dailyRecord,
  allDailyRecords,
  trashList,
  enquiries,
  onSaveEnquiry,
  onDeleteEnquiry,
  onOpenCustomerSnapshot,
  onMarkBackupCompleted,
  onRestoreFromTrash,
  onRestoreAllTrash,
  onPermanentDeleteTrash,
  onEmptyTrash,
  onAfterRestore,
  focusSection,
}) => {
  const [formSettings, setFormSettings] = useState<BusinessSettings>(settings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [restorePreview, setRestorePreview] = useState<BackupPayload | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [showReferences, setShowReferences] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [trashBusy, setTrashBusy] = useState(false);
  const [qrMode, setQrMode] = useState<QrMode>('shop');
  const [qrCopied, setQrCopied] = useState(false);
  const [copiedTplId, setCopiedTplId] = useState<string | null>(null);
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [qrSnapshotUrl, setQrSnapshotUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!focusSection) return;
    if (focusSection === 'references') {
      setShowReferences(true);
    } else if (focusSection === 'directory') {
      setShowDirectory(true);
    } else if (focusSection === 'glossary') {
      setShowGlossaryModal(true);
    }
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`more-section-${focusSection}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusSection]);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    if (qrMode !== 'customer') return;
    const snap = buildCustomerSnapshotPayload(fishList, dailyRecord, settings, {
      includePhone: settings.showPhoneToCustomers !== false,
      includePrices: dailyRecord.includePrices,
      includeQuantity: true,
      includeNotes: true,
      includeDirections: Boolean(settings.showDirectionsLink && settings.mapsQueryUrl),
      customerLang: lang,
      includeSoldOut: true,
    });
    buildCustomerSnapshotUrl(snap)
      .then(({ url }) => {
        if (!cancelled) setQrSnapshotUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [qrMode, fishList, dailyRecord, settings, lang]);

  const shopHomeUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://x7z9.github.io/biju-chettan-fresh-meen/';
    const base = import.meta.env.BASE_URL || '/';
    return `${window.location.origin}${base.endsWith('/') ? base : `${base}/`}`;
  }, []);

  const whatsappDirectUrl = useMemo(() => {
    const clean = settings.phoneDigits.replace(/\D/g, '');
    const e164 = clean.length === 10 ? `91${clean}` : clean;
    return `https://wa.me/${e164}`;
  }, [settings.phoneDigits]);

  const activeQrUrl = useMemo(() => {
    if (qrMode === 'customer' && qrSnapshotUrl) return qrSnapshotUrl;
    if (qrMode === 'whatsapp') return whatsappDirectUrl;
    return shopHomeUrl;
  }, [qrMode, qrSnapshotUrl, whatsappDirectUrl, shopHomeUrl]);

  const qrSvgDataUri = useMemo(() => {
    const svg = renderQrToSvgString(activeQrUrl, 4);
    if (!svg) return '';
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [activeQrUrl]);

  const estimatedBackupBytes = useMemo(() => {
    try {
      return new Blob([
        JSON.stringify({
          fish: fishList,
          dailyRecords: allDailyRecords,
          trash: trashList,
          enquiries,
          settings,
        }),
      ]).size;
    } catch {
      return 0;
    }
  }, [fishList, allDailyRecords, trashList, enquiries, settings]);

  const isBackupOverdue = useMemo(() => {
    if (!settings.lastBackupAt) return true;
    return Date.now() - settings.lastBackupAt > 7 * 24 * 60 * 60 * 1000;
  }, [settings.lastBackupAt]);

  const templates: MessageTemplateItem[] = useMemo(() => {
    return settings.messageTemplates && settings.messageTemplates.length > 0
      ? settings.messageTemplates
      : DEFAULT_MESSAGE_TEMPLATES;
  }, [settings.messageTemplates]);

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
    await onMarkBackupCompleted(Date.now());
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

  const handleCopyQrLink = async () => {
    try {
      await navigator.clipboard.writeText(activeQrUrl);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  const handleDownloadQrPng = () => {
    const dataUrl = renderQrToPngDataUrl(activeQrUrl, 600);
    if (!dataUrl) return;
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return;
    downloadBlob(blob, `biju-fresh-fish-qr-${qrMode}-${getLocalDateKey()}.png`);
  };

  const handleTemplateBodyChange = async (tplId: string, newBody: string) => {
    const nextTemplates = templates.map((tpl) =>
      tpl.id === tplId
        ? {
            ...tpl,
            ...(lang === 'en' ? { bodyEn: newBody } : { bodyMl: newBody }),
          }
        : tpl
    );
    await onSaveSettings({
      ...settings,
      messageTemplates: nextTemplates,
    });
  };

  const handleResetTemplates = async () => {
    await onSaveSettings({
      ...settings,
      messageTemplates: DEFAULT_MESSAGE_TEMPLATES,
    });
    setEditingTplId(null);
  };

  const historyWithAvailable = allDailyRecords.filter((rec) =>
    Object.values(rec.entries).some((e) => {
      const st = resolveEntryStatus(e);
      return st === 'available' || st === 'limited';
    })
  );

  const countPhotosInBackup = (payload: BackupPayload) =>
    payload.fish.reduce((sum, f) => sum + (f.customActualPhotos?.length || 0), 0);

  return (
    <div className="space-y-4 pb-24 max-w-3xl mx-auto">
      {/* Install App & Language Card */}
      <section
        id="more-section-language"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4"
      >
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

        <div className="rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 p-3.5 text-xs sm:text-sm text-slate-700 dark:text-neutral-300 space-y-1 leading-relaxed">
          <p className="font-bold text-[#082d59] dark:text-sky-300">
            {t(lang, 'pwa_android_help_title')}
          </p>
          <p className="break-words">{t(lang, 'pwa_android_help_body')}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3.5 text-xs sm:text-sm text-slate-700 dark:text-neutral-300 flex items-start gap-2.5 leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0 space-y-0.5">
            <p className="font-bold text-slate-900 dark:text-white">
              {t(lang, 'local_only_privacy_title')}
            </p>
            <p className="break-words">{t(lang, 'local_only_privacy_body')}</p>
          </div>
        </div>
      </section>

      {/* Offline QR Code & Customer Snapshot Share Card */}
      <section
        id="more-section-qr"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <QrCode className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
            <h2 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
              {t(lang, 'qr_section_title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenCustomerSnapshot}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>{t(lang, 'share_customer_view')}</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed break-words">
          {t(lang, 'qr_hint')}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {([
            ['shop', lang === 'en' ? 'Shop App Link' : 'ഷോപ്പ് ലിങ്ക്'],
            ['customer', lang === 'en' ? "Today's Customer Page" : 'ഇന്നത്തെ കസ്റ്റമർ പേജ്'],
            ['whatsapp', 'WhatsApp Chat'],
          ] as [QrMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setQrMode(mode)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                qrMode === mode
                  ? 'bg-[#082d59] dark:bg-[#0879d9] text-white border-[#082d59] dark:border-[#0879d9]'
                  : 'bg-slate-50 dark:bg-black text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {qrSvgDataUri && (
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-4">
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shrink-0">
              <img
                src={qrSvgDataUri}
                alt={t(lang, 'qr_section_title')}
                className="w-40 h-40 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5 text-center sm:text-left">
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {t(lang, 'qr_generated_on')}: {formatDisplayDate(getLocalDateKey(), lang)}
              </p>
              <p className="text-[11px] font-mono text-slate-600 dark:text-neutral-300 break-all line-clamp-2">
                {activeQrUrl}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleCopyQrLink}
                  className="min-h-[42px] px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {qrCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{qrCopied ? t(lang, 'snapshot_copied_link') : t(lang, 'snapshot_copy_link')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="min-h-[42px] px-3 py-1.5 rounded-xl bg-[#082d59] dark:bg-[#0879d9] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>{t(lang, 'qr_download_png')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Customer Enquiries Notebook (Local Only) */}
      <div id="more-section-enquiries">
        <EnquiryNotebookSection
          lang={lang}
          enquiries={enquiries}
          fishList={fishList}
          onSaveEnquiry={onSaveEnquiry}
          onDeleteEnquiry={onDeleteEnquiry}
        />
      </div>

      {/* Editable Malayalam Message Templates */}
      <section
        id="more-section-templates"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquareQuote className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
            <h2 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
              {t(lang, 'templates_title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleResetTemplates}
            className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t(lang, 'template_reset')}</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed break-words">
          {t(lang, 'templates_hint')}
        </p>

        <div className="space-y-2.5">
          {templates.map((tpl) => {
            const label = lang === 'en' ? tpl.labelEn : tpl.labelMl;
            const rawBody = lang === 'en' ? tpl.bodyEn : tpl.bodyMl;
            const resolved = applyMessageTemplate(
              tpl,
              fishList,
              dailyRecord,
              settings,
              lang
            );
            const isEditing = editingTplId === tpl.id;

            return (
              <div
                key={tpl.id}
                className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#082d59] dark:text-sky-300">
                    {label}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditingTplId(isEditing ? null : tpl.id)}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-xs font-semibold text-slate-700 dark:text-neutral-300"
                  >
                    {isEditing ? t(lang, 'close') : t(lang, 'edit')}
                  </button>
                </div>

                {isEditing ? (
                  <textarea
                    rows={3}
                    value={rawBody}
                    onChange={(e) => handleTemplateBodyChange(tpl.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-neutral-300 whitespace-pre-line break-words leading-relaxed">
                    {resolved}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openWhatsAppTextLink(resolved)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t(lang, 'template_send_wa')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(resolved);
                        setCopiedTplId(tpl.id);
                        setTimeout(() => setCopiedTplId(null), 1800);
                      } catch {
                        // Ignore
                      }
                    }}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedTplId === tpl.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedTplId === tpl.id
                        ? t(lang, 'copied_message')
                        : t(lang, 'copy_message')}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bilingual Fish Name Glossary Trigger */}
      <section
        id="more-section-glossary"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
              {t(lang, 'glossary_title')}
            </h2>
            <p className="text-xs text-slate-600 dark:text-neutral-400">
              {fishList.length} {t(lang, 'fish_word')} · Malayalam ↔ English
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGlossaryModal(true)}
          className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white text-xs sm:text-sm font-bold"
        >
          {t(lang, 'glossary_btn')}
        </button>
      </section>

      {/* Trash Bin (Restore Accidentally Deleted Fish) */}
      <section
        id="more-section-trash"
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
      <section
        id="more-section-history"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
      >
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
                .filter((e) => {
                  const st = resolveEntryStatus(e);
                  return st === 'available' || st === 'limited';
                })
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
      <section
        id="more-section-backup"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug">
            {t(lang, 'backup')}
          </h2>
          {estimatedBackupBytes > 0 && (
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 tabular-nums">
              {t(lang, 'backup_size_label')}: {formatBytes(estimatedBackupBytes)}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-neutral-400">
          {t(lang, 'backup_last_date')}:{' '}
          <span className="font-semibold text-slate-800 dark:text-neutral-200">
            {settings.lastBackupAt
              ? formatDisplayDate(getLocalDateKey(new Date(settings.lastBackupAt)), lang)
              : t(lang, 'backup_never')}
          </span>
        </p>

        {isBackupOverdue && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-words">{t(lang, 'backup_reminder_banner')}</span>
          </div>
        )}

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
      <section
        id="more-section-settings"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4"
      >
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
                {t(lang, 'contact_name_label')}
              </label>
              <input
                type="text"
                value={formSettings.ownerName}
                onChange={(e) =>
                  setFormSettings((s) => ({ ...s, ownerName: e.target.value }))
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

          {/* Customer View Privacy & Directions */}
          <div className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3.5 space-y-2.5">
            <label className="flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200 cursor-pointer">
              <span>{t(lang, 'show_phone_to_customers')}</span>
              <input
                type="checkbox"
                checked={formSettings.showPhoneToCustomers !== false}
                onChange={(e) =>
                  setFormSettings((s) => ({
                    ...s,
                    showPhoneToCustomers: e.target.checked,
                  }))
                }
                className="w-5 h-5 accent-[#0879d9]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200 cursor-pointer">
              <span>{t(lang, 'show_directions_to_customers')}</span>
              <input
                type="checkbox"
                checked={Boolean(formSettings.showDirectionsLink)}
                onChange={(e) =>
                  setFormSettings((s) => ({
                    ...s,
                    showDirectionsLink: e.target.checked,
                  }))
                }
                className="w-5 h-5 accent-[#0879d9]"
              />
            </label>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                {t(lang, 'maps_url_label')}
              </label>
              <input
                type="url"
                placeholder="https://maps.google.com/..."
                value={formSettings.mapsQueryUrl || ''}
                onChange={(e) =>
                  setFormSettings((s) => ({ ...s, mapsQueryUrl: e.target.value }))
                }
                className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white text-xs sm:text-sm"
              />
            </div>
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

      {/* Verified Coastal Harbour & Seller Directory */}
      <section
        id="more-section-directory"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
      >
        <button
          type="button"
          onClick={() => setShowDirectory((v) => !v)}
          className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
            <h2 className="text-base sm:text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
              {t(lang, 'coastal_dir_title')}
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#0879d9] dark:text-sky-400 shrink-0 leading-snug">
            {showDirectory ? t(lang, 'close') : t(lang, 'view_day')}
          </span>
        </button>

        {showDirectory && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed break-words">
              {t(lang, 'coastal_dir_disclaimer')} ({COASTAL_DIRECTORY_META.lastUpdated})
            </p>
            <div className="space-y-2">
              {COASTAL_DIRECTORY_ENTRIES.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3 space-y-1"
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white break-words">
                    {lang === 'en' ? entry.nameEn : entry.nameMl}
                  </p>
                  <p className="text-xs font-semibold text-[#0879d9] dark:text-sky-400 break-words">
                    {lang === 'en' ? entry.placeEn : entry.placeMl} ·{' '}
                    {lang === 'en' ? entry.typeEn : entry.typeMl}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed break-words">
                    {lang === 'en' ? entry.notesEn : entry.notesMl}
                  </p>
                  {entry.contactOrSource && (
                    <p className="text-[11px] text-slate-500 dark:text-neutral-500 break-words">
                      {entry.contactOrSource}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Poster Reference Sheet Section */}
      <section
        id="more-section-references"
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
      >
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
              <p>
                {restorePreview.enquiries?.length || 0} {t(lang, 'enquiries_word')}
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

      {/* Confirm Empty Trash Modal */}
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

      {/* Bilingual Fish Glossary Modal */}
      {showGlossaryModal && (
        <GlossaryModal
          lang={lang}
          fishList={fishList}
          onClose={() => setShowGlossaryModal(false)}
        />
      )}
    </div>
  );
};
