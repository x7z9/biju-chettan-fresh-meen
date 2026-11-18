import { DEFAULT_MESSAGE_TEMPLATES } from './coastalDirectory';
import type { BusinessSettings, FishItem } from '../types';

const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : '/';

export const ASSET_VERSION =
  typeof __APP_ASSET_VERSION__ !== 'undefined' && __APP_ASSET_VERSION__
    ? __APP_ASSET_VERSION__
    : '20261117';

function normalizeAssetSubpath(path: string): string {
  const pathname = path.split('?')[0].split('#')[0];
  const assetsIdx = pathname.indexOf('assets/');
  if (assetsIdx >= 0) {
    return pathname.slice(assetsIdx);
  }
  const trimmedBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  if (BASE_URL !== '/' && pathname.startsWith(BASE_URL)) {
    return pathname.slice(BASE_URL.length).replace(/^\/+/, '');
  }
  if (trimmedBase && pathname.startsWith(`${trimmedBase}/`)) {
    return pathname.slice(trimmedBase.length + 1).replace(/^\/+/, '');
  }
  return pathname.replace(/^\/+/, '');
}

function resolveEffectiveBase(): string {
  if (typeof window === 'undefined' || BASE_URL === '/') {
    return BASE_URL;
  }
  const baseTrimmed = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const locPath = window.location.pathname || '/';
  if (
    locPath === baseTrimmed ||
    locPath.startsWith(BASE_URL) ||
    locPath.startsWith(`${baseTrimmed}/`)
  ) {
    return BASE_URL;
  }
  return '/';
}

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
  const clean = normalizeAssetSubpath(path);
  const effectiveBase = resolveEffectiveBase();
  return `${effectiveBase}${clean}?v=${encodeURIComponent(ASSET_VERSION)}`;
}

export function getPublicAssetCandidates(
  primary: string | null | undefined,
  fallback?: string | null
): string[] {
  const candidates: string[] = [];
  const pushUnique = (u: string | null | undefined) => {
    if (!u || typeof u !== 'string') return;
    const trimmed = u.trim();
    if (!trimmed) return;
    if (!candidates.includes(trimmed)) candidates.push(trimmed);
  };

  const expandVariants = (url: string) => {
    if (
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      pushUnique(url);
      return;
    }

    const clean = normalizeAssetSubpath(url);
    const vQuery = `?v=${encodeURIComponent(ASSET_VERSION)}`;

    // 1. Primary resolved URL (matches current mount path / BASE_URL)
    pushUnique(resolvePublicAsset(url));
    // 2. Original URL & queryless primary resolved
    pushUnique(resolvePublicAsset(url).split('?')[0]);
    pushUnique(url);

    // 3. Explicit Vite BASE_URL variant (handles subpath without trailing slash)
    if (BASE_URL !== '/') {
      pushUnique(`${BASE_URL}${clean}${vQuery}`);
      pushUnique(`${BASE_URL}${clean}`);
    }

    // 4. First window pathname segment prefix (handles any reverse-proxy subpath)
    if (typeof window !== 'undefined' && window.location?.pathname) {
      const segs = window.location.pathname.split('/').filter(Boolean);
      if (segs.length > 0 && segs[0] !== 'assets') {
        const winBase = `/${segs[0]}/`;
        pushUnique(`${winBase}${clean}${vQuery}`);
        pushUnique(`${winBase}${clean}`);
      }
    }

    // 5. Root-relative & directory-relative fallbacks
    pushUnique(`/${clean}${vQuery}`);
    pushUnique(`/${clean}`);
    pushUnique(`./${clean}`);
  };

  if (primary) expandVariants(primary);
  if (fallback && fallback !== primary) expandVariants(fallback);
  return candidates;
}

export const BUSINESS_LOGO_PATH = resolvePublicAsset('/icon.svg');

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessNameMl: 'മത്സ്യവിൽപ്പന കേന്ദ്രം',
  businessNameEn: 'Fish & Seafood Seller',
  whatsappGroupNameMl: '',
  whatsappGroupNameEn: '',
  ownerName: '',
  locationMl: '',
  locationEn: '',
  phoneDisplay: '',
  phoneDigits: '',
  posterHeadingMl: 'ഇന്നത്തെ മീൻ',
  posterHeadingEn: "Today's Fish",
  disclaimerMl: 'സൂചന: പരസ്യത്തിനായുള്ള സൃഷ്ടിപരമായ ദൃശ്യാവിഷ്കാരം.',
  disclaimerEn: 'Note: Creative visual representation for advertising.',
  showDisclaimerOnPoster: true,
  posterLanguage: 'ml',
  defaultBackground: 'banana-leaf',
  showPhoneToCustomers: false,
  showDirectionsLink: false,
  mapsQueryUrl: '',
  snapshotDefaults: {
    includePhone: false,
    includePrices: true,
    includeQuantity: true,
    includeNotes: true,
    includeDirections: false,
    customerLang: 'ml',
  },
  messageTemplates: DEFAULT_MESSAGE_TEMPLATES,
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
    preferredBackground: 'banana-leaf',
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
    preferredBackground: 'banana-leaf',
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
    preferredBackground: 'banana-leaf',
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
    preferredBackground: 'banana-leaf',
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
    preferredBackground: 'banana-leaf',
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
    preferredBackground: 'banana-leaf',
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
    preferredBackground: 'banana-leaf',
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
    preferredBackground: 'banana-leaf',
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
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 10,
    updatedAt: BASE_TIMESTAMP + 10,
  },
  {
    id: 'karimeen',
    referenceNumber: 11,
    nameMl: 'കരിമീൻ',
    pronunciationLatin: 'Karimeen',
    aliasesMl: ['പൊള്ളക്കരിമീൻ'],
    nameEn: 'Pearlspot / Green chromide',
    scientificName: 'Etroplus suratensis',
    family: 'Cichlidae',
    speciesNote: 'Official State Fish of Kerala; iconic Oachira–Azhikkal–Kayamkulam backwater species.',
    identificationFeatures: 'Deep oval dark olive-green body with 6–8 dark vertical bands and distinctive pearly white spots across scales.',
    habitatSummary: 'Brackish-water backwaters, estuaries, coastal lagoons, and freshwater habitats across Kerala.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Etroplus suratensis',
        url: 'https://www.fishbase.org/summary/4681',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Kerala Fisheries Department: Cultivable brackish-water species',
        url: 'https://fisheries.kerala.gov.in/en/cultivable-species-brackish-water-fishes-and-molluscs',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'confirmed',
    referenceImage: '/assets/catalog/karimeen.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 100,
    updatedAt: BASE_TIMESTAMP + 100,
  },
  {
    id: 'neymeen',
    referenceNumber: 12,
    nameMl: 'നെയ്മീൻ',
    pronunciationLatin: 'Neymeen / Ayakkoora',
    aliasesMl: ['അയക്കൂറ'],
    nameEn: 'Narrow-barred Spanish mackerel / Seer fish',
    scientificName: 'Scomberomorus commerson',
    family: 'Scombridae',
    speciesNote: 'Also widely called അയക്കൂറ (Ayakkoora) in Kerala; seer-fish market group.',
    identificationFeatures: 'Sleek elongated silvery-blue body with wavy vertical dark bars on the flanks, dorsal finlets, and a deeply forked tail.',
    habitatSummary: 'Coastal marine pelagic waters along the Kerala shelf and offshore currents.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Scomberomorus commerson',
        url: 'https://www.fishbase.org/summary/121',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Onmanorama: Malayalam-English Kerala fish names',
        url: 'https://www.onmanorama.com/food/features/2024/11/12/malaylam-english-kerala-fish-names.amp.html',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'Both Scomberomorus commerson (barred seer) and spotted seer (S. guttatus) are traded locally under നെയ്മീൻ / അയക്കൂറ; confirm exact species from catch markings.',
    referenceImage: '/assets/catalog/neymeen.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 99,
    updatedAt: BASE_TIMESTAMP + 99,
  },
  {
    id: 'vella_avoli',
    referenceNumber: 13,
    nameMl: 'വെള്ള ആവോലി',
    pronunciationLatin: 'Vella Avoli',
    aliasesMl: ['ആവോലി'],
    nameEn: 'Silver pomfret',
    scientificName: 'Pampus argenteus',
    family: 'Stromateidae',
    speciesNote: 'Distinct from Black pomfret (കറുത്ത ആവോലി); white/silver diamond-shaped pomfret.',
    identificationFeatures: 'Deep diamond-shaped compressed bright silvery-white body, long falcate dorsal and anal fins, pelvic fins absent, deeply forked tail.',
    habitatSummary: 'Inshore marine coastal waters over muddy bottoms along the southwest coast of India.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Pampus argenteus',
        url: 'https://www.fishbase.org/summary/Pampus-argenteus',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'confirmed',
    referenceImage: '/assets/catalog/vella_avoli.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 98,
    updatedAt: BASE_TIMESTAMP + 98,
  },
  {
    id: 'karutha_avoli',
    referenceNumber: 14,
    nameMl: 'കറുത്ത ആവോലി',
    pronunciationLatin: 'Karutha Avoli',
    aliasesMl: ['ആവോലി'],
    nameEn: 'Black pomfret',
    scientificName: 'Parastromateus niger',
    family: 'Carangidae',
    speciesNote: 'Distinct species from Silver pomfret (വെള്ള ആവോലി); Carangidae family.',
    identificationFeatures: 'Deep compressed slate-brown to charcoal-grey body, long curved pectoral fins, dark-edged dorsal/anal fins, forked tail.',
    habitatSummary: 'Coastal marine and estuarine waters over muddy or sandy bottoms in the Indo-West Pacific.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Parastromateus niger',
        url: 'https://fishbase.org/summary/1947',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Carangids of Indian Seas (Eprint 13839)',
        url: 'https://eprints.cmfri.org.in/13839/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'confirmed',
    referenceImage: '/assets/catalog/karutha_avoli.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 97,
    updatedAt: BASE_TIMESTAMP + 97,
  },
  {
    id: 'kaalanchi',
    referenceNumber: 15,
    nameMl: 'കാളാഞ്ചി',
    pronunciationLatin: 'Kaalanchi',
    aliasesMl: ['നരിമീൻ'],
    nameEn: 'Asian seabass / Barramundi',
    scientificName: 'Lates calcarifer',
    family: 'Latidae',
    speciesNote: 'Prized coastal & backwater fish listed under Kerala brackish-water cultivable species.',
    identificationFeatures: 'Silvery-olive elongate body, distinct concave dip on forehead above bright eye, large lower jaw extending behind eye, rounded fan tail.',
    habitatSummary: 'Diadromous; estuaries, backwaters, coastal lagoons, and nearshore marine waters of Kerala.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Lates calcarifer',
        url: 'https://www.fishbase.org/summary/Lates-calcarifer',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Kerala Fisheries Department: Cultivable brackish-water species',
        url: 'https://fisheries.kerala.gov.in/en/cultivable-species-brackish-water-fishes-and-molluscs',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'confirmed',
    referenceImage: '/assets/catalog/kaalanchi.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 96,
    updatedAt: BASE_TIMESTAMP + 96,
  },
  {
    id: 'kilimeen',
    referenceNumber: 16,
    nameMl: 'കിളിമീൻ',
    pronunciationLatin: 'Kilimeen',
    aliasesMl: ['ചെമ്പൻ കിളിമീൻ'],
    nameEn: 'Threadfin bream / Pink perch',
    scientificName: 'Nemipterus japonicus',
    family: 'Nemipteridae',
    speciesNote: 'Representative threadfin bream (Nemipterus spp.); multiple pink-perch species are sold as കിളിമീൻ.',
    identificationFeatures: 'Rose-pink back shading to silvery belly, golden-yellow horizontal body stripes, and a yellow filament on upper tail lobe.',
    habitatSummary: 'Demersal coastal waters over sand or mud bottoms across the Kerala continental shelf.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Nemipterus japonicus',
        url: 'https://www.fishbase.org/summary/4559',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'കിളിമീൻ covers more than one Nemipterus species in Kerala trawl landings; photo depicts N. japonicus.',
    referenceImage: '/assets/catalog/kilimeen.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 95,
    updatedAt: BASE_TIMESTAMP + 95,
  },
  {
    id: 'natholi',
    referenceNumber: 17,
    nameMl: 'നത്തോലി',
    pronunciationLatin: 'Natholi / Kozhuva',
    aliasesMl: ['കൊഴുവ', 'നെത്തോലി'],
    nameEn: 'Indian anchovy (Anchovies)',
    scientificName: 'Stolephorus spp.',
    family: 'Engraulidae',
    speciesNote: 'Genus-level anchovy market entry (Stolephorus spp., commonly S. indicus); also called കൊഴുവ.',
    identificationFeatures: 'Small slender translucent cream-silver schooling fish with a bright shiny silver lateral stripe and rounded overhanging snout.',
    habitatSummary: 'Nearshore coastal pelagic waters and estuaries along the Kerala coast.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Stolephorus indicus',
        url: 'https://www.fishbase.org/summary/Stolephorus-indicus',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'നത്തോലി / കൊഴുവ maps to multiple Stolephorus and Encrasicholina anchovy species; confirm species from fresh catch.',
    referenceImage: '/assets/catalog/natholi.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 94,
    updatedAt: BASE_TIMESTAMP + 94,
  },
  {
    id: 'chempalli',
    referenceNumber: 18,
    nameMl: 'ചെമ്പല്ലി',
    pronunciationLatin: 'Chempalli',
    aliasesMl: ['ചെമ്പൻ'],
    nameEn: 'Red snapper (Mangrove red snapper group)',
    scientificName: 'Lutjanus spp.',
    family: 'Lutjanidae',
    speciesNote: 'Snapper market group; visual depicts Mangrove red snapper (Lutjanus argentimaculatus).',
    identificationFeatures: 'Stout copper-reddish-brown snapper with darker olive-bronze upper back, amber eye, strong jaw canines, and broad reddish tail.',
    habitatSummary: 'Coastal reefs, rocky outcrops, mangrove estuaries, and lower tidal rivers in Kerala.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Lutjanus argentimaculatus',
        url: 'https://www.fishbase.org/summary/Lutjanus-argentimaculatus',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Field Guide on Reef Associated Fishes of India (Eprint 10163)',
        url: 'https://eprints.cmfri.org.in/10163/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'ചെമ്പല്ലി is used broadly for multiple Lutjanus snappers; confirm exact species from individual catch markings.',
    referenceImage: '/assets/catalog/chempalli.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 93,
    updatedAt: BASE_TIMESTAMP + 93,
  },
  {
    id: 'maanthal',
    referenceNumber: 19,
    nameMl: 'മാന്തൾ',
    pronunciationLatin: 'Maanthal / Nangu',
    aliasesMl: ['നങ്ങ്'],
    nameEn: 'Malabar tonguesole / Solefish',
    scientificName: 'Cynoglossus macrostomus',
    family: 'Cynoglossidae',
    speciesNote: 'Also called നങ്ങ് in parts of Kerala; solefish flatfish group (Cynoglossus spp.).',
    identificationFeatures: 'Flat elongate tongue-shaped fish with marbled brownish upper skin, both small eyes on the left side, and continuous dorsal-anal-tail fin.',
    habitatSummary: 'Shallow muddy and sandy continental shelf waters along the Kerala–Malabar coast.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Cynoglossus macrostomus',
        url: 'https://www.fishbase.org/summary/Cynoglossus-macrostomus',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Onmanorama: Malayalam-English Kerala fish names',
        url: 'https://www.onmanorama.com/food/features/2024/11/12/malaylam-english-kerala-fish-names.amp.html',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'മാന്തൾ / നങ്ങ് may refer to several Cynoglossus tonguesole species landed along Kerala coasts.',
    referenceImage: '/assets/catalog/maanthal.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 92,
    updatedAt: BASE_TIMESTAMP + 92,
  },
  {
    id: 'poomeen',
    referenceNumber: 20,
    nameMl: 'പൂമീൻ',
    pronunciationLatin: 'Poomeen',
    nameEn: 'Milkfish',
    scientificName: 'Chanos chanos',
    family: 'Chanidae',
    speciesNote: 'Official cultivable Kerala brackish-water & coastal fish (Chanos chanos).',
    identificationFeatures: 'Sleek bright silvery torpedo-shaped body with olive-blue back, toothless small mouth, scaleless head, single dorsal fin, and huge forked tail.',
    habitatSummary: 'Coastal marine waters, estuaries, lagoons, and brackish backwater farms of Kerala.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Chanos chanos',
        url: 'https://www.fishbase.org/summary/Chanos-chanos',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Kerala Fisheries Department: Cultivable brackish-water species',
        url: 'https://fisheries.kerala.gov.in/en/cultivable-species-brackish-water-fishes-and-molluscs',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'confirmed',
    referenceImage: '/assets/catalog/poomeen.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 91,
    updatedAt: BASE_TIMESTAMP + 91,
  },
  {
    id: 'sheelavu',
    referenceNumber: 21,
    nameMl: 'ശീലാവ്',
    pronunciationLatin: 'Sheelavu',
    nameEn: 'Barracuda (Pickhandle barracuda group)',
    scientificName: 'Sphyraena spp.',
    family: 'Sphyraenidae',
    speciesNote: 'Barracuda market group (visual shows Pickhandle barracuda, Sphyraena jello).',
    identificationFeatures: 'Long cylindrical silvery-grey fish with pointed snout, jutting lower jaw, two separated dorsal fins, dark upper-flank bars, and forked tail.',
    habitatSummary: 'Coastal marine, reef-associated, and brackish waters along the Kerala coast.',
    imageMethod: 'Original 3:4 photorealistic species composition generated from scientific reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    sourceReferences: [
      {
        title: 'FishBase: Sphyraena jello',
        url: 'https://www.fishbase.org/summary/Sphyraena-jello',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Onmanorama: Malayalam-English Kerala fish names',
        url: 'https://www.onmanorama.com/food/features/2024/11/12/malaylam-english-kerala-fish-names.amp.html',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'ശീലാവ് applies to more than one Sphyraena barracuda species in Kerala coastal catches.',
    referenceImage: '/assets/catalog/sheelavu.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 90,
    updatedAt: BASE_TIMESTAMP + 90,
  },
  {
    id: 'karikkadi_chemmeen',
    referenceNumber: 22,
    catalogueGroup: 'seafood_other',
    seafoodClass: 'crustacean',
    nameMl: 'കരിക്കാടി ചെമ്മീൻ',
    pronunciationLatin: 'Karikkadi Chemmeen',
    aliasesMl: ['കരിക്കാടി'],
    nameEn: 'Kiddi shrimp / Karikkadi prawn',
    scientificName: 'Parapenaeopsis stylifera',
    family: 'Penaeidae',
    speciesNote: 'Verified Kerala commercial marine shrimp identified by ICAR-CMFRI explicitly as Karikkadi Chemmeen.',
    identificationFeatures: 'Small to medium pale reddish-pink translucent marine prawn with distinct pointed rostrum, slender long antennae, dark eye, and tapered telson.',
    habitatSummary: 'Coastal muddy-sand grounds off Kerala (shallow nearshore waters post-monsoon, migrating offshore up to 50–90 m during southwest monsoon).',
    imageMethod: 'Original 3:4 photorealistic whole-animal seafood composition generated from CMFRI/MPEDA reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    imageLicenseNote: 'Original generated asset using MPEDA/CMFRI morphology as scientific visual reference only; no external photo republished.',
    sourceReferences: [
      {
        title: 'ICAR-CMFRI: The "Karikkadi" fishery of Kerala (Eprint 4644)',
        url: 'https://eprints.cmfri.org.in/4644/',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Marine Fisheries Information Service Vol. 102 (Eprint 8096)',
        url: 'https://eprints.cmfri.org.in/8096/1/Marine_Fisheries_Information_Service_Vol_102.pdf',
        accessedAt: '2026-11-15',
      },
      {
        title: 'MPEDA: Crustaceans — Parapenaeopsis stylifera',
        url: 'https://mpeda.gov.in/?page_id=1263',
        accessedAt: '2026-11-15',
      },
      {
        title: 'WoRMS: Parapenaeopsis stylifera (Accepted)',
        url: 'https://www.marinespecies.org/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'confirmed',
    referenceImage: '/assets/catalog/karikkadi_chemmeen.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 89,
    updatedAt: BASE_TIMESTAMP + 89,
  },
  {
    id: 'chemmeen',
    referenceNumber: 23,
    catalogueGroup: 'seafood_other',
    seafoodClass: 'crustacean',
    nameMl: 'ചെമ്മീൻ',
    pronunciationLatin: 'Chemmeen',
    nameEn: 'Prawns / Shrimp (coastal market group)',
    scientificName: 'Penaeidae (multi-species market group)',
    family: 'Penaeidae',
    speciesNote: 'Broad Kerala market category covering multiple prawn species (e.g., White Prawn Penaeus indicus, Poovalan Metapenaeus dobsoni, Kazhanthan M. monoceros); visual depicts P. indicus type.',
    identificationFeatures: 'Whole unpeeled coastal prawns with translucent pearly grey-cream carapace, serrated rostrum, long antennae, segmented abdomen, and fan tail.',
    habitatSummary: 'Coastal shelf, estuaries, and brackish backwaters along the Kerala coast.',
    imageMethod: 'Original 3:4 photorealistic whole-animal seafood composition generated from MPEDA reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    imageLicenseNote: 'Original generated asset using MPEDA crustacean profiles as visual reference only.',
    sourceReferences: [
      {
        title: 'MPEDA: Crustaceans — White prawn & coastal Penaeidae',
        url: 'https://mpeda.gov.in/?page_id=1263',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Onmanorama: Malayalam-English Kerala fish & seafood names',
        url: 'https://www.onmanorama.com/food/features/2024/11/12/malaylam-english-kerala-fish-names.amp.html',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'ചെമ്മീൻ is a broad market name across Penaeus and Metapenaeus species; kept separate from കരിക്കാടി ചെമ്മീൻ (P. stylifera) and unconfirmed seller label നാരൻ കൊഞ്ച്.',
    referenceImage: '/assets/catalog/chemmeen.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 88,
    updatedAt: BASE_TIMESTAMP + 88,
  },
  {
    id: 'njandu',
    referenceNumber: 24,
    catalogueGroup: 'seafood_other',
    seafoodClass: 'crustacean',
    nameMl: 'ഞണ്ട്',
    pronunciationLatin: 'Njandu',
    aliasesMl: ['കടൽ ഞണ്ട്', 'കായൽ ഞണ്ട്'],
    nameEn: 'Crab (Coastal & backwater crab group)',
    scientificName: 'Portunidae (multi-species market group)',
    family: 'Portunidae',
    speciesNote: 'Broad crab category covering Blue Swimming Crab (Portunus pelagicus), Three-spot Crab (P. sanguinolentus), and Mud Crab (Scylla serrata); visual depicts whole P. pelagicus type.',
    identificationFeatures: 'Wide mottled olive-blue carapace with frontal teeth and prominent lateral spines, complete pair of chelipeds (claws), three walking leg pairs, and paddle-shaped rear swimming legs.',
    habitatSummary: 'Estuaries, backwaters (mud crabs), and shallow sandy coastal waters (sea swimming crabs) across Kerala.',
    imageMethod: 'Original 3:4 photorealistic whole-animal seafood composition generated from CMFRI/MPEDA reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    imageLicenseNote: 'Original generated asset using CMFRI Crab Identification Manual & MPEDA visual reference only.',
    sourceReferences: [
      {
        title: 'ICAR-CMFRI: Training Manual on Marine Commercial Crabs of India (Eprint 11869)',
        url: 'https://eprints.cmfri.org.in/11869/1/Training%20Manual%20on%20Species%20Identification_2017_Josileen%20Jose_Crab.pdf',
        accessedAt: '2026-11-15',
      },
      {
        title: 'MPEDA: Crustaceans — Portunus pelagicus & Scylla serrata',
        url: 'https://mpeda.gov.in/?page_id=1263',
        accessedAt: '2026-11-15',
      },
      {
        title: 'WoRMS: Portunus pelagicus / Scylla serrata (Accepted)',
        url: 'https://www.marinespecies.org/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'ഞണ്ട് covers both marine swimming crabs (Portunus spp.) and brackish mud crabs (Scylla serrata); assign exact species only from actual catch carapace & frontal teeth.',
    referenceImage: '/assets/catalog/njandu.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 87,
    updatedAt: BASE_TIMESTAMP + 87,
  },
  {
    id: 'kakka',
    referenceNumber: 25,
    catalogueGroup: 'seafood_other',
    seafoodClass: 'bivalve_mollusc',
    nameMl: 'കക്ക',
    pronunciationLatin: 'Kakka',
    nameEn: 'Clam (Backwater & coastal bivalve group)',
    scientificName: 'Villorita / Veneridae (multi-species clam group)',
    family: 'Cyrenidae / Veneridae',
    speciesNote: 'Generic clam category in Kerala; major local species include Black Clam (Villorita cyprinoides) and Short-neck Clam (Protapes gallus / Paphia malabarica in Ashtamudi). Visual shows whole dark concentric-ribbed backwater clam shells.',
    identificationFeatures: 'Intact tightly closed dark charcoal-brown and olive-grey bivalve shells with crisp concentric growth ridges.',
    habitatSummary: 'Brackish backwaters, estuaries, and shallow sandy-mud lagoons in Kerala (e.g., Vembanad and Ashtamudi–Azhikkal belt).',
    imageMethod: 'Original 3:4 photorealistic whole-shell composition generated from Kerala Fisheries/MPEDA reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    imageLicenseNote: 'Original generated asset using Government of Kerala Aquaculture Practices & MPEDA visual reference only.',
    sourceReferences: [
      {
        title: 'Govt. of Kerala: Package of Aquaculture Practices 2021 (Clams chapter)',
        url: 'https://fisheries.kerala.gov.in/sites/default/files/2021-02/Aquaculture%20Practices_compressed.pdf',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Clams (Aquaculture Package Chapter, Eprint 15109)',
        url: 'https://eprints.cmfri.org.in/15109/',
        accessedAt: '2026-11-15',
      },
      {
        title: 'MPEDA: Molluscs — Villorita cyprinoides & Clams',
        url: 'https://mpeda.gov.in/?page_id=1267',
        accessedAt: '2026-11-15',
      },
      {
        title: 'WoRMS: Villorita cyprinoides (Accepted) & Protapes gallus (syn. Paphia malabarica)',
        url: 'https://www.marinespecies.org/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'needs_local_confirmation',
    ambiguityNote: 'Confirm locally at Oachira/Azhikkal whether daily catch is Black Clam (കറുത്ത കക്ക, Villorita cyprinoides) or Short-neck Yellow Clam (മഞ്ഞ കക്ക, Protapes gallus / Paphia malabarica).',
    referenceImage: '/assets/catalog/kakka.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 86,
    updatedAt: BASE_TIMESTAMP + 86,
  },
  {
    id: 'kanava',
    referenceNumber: 26,
    catalogueGroup: 'seafood_other',
    seafoodClass: 'cephalopod',
    nameMl: 'കണവ',
    pronunciationLatin: 'Kanava',
    nameEn: 'Squid (Indian coastal squid group)',
    scientificName: 'Uroteuthis spp. (U. duvaucelii / U. sibogae)',
    family: 'Loliginidae',
    speciesNote: 'MPEDA records Loligo duvaucelii and Doryteuthis sibogae along the Kerala coast; current WoRMS-accepted combinations are Uroteuthis duvaucelii and Uroteuthis sibogae.',
    identificationFeatures: 'Streamlined cream-white torpedo mantle speckled pale pink-brown with triangular posterior fins, sharp eyes, eight short arms and two longer feeding tentacles.',
    habitatSummary: 'Neritic and coastal shelf waters along the Kerala coast landed abundantly by trawlers and jigs.',
    imageMethod: 'Original 3:4 photorealistic whole-animal cephalopod composition generated from CMFRI Bulletin 37 & MPEDA reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    imageLicenseNote: 'Original generated asset using CMFRI Bulletin 37 & MPEDA morphology reference only.',
    sourceReferences: [
      {
        title: 'MPEDA: Molluscs — Squid along Kerala coast',
        url: 'https://mpeda.gov.in/?page_id=1267',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Cephalopods of India, Bulletin 37 (Eprint 7028)',
        url: 'https://eprints.cmfri.org.in/7028/1/Bulletin_No_37.pdf',
        accessedAt: '2026-11-15',
      },
      {
        title: 'WoRMS: Uroteuthis duvaucelii & Uroteuthis sibogae (Accepted combinations)',
        url: 'https://www.marinespecies.org/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'Local Kerala trade terms കണവ and കൂന്തൽ can overlap across squid (Uroteuthis spp.) and cuttlefish (Acanthosepion / Sepia spp.); കൂന്തൽ is held for local confirmation.',
    referenceImage: '/assets/catalog/kanava.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 85,
    updatedAt: BASE_TIMESTAMP + 85,
  },
  {
    id: 'neeraali',
    referenceNumber: 27,
    catalogueGroup: 'seafood_other',
    seafoodClass: 'cephalopod',
    nameMl: 'നീരാളി',
    pronunciationLatin: 'Neeraali',
    nameEn: 'Octopus (market group)',
    scientificName: 'Octopus spp.',
    family: 'Octopodidae',
    speciesNote: 'Generic Malayalam market name for whole octopods listed as Octopus spp. under MPEDA Indian cephalopod resources.',
    identificationFeatures: 'Rounded bulbous un-finned mantle, prominent eyes, and exactly eight tapering sucker-lined arms.',
    habitatSummary: 'Coastal benthic reefs, rocky bottoms, and shelf waters along the Kerala coast.',
    imageMethod: 'Original 3:4 photorealistic whole-animal octopod composition generated from CMFRI Bulletin 37 & MPEDA reference with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    imageLicenseNote: 'Original generated asset using CMFRI Bulletin 37 & MPEDA octopus morphology reference only.',
    sourceReferences: [
      {
        title: 'MPEDA: Molluscs — Octopus spp.',
        url: 'https://mpeda.gov.in/?page_id=1267',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Cephalopods of India, Bulletin 37 (Eprint 7028)',
        url: 'https://eprints.cmfri.org.in/7028/1/Bulletin_No_37.pdf',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Onmanorama: Malayalam-English Kerala fish & seafood names',
        url: 'https://www.onmanorama.com/food/features/2024/11/12/malaylam-english-kerala-fish-names.amp.html',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'നീരാളി covers multiple shallow benthic Octopus species in Indian coastal landings; assign exact binomial only after species-level key check.',
    referenceImage: '/assets/catalog/neeraali.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 84,
    updatedAt: BASE_TIMESTAMP + 84,
  },
  {
    id: 'vatta',
    referenceNumber: 28,
    catalogueGroup: 'finfish',
    seafoodClass: 'finfish',
    nameMl: 'വറ്റ',
    pronunciationLatin: 'Vatta',
    aliasesMl: ['പാറ'],
    nameEn: 'Trevally / Jack (Carangid market group)',
    scientificName: 'Caranx spp.',
    family: 'Carangidae',
    speciesNote: 'Important Kerala coastal Carangid group documented in CMFRI Carangids guide; പാറ is closely associated in Kerala markets.',
    identificationFeatures: 'Deep compressed ovate bright silvery body, curved anterior lateral line transitioning into hard scutes along the narrow caudal peduncle, long sickle pectoral fin, deeply forked tail.',
    habitatSummary: 'Inshore reefs, sandy bays, estuaries, and coastal pelagic waters off Kerala.',
    imageMethod: 'Original 3:4 photorealistic finfish composition generated from CMFRI Carangids guide with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    imageLicenseNote: 'Original generated asset using CMFRI Carangids Guide morphology as visual reference only.',
    sourceReferences: [
      {
        title: 'ICAR-CMFRI: Carangids of Indian Seas Illustrated Guide (Eprint 13839)',
        url: 'https://eprints.cmfri.org.in/13839/',
        accessedAt: '2026-11-15',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'വറ്റ and പാറ are applied across several Caranx and Carangoides trevally species (and queenfish in parts of Kerala); confirm whether പാറ denotes a separate local species at Oachira.',
    referenceImage: '/assets/catalog/vatta.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 83,
    updatedAt: BASE_TIMESTAMP + 83,
  },
  {
    id: 'kora',
    referenceNumber: 29,
    catalogueGroup: 'finfish',
    seafoodClass: 'finfish',
    nameMl: 'കോര',
    pronunciationLatin: 'Kora',
    nameEn: 'Croaker / Jewfish (Sciaenid market group)',
    scientificName: 'Johnius / Otolithes spp.',
    family: 'Sciaenidae',
    speciesNote: 'Traditional Malayalam market name recorded by ICAR-CMFRI for coastal Sciaenid croakers and jewfishes.',
    identificationFeatures: 'Elongated silvery-grey to warm bronze-tinted body, rounded blunt snout, dark eye, long two-part dorsal fin, and pointed wedge-shaped tail fin.',
    habitatSummary: 'Muddy and sandy inshore coastal grounds and estuaries along the Kerala coast.',
    imageMethod: 'Original 3:4 photorealistic finfish composition generated from CMFRI Kerala vernacular guide with Noto Sans Malayalam Bold overlay on clean green banana leaf.',
    imageLicenseNote: 'Original generated asset generated from scientific Sciaenid morphology reference.',
    sourceReferences: [
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-15',
      },
      {
        title: 'Onmanorama: Malayalam-English Kerala fish names',
        url: 'https://www.onmanorama.com/food/features/2024/11/12/malaylam-english-kerala-fish-names.amp.html',
        accessedAt: '2026-11-15',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'കോര encompasses multiple Kerala coastal Sciaenidae species (Johnius, Otolithes, Nibea); species binomial depends on individual catch jaw/barbel structure.',
    referenceImage: '/assets/catalog/kora.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 82,
    updatedAt: BASE_TIMESTAMP + 82,
  },
  {
    id: 'njandu_three_spot',
    referenceNumber: 30,
    catalogueGroup: 'seafood_other',
    seafoodClass: 'crustacean',
    nameMl: 'ഞണ്ട്',
    pronunciationLatin: 'Njandu (Three-spot Crab)',
    aliasesMl: ['പുള്ളി ഞണ്ട്', 'മുക്കണ്ണൻ ഞണ്ട്', 'കടൽ ഞണ്ട്'],
    nameEn: 'Three-spot swimming crab',
    scientificName: 'Portunus sanguinolentus',
    family: 'Portunidae',
    speciesNote: 'Three-spot marine swimming crab (Portunus sanguinolentus) landed along the Kerala–Oachira coast and sold locally under ഞണ്ട്.',
    identificationFeatures: 'Olive-brown to greenish speckled carapace marked by three prominent maroon-red spots edged with pale white rings on the posterior half, sharp lateral carapace spines, and pale-tipped claws with blue swimming paddles.',
    habitatSummary: 'Sandy and muddy nearshore coastal waters and estuaries across Kerala.',
    imageMethod: 'Seller-supplied banana-leaf showcase photo preserving exact Malayalam name ഞണ്ട്.',
    sourceReferences: [
      {
        title: 'ICAR-CMFRI: Training Manual on Marine Commercial Crabs of India (Eprint 11869)',
        url: 'https://eprints.cmfri.org.in/11869/1/Training%20Manual%20on%20Species%20Identification_2017_Josileen%20Jose_Crab.pdf',
        accessedAt: '2026-11-17',
      },
      {
        title: 'MPEDA: Crustaceans — Swimming crabs',
        url: 'https://mpeda.gov.in/?page_id=1263',
        accessedAt: '2026-11-17',
      },
      {
        title: 'WoRMS: Portunus sanguinolentus',
        url: 'https://www.marinespecies.org/',
        accessedAt: '2026-11-17',
      },
    ],
    identificationConfidence: 'confirmed',
    referenceImage: '/assets/aistudio/85e7c938-82fb-4006-816d-98b26711c9b3_65a25555.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 81,
    updatedAt: BASE_TIMESTAMP + 81,
  },
  {
    id: 'chemkalava_meen',
    referenceNumber: 31,
    catalogueGroup: 'finfish',
    seafoodClass: 'finfish',
    nameMl: 'ചെങ്കലവ മീൻ',
    pronunciationLatin: 'Chemkalava Meen',
    aliasesMl: ['ചെങ്കലവ', 'കിളിമീൻ'],
    nameEn: 'Threadfin bream / Pink perch (Chemkalava)',
    scientificName: 'Nemipterus japonicus',
    family: 'Nemipteridae',
    speciesNote: 'Widely called ചെങ്കലവ മീൻ in southern Kerala / Kollam–Oachira coastal fish markets for pink perch / threadfin bream (Nemipterus spp.).',
    identificationFeatures: 'Rosy pink-reddish upper flanks shading to a silvery-white belly with bright golden-yellow horizontal body bands, yellow chin tint, red iris eyes, and forked pink tail fin.',
    habitatSummary: 'Demersal coastal shelf grounds over sand and mud along Kerala.',
    imageMethod: 'Seller-supplied banana-leaf showcase photo preserving exact Malayalam name ചെങ്കലവ മീൻ.',
    sourceReferences: [
      {
        title: 'FishBase: Nemipterus japonicus',
        url: 'https://www.fishbase.org/summary/4559',
        accessedAt: '2026-11-17',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-17',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'ചെങ്കലവ മീൻ / കിളിമീൻ is applied across Nemipterus threadfin bream species in Kerala trawl landings; photo depicts N. japonicus.',
    referenceImage: '/assets/aistudio/802e626a-9700-4120-ae87-f8f4e6465b33_53a6a824.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 80,
    updatedAt: BASE_TIMESTAMP + 80,
  },
  {
    id: 'cheelavu',
    referenceNumber: 32,
    catalogueGroup: 'finfish',
    seafoodClass: 'finfish',
    nameMl: 'ചീലാവ്',
    pronunciationLatin: 'Cheelavu',
    aliasesMl: ['ശീലാവ്', 'കോലാൻ ചീലാവ്'],
    nameEn: 'Barracuda (Cheelavu)',
    scientificName: 'Sphyraena spp.',
    family: 'Sphyraenidae',
    speciesNote: 'Traditional local Kerala market name ചീലാവ് for coastal barracudas (Sphyraena obtusata / Sphyraena jello group).',
    identificationFeatures: 'Slender cylindrical silvery-bronze fish with elongated pointed snout, jutting lower jaw, prominent round eyes, small pectoral fins, and deeply forked dark-edged tail.',
    habitatSummary: 'Inshore coastal pelagic waters, rocky reefs, and nearshore bays along Kerala.',
    imageMethod: 'Seller-supplied banana-leaf showcase photo preserving exact Malayalam name ചീലാവ്.',
    sourceReferences: [
      {
        title: 'FishBase: Sphyraena obtusata',
        url: 'https://www.fishbase.org/summary/Sphyraena-obtusata',
        accessedAt: '2026-11-17',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-17',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'ചീലാവ് / ശീലാവ് covers multiple coastal Sphyraena barracuda species landed in Kerala.',
    referenceImage: '/assets/aistudio/9e88a73e-4fc3-499a-8f6f-44cc4de7c070_b5e5a836.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 79,
    updatedAt: BASE_TIMESTAMP + 79,
  },
  {
    id: 'uluva_meen',
    referenceNumber: 33,
    catalogueGroup: 'finfish',
    seafoodClass: 'finfish',
    nameMl: 'ഉലുവ മീൻ',
    pronunciationLatin: 'Uluva Meen',
    aliasesMl: ['ഉലുവ', 'ഉലുവാച്ചി', 'അരണ മീൻ'],
    nameEn: 'Lizardfish (Uluva Meen)',
    scientificName: 'Saurida spp. (Saurida tumbil)',
    family: 'Synodontidae',
    speciesNote: 'Traditional coastal Kerala market name ഉലുവ മീൻ for marine lizardfishes (Saurida tumbil / Saurida spp., Family Synodontidae).',
    identificationFeatures: 'Elongated cylindrical bronze-olive back fading to silvery-white belly, blunt lizard-like head with wide mouth extending behind the eye, prominent cycloid scales, small adipose fin, and deeply forked tail.',
    habitatSummary: 'Demersal coastal muddy and sandy shelf grounds along the Kerala coast.',
    imageMethod: 'Seller-supplied banana-leaf showcase photo preserving exact Malayalam name ഉലുവ മീൻ.',
    sourceReferences: [
      {
        title: 'FishBase: Saurida tumbil',
        url: 'https://www.fishbase.org/summary/Saurida-tumbil',
        accessedAt: '2026-11-18',
      },
      {
        title: 'ICAR-CMFRI: Vernacular names of Kerala fishes (Eprint 3635)',
        url: 'https://eprints.cmfri.org.in/3635/',
        accessedAt: '2026-11-18',
      },
    ],
    identificationConfidence: 'probable',
    ambiguityNote: 'ഉലുവ മീൻ (ഉലുവാച്ചി / അരണ മീൻ) covers more than one Saurida lizardfish species in Kerala trawl landings; commonly Saurida tumbil.',
    referenceImage: '/assets/catalog/uluva_meen.jpg',
    isReferenceArtworkOnly: true,
    customActualPhotos: [],
    preferredBackground: 'banana-leaf',
    createdAt: BASE_TIMESTAMP + 78,
    updatedAt: BASE_TIMESTAMP + 78,
  },
];

export type FishCategoryFilter = 'sea' | 'backwater' | 'shellfish';

const BACKWATER_IDS = new Set([
  'kayal_koori',
  'karimeen',
  'kaalanchi',
  'poomeen',
]);

export function getFishCategory(fish: FishItem): FishCategoryFilter {
  if (
    fish.catalogueGroup === 'seafood_other' ||
    fish.seafoodClass === 'crustacean' ||
    fish.seafoodClass === 'bivalve_mollusc' ||
    fish.seafoodClass === 'cephalopod'
  ) {
    return 'shellfish';
  }
  if (BACKWATER_IDS.has(fish.id)) {
    return 'backwater';
  }
  const haystack = `${fish.nameMl} ${fish.pronunciationLatin} ${fish.nameEn || ''} ${fish.speciesNote || ''}`.toLowerCase();
  if (
    /prawn|shrimp|crab|squid|cuttle|clam|mussel|octopus|ചെമ്മീൻ|കൊഞ്ച്|ഞണ്ട്|കക്ക|കണവ|കൂന്തൽ|നീരാളി/.test(
      haystack
    )
  ) {
    return 'shellfish';
  }
  if (/കായൽ|പുഴ|backwater|river|pearlspot|karimeen|milkfish|seabass/.test(haystack)) {
    return 'backwater';
  }
  return 'sea';
}

