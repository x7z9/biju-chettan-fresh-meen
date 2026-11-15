import React, { useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { t } from '../data/translations';
import type {
  FishItem,
  FishPhoto,
  Language,
  PosterBackground,
} from '../types';
import { fileToOptimizedDataUrl } from '../utils/speechAndDate';

interface AddEditFishScreenProps {
  lang: Language;
  editingFish: FishItem | null;
  defaultBackground: PosterBackground;
  onSave: (fish: FishItem) => Promise<void>;
  onCancel: () => void;
}

export const AddEditFishScreen: React.FC<AddEditFishScreenProps> = ({
  lang,
  editingFish,
  defaultBackground,
  onSave,
  onCancel,
}) => {
  const [nameMl, setNameMl] = useState(editingFish?.nameMl || '');
  const [pronunciation, setPronunciation] = useState(
    editingFish?.pronunciationLatin || ''
  );
  const [nameEn, setNameEn] = useState(editingFish?.nameEn || '');
  const [speciesNote, setSpeciesNote] = useState(editingFish?.speciesNote || '');
  const [preferredBackground, setPreferredBackground] = useState<PosterBackground>(
    editingFish?.preferredBackground || defaultBackground
  );
  const [photos, setPhotos] = useState<FishPhoto[]>(
    editingFish?.customActualPhotos || []
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg('');
    try {
      const added: FishPhoto[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await fileToOptimizedDataUrl(file);
        added.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          dataUrl,
          createdAt: Date.now(),
        });
      }
      setPhotos((prev) => [...added, ...prev]);
    } catch {
      setErrorMsg(t(lang, 'error_photo'));
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMl = nameMl.trim();
    const cleanPron = pronunciation.trim();
    if (!cleanMl || !cleanPron) {
      setErrorMsg(t(lang, 'required_fields'));
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const now = Date.now();
      const baseId =
        editingFish?.id ||
        `${cleanPron
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') || 'fish'}_${now.toString(36)}`;

      const item: FishItem = {
        ...(editingFish || {}),
        id: baseId,
        referenceNumber: editingFish ? editingFish.referenceNumber : null,
        nameMl: cleanMl,
        pronunciationLatin: cleanPron,
        nameEn: nameEn.trim() || undefined,
        speciesNote: speciesNote.trim() || undefined,
        referenceImage: editingFish?.referenceImage || null,
        isReferenceArtworkOnly: editingFish
          ? editingFish.isReferenceArtworkOnly
          : false,
        customActualPhotos: photos,
        preferredBackground,
        createdAt: editingFish?.createdAt || now,
        updatedAt: now,
      };

      await onSave(item);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white dark:bg-[#0a0a0a] p-4 sm:p-6 shadow-xs border border-slate-200/80 dark:border-neutral-800 space-y-5 max-w-2xl mx-auto"
      >
        <h2 className="text-xl font-bold text-[#082d59] dark:text-sky-300 leading-snug break-words">
          {editingFish ? t(lang, 'edit_fish') : t(lang, 'add_fish')}
        </h2>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3.5 text-sm font-medium text-rose-800 dark:text-rose-200 leading-relaxed break-words"
          >
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="fish-name-ml"
              className="block text-sm font-bold text-slate-800 dark:text-neutral-200 mb-1.5 leading-snug"
            >
              {t(lang, 'fish_name_ml')} *
            </label>
            <input
              id="fish-name-ml"
              type="text"
              required
              value={nameMl}
              onChange={(e) => setNameMl(e.target.value)}
              placeholder={t(lang, 'fish_name_ml_placeholder')}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-black text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#0a0a0a]"
            />
          </div>

          <div>
            <label
              htmlFor="fish-pronunciation"
              className="block text-sm font-bold text-slate-800 dark:text-neutral-200 mb-1.5 leading-snug"
            >
              {t(lang, 'pronunciation')} *
            </label>
            <input
              id="fish-pronunciation"
              type="text"
              required
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              placeholder={t(lang, 'pronunciation_placeholder')}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-black text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#0a0a0a]"
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2.5">
            <span className="block text-sm font-bold text-slate-800 dark:text-neutral-200 leading-snug">
              {t(lang, 'add_photo')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="min-h-[48px] px-4 py-3 rounded-2xl bg-[#0879d9] text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer hover:bg-[#0667ba] leading-snug text-center">
                <Camera className="w-5 h-5 shrink-0" />
                <span className="break-words">{t(lang, 'take_photo')}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFilesSelected}
                  className="sr-only"
                />
              </label>

              <label className="min-h-[48px] px-4 py-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#082d59] dark:text-sky-200 border border-sky-200 dark:border-sky-800 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 leading-snug text-center">
                <ImagePlus className="w-5 h-5 shrink-0 text-[#0879d9] dark:text-sky-400" />
                <span className="break-words">{t(lang, 'choose_photo')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  className="sr-only"
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-[3/4] rounded-2xl bg-slate-100 dark:bg-black overflow-hidden border border-slate-200 dark:border-neutral-800"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={nameMl || 'Fish'}
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                      }
                      className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
                      aria-label={t(lang, 'delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="fish-name-en"
              className="block text-sm font-semibold text-slate-700 dark:text-neutral-300 mb-1.5 leading-snug"
            >
              {t(lang, 'english_name')}
            </label>
            <input
              id="fish-name-en"
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t(lang, 'english_name_placeholder')}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#0a0a0a]"
            />
          </div>

          <div>
            <label
              htmlFor="fish-note"
              className="block text-sm font-semibold text-slate-700 dark:text-neutral-300 mb-1.5 leading-snug"
            >
              {t(lang, 'species_note')}
            </label>
            <input
              id="fish-note"
              type="text"
              value={speciesNote}
              onChange={(e) => setSpeciesNote(e.target.value)}
              placeholder={t(lang, 'species_note_placeholder')}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-black text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#0a0a0a]"
            />
          </div>

          {/* Preferred Poster Background */}
          <div>
            <span className="block text-sm font-semibold text-slate-700 dark:text-neutral-300 mb-1.5 leading-snug">
              {t(lang, 'preferred_bg')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPreferredBackground('blue-tray')}
                className={`min-h-[48px] px-3 py-2.5 rounded-2xl font-semibold text-sm border-2 transition leading-snug text-center break-words ${
                  preferredBackground === 'blue-tray'
                    ? 'border-[#0879d9] bg-sky-50 dark:bg-sky-950/60 text-[#082d59] dark:text-sky-200'
                    : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300'
                }`}
              >
                {t(lang, 'blue_tray')}
              </button>
              <button
                type="button"
                onClick={() => setPreferredBackground('banana-leaf')}
                className={`min-h-[48px] px-3 py-2.5 rounded-2xl font-semibold text-sm border-2 transition leading-snug text-center break-words ${
                  preferredBackground === 'banana-leaf'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300'
                }`}
              >
                {t(lang, 'banana_leaf')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[50px] px-4 py-3 rounded-2xl bg-slate-100 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border border-transparent dark:border-neutral-800 font-bold text-base hover:bg-slate-200 dark:hover:bg-neutral-800 leading-snug text-center"
          >
            {t(lang, 'cancel')}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 min-h-[50px] px-4 py-3 rounded-2xl bg-[#082d59] dark:bg-[#0879d9] text-white font-bold text-base hover:bg-[#0b3c75] dark:hover:bg-[#0667ba] disabled:opacity-60 leading-snug text-center"
          >
            {isSaving ? t(lang, 'saving') : t(lang, 'save')}
          </button>
        </div>
      </form>
    </div>
  );
};
