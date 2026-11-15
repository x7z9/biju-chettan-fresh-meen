export type Language = 'ml' | 'en';

export type PosterBackground = 'blue-tray' | 'banana-leaf';

export type PosterLanguageMode = 'ml' | 'en' | 'bilingual';

export type PriceUnit = 'per_kg' | 'per_piece' | 'per_packet';

export type ActiveTab = 'today' | 'fish' | 'add' | 'more';

export interface FishPhoto {
  id: string;
  dataUrl: string;
  createdAt: number;
  label?: string;
}

export interface FishSourceReference {
  title: string;
  url: string;
  accessedAt: string;
}

export type CatalogueGroup = 'finfish' | 'seafood_other';

export type SeafoodClass =
  | 'finfish'
  | 'crustacean'
  | 'bivalve_mollusc'
  | 'cephalopod';

export type IdentificationConfidence =
  | 'confirmed'
  | 'probable'
  | 'needs_local_confirmation';

export interface FishItem {
  id: string;
  referenceNumber: number | null;
  catalogueGroup?: CatalogueGroup;
  seafoodClass?: SeafoodClass;
  nameMl: string;
  pronunciationLatin: string;
  aliasesMl?: string[];
  nameEn?: string;
  scientificName?: string;
  family?: string;
  speciesNote?: string;
  identificationFeatures?: string;
  habitatSummary?: string;
  imageMethod?: string;
  imageLicenseNote?: string;
  sourceReferences?: FishSourceReference[];
  identificationConfidence?: IdentificationConfidence;
  ambiguityNote?: string;
  referenceImage: string | null;
  isReferenceArtworkOnly: boolean;
  customActualPhotos: FishPhoto[];
  preferredBackground: PosterBackground;
  createdAt: number;
  updatedAt: number;
}

export interface DailyFishEntry {
  fishId: string;
  available: boolean;
  note?: string;
  priceAmount?: string;
  priceUnit?: PriceUnit;
  todayPhotoDataUrl?: string;
  todayPosterDataUrl?: string;
  updatedAt: number;
}

export interface DailyRecord {
  dateKey: string; // YYYY-MM-DD in device local time
  includePrices: boolean;
  entries: Record<string, DailyFishEntry>;
  updatedAt: number;
}

export interface BusinessSettings {
  businessNameMl: string;
  businessNameEn: string;
  whatsappGroupNameMl: string;
  whatsappGroupNameEn: string;
  ownerName: string;
  locationMl: string;
  locationEn: string;
  phoneDisplay: string;
  phoneDigits: string;
  posterHeadingMl: string;
  posterHeadingEn: string;
  disclaimerMl: string;
  disclaimerEn: string;
  showDisclaimerOnPoster: boolean;
  posterLanguage: PosterLanguageMode;
  defaultBackground: PosterBackground;
}

export interface PosterHistoryItem {
  id: string;
  dateKey: string;
  fishId: string;
  fishNameMl: string;
  background: PosterBackground;
  posterDataUrl: string;
  createdAt: number;
}

export interface TrashFishItem {
  id: string;
  fish: FishItem;
  deletedAt: number;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  app: string;
  settings: BusinessSettings;
  fish: FishItem[];
  dailyRecords: DailyRecord[];
  posterHistory: PosterHistoryItem[];
  trash?: TrashFishItem[];
}
