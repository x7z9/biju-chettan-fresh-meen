export type Language = 'ml' | 'en';

export type PosterBackground = 'blue-tray' | 'banana-leaf';

export type PosterLanguageMode = 'ml' | 'en' | 'bilingual';

export type PosterTemplateStyle = 'standard' | 'minimal';

export type PriceUnit = 'per_kg' | 'per_piece' | 'per_packet';

export type AvailabilityStatus = 'available' | 'limited' | 'sold_out' | 'not_listed';

export type EnquiryStatus = 'new' | 'replied' | 'confirmed' | 'fulfilled' | 'cancelled';

export interface FishPhoto {
  id: string;
  dataUrl: string;
  createdAt: number;
  label?: string;
}

export interface FishSourceRef {
  title: string;
  url: string;
  accessedAt: string;
}

export type IdentificationConfidence =
  | 'confirmed'
  | 'probable'
  | 'needs_local_confirmation';

export type CatalogueGroup = 'finfish' | 'seafood_other';

export type SeafoodClass =
  | 'finfish'
  | 'crustacean'
  | 'bivalve_mollusc'
  | 'cephalopod';

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
  sourceReferences?: FishSourceRef[];
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
  status?: AvailabilityStatus;
  note?: string;
  publicNote?: string;
  privateNote?: string;
  quantityNote?: string;
  sizeGrade?: string;
  sourcePlace?: string;
  priceAmount?: string;
  priceUnit?: PriceUnit;
  sharePrice?: boolean;
  priceOnCall?: boolean;
  todayPhotoDataUrl?: string;
  todayPosterDataUrl?: string;
  updatedAt: number;
}

export interface DailyRecord {
  dateKey: string;
  includePrices: boolean;
  entries: Record<string, DailyFishEntry>;
  updatedAt: number;
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

export interface CustomerEnquiry {
  id: string;
  createdAt: number;
  updatedAt: number;
  dateKey: string;
  customerName?: string;
  customerPhone?: string;
  fishId?: string;
  fishNameMl: string;
  quantityNote?: string;
  status: EnquiryStatus;
  note?: string;
}

export interface SnapshotDefaultPreferences {
  includePhone: boolean;
  includePrices: boolean;
  includeQuantity: boolean;
  includeNotes: boolean;
  includeDirections: boolean;
  customerLang: Language;
}

export interface MessageTemplateItem {
  id: string;
  labelMl: string;
  labelEn: string;
  bodyMl: string;
  bodyEn: string;
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
  showPhoneToCustomers?: boolean;
  showDirectionsLink?: boolean;
  mapsQueryUrl?: string;
  lastBackupAt?: number;
  snapshotDefaults?: SnapshotDefaultPreferences;
  messageTemplates?: MessageTemplateItem[];
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
  enquiries?: CustomerEnquiry[];
}

export interface SnapshotFishItemV1 {
  id: string;
  refNum: number | null;
  nameMl: string;
  pron: string;
  nameEn?: string;
  status: 'available' | 'limited' | 'sold_out';
  price?: string;
  unit?: PriceUnit;
  priceOnCall?: boolean;
  qty?: string;
  size?: string;
  source?: string;
  note?: string;
  img?: string | null;
}

export interface CustomerSnapshotV1 {
  v: 1;
  createdAt: number;
  dateKey: string;
  lang: Language;
  businessMl: string;
  businessEn: string;
  owner: string;
  locMl: string;
  locEn: string;
  phone?: string;
  phoneDigits?: string;
  mapsUrl?: string;
  items: SnapshotFishItemV1[];
}

export type ActiveTab = 'today' | 'fish' | 'add' | 'more';
