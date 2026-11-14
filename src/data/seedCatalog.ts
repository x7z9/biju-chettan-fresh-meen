import type { BusinessSettings, FishItem } from '../types';

const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : '/';

export function resolvePublicAsset(path: string): string {
  if (!path) return path;
  if (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  const clean = path.replace(/^\/+/, '');
  if (BASE_URL !== '/' && path.startsWith(BASE_URL)) {
    return path;
  }
  return `${BASE_URL}${clean}`;
}

export const BUSINESS_LOGO_PATH = resolvePublicAsset(
  '/assets/aistudio/a_high_quality_colorful_promotional_sticker_graphi_777412be.png'
);

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessNameMl: 'ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ',
  businessNameEn: 'Biju Chettante Fresh Fish',
  whatsappGroupNameMl: 'ബിജുചേട്ടന്റെ ഫ്രഷ് മീൻ വണ്ടി',
  whatsappGroupNameEn: 'Biju Chettante Fresh Meen Vandi',
  ownerName: 'Biju',
  locationMl: 'ഒച്ചിറ – കൃഷ്ണപുരം',
  locationEn: 'Oachira – Krishnapuram, Kerala, India',
  phoneDisplay: '+91 95444 33018',
  phoneDigits: '919544433018',
  posterHeadingMl: 'ഇന്നത്തെ മീൻ',
  posterHeadingEn: "Today's Fish",
  disclaimerMl: 'സൂചന: പരസ്യത്തിനായുള്ള സൃഷ്ടിപരമായ ദൃശ്യാവിഷ്കാരം.',
  disclaimerEn: 'Note: Creative visual representation for advertising.',
  showDisclaimerOnPoster: true,
  posterLanguage: 'ml',
  defaultBackground: 'blue-tray',
};

export const REFERENCE_SHEET_PATH = resolvePublicAsset(
  '/assets/aistudio/numbered_image_reference_sheet_01816df0.png'
);
export const MAPPING_PREVIEW_PATH = resolvePublicAsset(
  '/assets/aistudio/ten_fish_mapping_preview_9afedc28.jpg'
);

const BASE_TIMESTAMP = 1763000000000;

export const SEEDED_FISH_CATALOG: FishItem[] = [
  {
    id: 'kannan_ayala',
    referenceNumber: 1,
    nameMl: 'കണ്ണൻ അയല',
    pronunciationLatin: 'Kannan Ayala',
    nameEn: 'Kannan Ayala (local market name)',
    speciesNote: 'Seller-supplied local name; confirm species from actual catch.',
    referenceImage: '/assets/aistudio/01_kannan_ayala_71e465c3.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 1,
    updatedAt: BASE_TIMESTAMP + 1,
  },
  {
    id: 'kayal_koori',
    referenceNumber: 2,
    nameMl: 'കായൽ കൂരി',
    pronunciationLatin: 'Kayal Koori',
    nameEn: 'Koori catfish (broad local name)',
    speciesNote: 'Koori is a broad local name used for more than one catfish species.',
    referenceImage: '/assets/aistudio/02_kayal_koori_d8f82d56.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 2,
    updatedAt: BASE_TIMESTAMP + 2,
  },
  {
    id: 'vella_choora',
    referenceNumber: 3,
    nameMl: 'വെള്ള ചൂര',
    pronunciationLatin: 'Vella Choora',
    nameEn: 'Vella Choora (local tuna name)',
    speciesNote: 'Local tuna-market name; exact tuna species not confirmed.',
    referenceImage: '/assets/aistudio/03_vella_choora_230e4859.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 3,
    updatedAt: BASE_TIMESTAMP + 3,
  },
  {
    id: 'ayala',
    referenceNumber: 4,
    nameMl: 'അയല',
    pronunciationLatin: 'Ayala',
    nameEn: 'Indian mackerel (common local mapping)',
    speciesNote: 'Commonly used for Indian mackerel; verify actual fish.',
    referenceImage: '/assets/aistudio/04_ayala_241edc3a.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 4,
    updatedAt: BASE_TIMESTAMP + 4,
  },
  {
    id: 'kochu_mathi',
    referenceNumber: 5,
    nameMl: 'കൊച്ചു മത്തി',
    pronunciationLatin: 'Kochu Mathi',
    nameEn: 'Small sardine (market-size description)',
    speciesNote: 'Small-size market description; exact sardine species not confirmed.',
    referenceImage: '/assets/aistudio/05_kochu_mathi_32935171.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 5,
    updatedAt: BASE_TIMESTAMP + 5,
  },
  {
    id: 'unnimery',
    referenceNumber: 6,
    nameMl: 'ഉണ്ണിമേരി',
    pronunciationLatin: 'Unnimery',
    nameEn: 'Unnimery (local market name)',
    speciesNote: 'Seller-supplied local name; exact species not confirmed.',
    referenceImage: '/assets/aistudio/06_unnimery_3dba154a.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 6,
    updatedAt: BASE_TIMESTAMP + 6,
  },
  {
    id: 'vaala',
    referenceNumber: 7,
    nameMl: 'വാള',
    pronunciationLatin: 'Vaala',
    nameEn: 'Ribbonfish / cutlassfish (local mapping)',
    speciesNote: 'Ribbonfish / cutlassfish market identification based on seller reference.',
    referenceImage: '/assets/aistudio/07_vaala_7a5b2900.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 7,
    updatedAt: BASE_TIMESTAMP + 7,
  },
  {
    id: 'mankada',
    referenceNumber: 8,
    nameMl: 'മങ്കട',
    pronunciationLatin: 'Mankada',
    nameEn: 'Mankada (local market name)',
    speciesNote: 'Seller-supplied local market name; exact scientific mapping not confirmed.',
    referenceImage: '/assets/aistudio/08_mankada_f7919d5f.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 8,
    updatedAt: BASE_TIMESTAMP + 8,
  },
  {
    id: 'kera_choora',
    referenceNumber: 9,
    nameMl: 'കേര ചൂര',
    pronunciationLatin: 'Kera Choora',
    nameEn: 'Kera Choora (local tuna name)',
    speciesNote: 'Local tuna-market name; exact tuna species not confirmed.',
    referenceImage: '/assets/aistudio/09_kera_choora_a3f42fbc.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 9,
    updatedAt: BASE_TIMESTAMP + 9,
  },
  {
    id: 'valiya_mathi',
    referenceNumber: 10,
    nameMl: 'വലിയ മത്തി',
    pronunciationLatin: 'Valiya Mathi',
    nameEn: 'Large sardine (size-based market description)',
    speciesNote: 'Large-size sardine market description; not necessarily a separate species.',
    referenceImage: '/assets/aistudio/10_valiya_mathi_d753d0c0.png',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'blue-tray',
    createdAt: BASE_TIMESTAMP + 10,
    updatedAt: BASE_TIMESTAMP + 10,
  },
];
