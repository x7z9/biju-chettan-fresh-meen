import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import { t } from '../data/translations';
import type {
  CustomerEnquiry,
  EnquiryStatus,
  FishItem,
  Language,
} from '../types';
import {
  downloadBlob,
  formatDisplayDate,
  getLocalDateKey,
} from '../utils/speechAndDate';

interface EnquiryNotebookSectionProps {
  lang: Language;
  enquiries: CustomerEnquiry[];
  fishList: FishItem[];
  onSaveEnquiry: (enquiry: CustomerEnquiry) => Promise<void>;
  onDeleteEnquiry: (id: string) => Promise<void>;
}

const STATUS_KEYS: EnquiryStatus[] = [
  'new',
  'replied',
  'confirmed',
  'fulfilled',
  'cancelled',
];

function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const EnquiryNotebookSection: React.FC<EnquiryNotebookSectionProps> = ({
  lang,
  enquiries,
  fishList,
  onSaveEnquiry,
  onDeleteEnquiry,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedFishName, setSelectedFishName] = useState(
    fishList[0]?.nameMl || ''
  );
  const [quantityNote, setQuantityNote] = useState('');
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFish = selectedFishName.trim() || fishList[0]?.nameMl || 'മീൻ';
    const matchedFish = fishList.find((f) => f.nameMl === cleanFish);
    const now = Date.now();
    await onSaveEnquiry({
      id: `enq_${now}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
      dateKey: getLocalDateKey(),
      ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
      ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
      ...(matchedFish ? { fishId: matchedFish.id } : {}),
      fishNameMl: cleanFish,
      ...(quantityNote.trim() ? { quantityNote: quantityNote.trim() } : {}),
      status: 'new',
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setCustomerName('');
    setCustomerPhone('');
    setQuantityNote('');
    setNote('');
    setShowForm(false);
  };

  const handleStatusChange = async (
    item: CustomerEnquiry,
    nextStatus: EnquiryStatus
  ) => {
    await onSaveEnquiry({
      ...item,
      status: nextStatus,
      updatedAt: Date.now(),
    });
  };

  const handleExportCsv = () => {
    const header = [
      'Date',
      'Time',
      'Customer',
      'Phone',
      'Fish',
      'Quantity',
      'Status',
      'Note',
    ].join(',');
    const rows = enquiries.map((e) =>
      [
        escapeCsvCell(e.dateKey),
        escapeCsvCell(new Date(e.createdAt).toLocaleTimeString()),
        escapeCsvCell(e.customerName || ''),
        escapeCsvCell(e.customerPhone || ''),
        escapeCsvCell(e.fishNameMl),
        escapeCsvCell(e.quantityNote || ''),
        escapeCsvCell(e.status),
        escapeCsvCell(e.note || ''),
      ].join(',')
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    downloadBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `biju-fish-enquiries-${getLocalDateKey()}.csv`
    );
  };

  const handleExportJson = () => {
    const json = JSON.stringify(
      { exportedAt: new Date().toISOString(), enquiries },
      null,
      2
    );
    downloadBlob(
      new Blob([json], { type: 'application/json' }),
      `biju-fish-enquiries-${getLocalDateKey()}.json`
    );
  };

  const sortedEnquiries = useMemo(
    () => [...enquiries].sort((a, b) => b.createdAt - a.createdAt),
    [enquiries]
  );

  return (
    <section
      id="more-section-enquiries"
      className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
          <h2 className="text-lg font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
            {t(lang, 'enquiries_title')}
            {enquiries.length > 0 && (
              <span className="ml-1.5 tabular-nums text-sm text-slate-600 dark:text-neutral-400">
                ({enquiries.length})
              </span>
            )}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0879d9] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-[#0667ba]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{t(lang, 'add_enquiry')}</span>
        </button>
      </div>

      <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
        {t(lang, 'enquiries_hint')}
      </p>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3.5 space-y-2.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t(lang, 'enquiry_customer_name')}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-white"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={t(lang, 'enquiry_customer_phone')}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-white tabular-nums"
            />
            <select
              value={selectedFishName}
              onChange={(e) => setSelectedFishName(e.target.value)}
              aria-label={t(lang, 'enquiry_fish_label')}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-white"
            >
              {fishList.map((f) => (
                <option key={f.id} value={f.nameMl}>
                  {f.nameMl} ({f.pronunciationLatin})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={quantityNote}
              onChange={(e) => setQuantityNote(e.target.value)}
              placeholder={t(lang, 'enquiry_qty_label')}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(lang, 'enquiry_note_label')}
            className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-neutral-200"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-[#082d59] dark:bg-[#0879d9] text-white text-xs sm:text-sm font-bold"
            >
              {t(lang, 'save')}
            </button>
          </div>
        </form>
      )}

      {sortedEnquiries.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-4 text-sm text-slate-500 dark:text-neutral-400">
          {t(lang, 'enquiries_empty')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedEnquiries.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-neutral-800 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white break-words">
                    {item.fishNameMl}
                    {item.quantityNote ? ` · ${item.quantityNote}` : ''}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 break-words">
                    {[
                      item.customerName,
                      item.customerPhone,
                      formatDisplayDate(item.dateKey, lang),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {item.note && (
                    <p className="text-xs text-slate-700 dark:text-neutral-300 mt-1 break-words">
                      {item.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={item.status}
                    onChange={(e) =>
                      void handleStatusChange(item, e.target.value as EnquiryStatus)
                    }
                    aria-label={t(lang, 'enquiry_fish_label')}
                    className="min-h-[36px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {STATUS_KEYS.map((st) => (
                      <option key={st} value={st}>
                        {t(lang, `enquiry_status_${st}` as 'enquiry_status_new')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void onDeleteEnquiry(item.id)}
                    aria-label={t(lang, 'delete')}
                    className="min-w-[36px] min-h-[36px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{t(lang, 'export_enquiries_csv')}</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{t(lang, 'export_enquiries_json')}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
