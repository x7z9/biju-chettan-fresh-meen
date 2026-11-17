import { translations } from '../data/translations';
import type {
  BusinessSettings,
  DailyRecord,
  FishItem,
  Language,
  TrashFishItem,
} from '../types';
import { formatDisplayDate } from './speechAndDate';

export type SearchActionTarget =
  | { type: 'today_fish'; fishId: string }
  | { type: 'poster'; fish: FishItem }
  | { type: 'edit_fish'; fish: FishItem }
  | { type: 'tab'; tab: 'today' | 'fish' | 'add' | 'more'; moreSection?: string }
  | { type: 'share' }
  | { type: 'toggle_theme' }
  | { type: 'switch_lang'; lang: Language };

export interface AppSearchResult {
  id: string;
  kind: 'fish' | 'trash' | 'history' | 'section' | 'setting' | 'action' | 'term';
  title: string;
  subtitle: string;
  score: number;
  target?: SearchActionTarget;
}

export interface SpellSuggestion {
  originalToken: string;
  suggested: string;
  replacedQuery: string;
}

export interface UniversalSearchOutput {
  matchedFishIds: Set<string>;
  appResults: AppSearchResult[];
  spellSuggestions: SpellSuggestion[];
  isValidKnownQuery: boolean;
}

interface IndexedEntry {
  id: string;
  kind: AppSearchResult['kind'];
  title: string;
  subtitle: string;
  searchTexts: string[];
  target?: SearchActionTarget;
}

// Phonetic folding for Manglish/English words
function latinPhoneticKey(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-z0-9]/g, '')
    .replace(/ph/g, 'f')
    .replace(/zh/g, 'l')
    .replace(/sh/g, 's')
    .replace(/ch/g, 'c')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/gh/g, 'g')
    .replace(/kh/g, 'k')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ou|ow/g, 'u')
    .replace(/ai|ay|ei/g, 'e')
    .replace(/ck/g, 'k')
    .replace(/q/g, 'k')
    .replace(/w/g, 'v')
    .replace(/y$/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

// Phonetic/keyboard confusion folding for Malayalam words
function mlPhoneticKey(word: string): string {
  return word
    .normalize('NFC')
    .replace(/[\u200c\u200d]/g, '')
    .replace(/ൻ/g, 'ന')
    .replace(/ൺ/g, 'ണ')
    .replace(/ൽ/g, 'ല')
    .replace(/ൾ/g, 'ള')
    .replace(/ർ/g, 'ര')
    .replace(/ീ/g, 'ി')
    .replace(/ൂ/g, 'ു')
    .replace(/േ/g, 'െ')
    .replace(/ോ/g, 'ൊ')
    .replace(/ൈ/g, 'െ')
    .replace(/ൗ/g, 'ൊ')
    .replace(/ശ|ഷ/g, 'സ')
    .replace(/ള|ഴ/g, 'ല')
    .replace(/റ/g, 'ര')
    .replace(/ണ/g, 'ന')
    .replace(/ഖ/g, 'ക')
    .replace(/ഘ/g, 'ഗ')
    .replace(/ഛ/g, 'ച')
    .replace(/ഝ/g, 'ജ')
    .replace(/ഠ|ഡ|ഢ/g, 'ട')
    .replace(/ഥ|ധ/g, 'ത')
    .replace(/ഫ/g, 'പ')
    .replace(/ഭ/g, 'ബ')
    .replace(/്/g, '')
    .replace(/(.)\1+/g, '$1');
}

function isMalayalamText(s: string): boolean {
  return /[\u0D00-\u0D7F]/.test(s);
}

// Optimal string alignment / Damerau-Levenshtein distance with fast cutoff
function damerauLevenshtein(a: string, b: string, maxDist = 4): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const dp: number[][] = Array.from({ length: la + 1 }, () =>
    new Array<number>(lb + 1).fill(0)
  );
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    let rowMin = maxDist + 1;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
  }
  return dp[la][lb];
}

function tokenizeQuery(text: string): string[] {
  return text
    .normalize('NFC')
    .trim()
    .split(/[\s,·/|()\-:?!.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

interface VocabWord {
  word: string;
  lower: string;
  phonetic: string;
  isMl: boolean;
  priority: number; // higher weight for fish names & key app terms
}

function buildAppVocabulary(
  fishList: FishItem[],
  trashList: TrashFishItem[],
  settings: BusinessSettings
): VocabWord[] {
  const map = new Map<string, VocabWord>();

  const addPhrase = (raw: string | undefined, priority: number) => {
    if (!raw) return;
    const cleaned = raw.normalize('NFC').trim();
    if (!cleaned) return;
    const tokens = cleaned
      .split(/[\s,·/|()\-:?!.]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2);
    for (const word of tokens) {
      const lower = word.toLowerCase();
      const isMl = isMalayalamText(word);
      const phonetic = isMl ? mlPhoneticKey(word) : latinPhoneticKey(word);
      const existing = map.get(lower);
      if (!existing || priority > existing.priority) {
        map.set(lower, { word, lower, phonetic, isMl, priority });
      }
    }
  };

  for (const fish of fishList) {
    addPhrase(fish.nameMl, 10);
    addPhrase(fish.pronunciationLatin, 10);
    for (const alias of fish.aliasesMl || []) addPhrase(alias, 9);
    addPhrase(fish.nameEn, 8);
    addPhrase(fish.scientificName, 7);
    addPhrase(fish.family, 6);
    addPhrase(fish.speciesNote, 4);
    addPhrase(fish.habitatSummary, 4);
  }

  for (const tr of trashList) {
    addPhrase(tr.fish.nameMl, 7);
    addPhrase(tr.fish.pronunciationLatin, 7);
    addPhrase(tr.fish.nameEn, 6);
  }

  // Core app feature keywords + translations
  const coreKeywords: [string, number][] = [
    ['WhatsApp', 8],
    ['Poster', 8],
    ['Menu', 8],
    ['Backup', 8],
    ['Restore', 8],
    ['Trash', 8],
    ['History', 8],
    ['Settings', 8],
    ['Language', 7],
    ['Malayalam', 7],
    ['English', 7],
    ['Theme', 7],
    ['Dark', 7],
    ['Light', 7],
    ['Price', 8],
    ['Available', 8],
    ['Sold', 7],
    ['Install', 7],
    ['Reference', 6],
    ['Oachira', 7],
    ['Krishnapuram', 7],
    ['Seafood', 8],
    ['Crustacean', 7],
    ['Mollusc', 7],
    ['Cephalopod', 7],
    ['Prawn', 8],
    ['Shrimp', 8],
    ['Crab', 8],
    ['Clam', 8],
    ['Squid', 8],
    ['Octopus', 8],
    ['ചവറ്റുകുട്ട', 8],
    ['പകർപ്പ്', 8],
    ['ബാക്കപ്പ്', 8],
    ['പോസ്റ്റർ', 8],
    ['വാട്സാപ്പ്', 8],
    ['വില', 8],
    ['ക്രമീകരണങ്ങൾ', 8],
    ['തീം', 7],
    ['ഭാഷ', 7],
    ['ഇന്നത്തെ', 7],
    ['ലഭ്യമാണ്', 7],
    ['തിരിച്ചെടുക്കുക', 7],
    ['പഴയ', 6],
    ['കടൽവിഭവം', 8],
  ];
  for (const [kw, prio] of coreKeywords) addPhrase(kw, prio);

  addPhrase(settings.businessNameMl, 7);
  addPhrase(settings.businessNameEn, 7);
  addPhrase(settings.whatsappGroupNameMl, 7);
  addPhrase(settings.locationMl, 7);
  addPhrase(settings.locationEn, 7);

  for (const val of Object.values(translations.ml)) addPhrase(val, 3);
  for (const val of Object.values(translations.en)) addPhrase(val, 3);

  return Array.from(map.values());
}

function buildAppIndex(
  fishList: FishItem[],
  dailyRecord: DailyRecord,
  allDailyRecords: DailyRecord[],
  trashList: TrashFishItem[],
  settings: BusinessSettings,
  lang: Language
): IndexedEntry[] {
  const entries: IndexedEntry[] = [];

  // 1. Catalog Fish
  for (const fish of fishList) {
    const entry = dailyRecord.entries[fish.id];
    const isAvail = !!entry?.available;
    const statusLabel = isAvail
      ? lang === 'en'
        ? 'Available today'
        : 'ഇന്ന് ലഭ്യമാണ്'
      : lang === 'en'
        ? 'Catalog fish'
        : 'മീൻ പട്ടിക';

    entries.push({
      id: `fish_${fish.id}`,
      kind: 'fish',
      title: `${fish.nameMl} · ${fish.pronunciationLatin}`,
      subtitle: [
        fish.nameEn,
        fish.scientificName,
        entry?.priceAmount ? `₹${entry.priceAmount}` : '',
        statusLabel,
      ]
        .filter(Boolean)
        .join(' · '),
      searchTexts: [
        fish.nameMl,
        fish.pronunciationLatin,
        fish.nameEn || '',
        fish.scientificName || '',
        fish.family || '',
        fish.seafoodClass || '',
        fish.catalogueGroup === 'seafood_other' ? 'seafood കടൽവിഭവം' : '',
        ...(fish.aliasesMl || []),
        fish.speciesNote || '',
        fish.identificationFeatures || '',
        fish.habitatSummary || '',
        entry?.note || '',
        entry?.priceAmount || '',
        fish.referenceNumber !== null
          ? `#${String(fish.referenceNumber).padStart(2, '0')} #${fish.referenceNumber}`
          : '',
      ].filter(Boolean),
      target: { type: 'poster', fish },
    });
  }

  // 2. Trash Bin Items
  for (const tr of trashList) {
    entries.push({
      id: `trash_${tr.id}`,
      kind: 'trash',
      title:
        lang === 'en'
          ? `Trash: ${tr.fish.nameMl} (${tr.fish.pronunciationLatin})`
          : `ചവറ്റുകുട്ട: ${tr.fish.nameMl} (${tr.fish.pronunciationLatin})`,
      subtitle:
        lang === 'en'
          ? 'Tap to open Trash Bin & restore'
          : 'തിരിച്ചെടുക്കാൻ ചവറ്റുകുട്ട തുറക്കുക',
      searchTexts: [
        tr.fish.nameMl,
        tr.fish.pronunciationLatin,
        tr.fish.nameEn || '',
        'trash',
        'deleted',
        'restore',
        'ചവറ്റുകുട്ട',
        'തിരിച്ചെടുക്കുക',
      ].filter(Boolean),
      target: { type: 'tab', tab: 'more', moreSection: 'trash' },
    });
  }

  // 3. Past History Records
  const historyWithAvailable = allDailyRecords
    .filter((r) => Object.values(r.entries).some((e) => e.available))
    .slice(0, 14);

  for (const rec of historyWithAvailable) {
    const names = Object.values(rec.entries)
      .filter((e) => e.available)
      .map((e) => fishList.find((f) => f.id === e.fishId)?.nameMl || e.fishId);

    entries.push({
      id: `hist_${rec.dateKey}`,
      kind: 'history',
      title: `${
        lang === 'en' ? 'History' : 'പഴയ ദിവസം'
      }: ${formatDisplayDate(rec.dateKey, lang)}`,
      subtitle: names.join(' · '),
      searchTexts: [
        rec.dateKey,
        formatDisplayDate(rec.dateKey, 'ml'),
        formatDisplayDate(rec.dateKey, 'en'),
        ...names,
        'history',
        'പഴയ ദിവസങ്ങൾ',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'history' },
    });
  }

  // 4. App Sections, Tools & Settings
  const appSections: IndexedEntry[] = [
    {
      id: 'act_share',
      kind: 'action',
      title:
        lang === 'en'
          ? "Share Today's List & Photos on WhatsApp"
          : 'ഇന്നത്തെ പട്ടികയും ഫോട്ടോകളും WhatsApp-ൽ പങ്കിടുക',
      subtitle:
        lang === 'en'
          ? 'All Photos + Text, Menu Card, Text Only'
          : 'എല്ലാ ഫോട്ടോകളും, മെനു കാർഡ്, എഴുത്ത്',
      searchTexts: [
        'whatsapp',
        'share',
        'menu card',
        'all photos',
        'text only',
        'copy message',
        'send',
        'list',
        'വാട്സാപ്പ്',
        'പങ്കിടുക',
        'മെനു കാർഡ്',
        'എല്ലാ ഫോട്ടോകളും',
        'സന്ദേശം',
        'ഫോട്ടോ',
        'പട്ടിക',
      ],
      target: { type: 'share' },
    },
    {
      id: 'sec_catalogue',
      kind: 'section',
      title: lang === 'en' ? 'Fish Catalogue (Edit / Delete)' : 'മീൻ പട്ടിക (തിരുത്തുക / നീക്കുക)',
      subtitle: `${fishList.length} ${lang === 'en' ? 'fish items' : 'മീനുകൾ'}`,
      searchTexts: [
        'fish list',
        'catalogue',
        'catalog',
        'edit',
        'delete',
        'pronunciation',
        'scientific',
        'മീൻ പട്ടിക',
        'തിരുത്തുക',
        'ഉച്ചാരണം',
      ],
      target: { type: 'tab', tab: 'fish' },
    },
    {
      id: 'act_add_fish',
      kind: 'action',
      title: lang === 'en' ? 'Add New Fish' : 'പുതിയ മീൻ ചേർക്കുക',
      subtitle:
        lang === 'en'
          ? 'Add custom fish name & real catch photos'
          : 'പുതിയ മീനും ഫോട്ടോയും ചേർക്കുക',
      searchTexts: [
        'add fish',
        'new fish',
        'create',
        'camera',
        'gallery',
        'photo',
        'banana leaf',
        'blue tray',
        'പുതിയ മീൻ',
        'ചേർക്കുക',
        'ഗാലറി',
        'ഫോട്ടോ എടുക്കുക',
      ],
      target: { type: 'tab', tab: 'add' },
    },
    {
      id: 'sec_trash',
      kind: 'section',
      title: lang === 'en' ? 'Trash Bin (Restore Deleted Fish)' : 'ചവറ്റുകുട്ട (തിരിച്ചെടുക്കുക)',
      subtitle: `${trashList.length} ${lang === 'en' ? 'items in trash' : 'മീനുകൾ'}`,
      searchTexts: [
        'trash',
        'bin',
        'restore deleted',
        'recycle',
        'ചവറ്റുകുട്ട',
        'ഒഴിവാക്കിയവ',
        'തിരിച്ചെടുക്കുക',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'trash' },
    },
    {
      id: 'sec_backup',
      kind: 'section',
      title: lang === 'en' ? 'Backup & Restore (JSON)' : 'പകർപ്പ് എടുക്കുക & തിരിച്ചെടുക്കുക',
      subtitle:
        lang === 'en'
          ? 'Export full backup or restore from file'
          : 'ഫോണിലേക്ക് പകർപ്പ് സേവ് ചെയ്യുക',
      searchTexts: [
        'backup',
        'restore',
        'export',
        'import',
        'json',
        'download',
        'പകർപ്പ്',
        'ബാക്കപ്പ്',
        'തിരിച്ചെടുക്കുക',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'backup' },
    },
    {
      id: 'sec_history',
      kind: 'section',
      title: lang === 'en' ? 'Daily History' : 'പഴയ ദിവസങ്ങൾ (History)',
      subtitle:
        lang === 'en'
          ? 'Past saved daily availability lists'
          : 'മുൻ ദിവസങ്ങളിലെ മീൻ വിവരങ്ങൾ',
      searchTexts: ['history', 'previous days', 'records', 'പഴയ ദിവസങ്ങൾ', 'ചരിത്രം'],
      target: { type: 'tab', tab: 'more', moreSection: 'history' },
    },
    {
      id: 'sec_settings',
      kind: 'setting',
      title:
        lang === 'en'
          ? 'Business & Poster Settings'
          : 'സ്ഥാപനവും പോസ്റ്റർ ക്രമീകരണങ്ങളും',
      subtitle: `${settings.whatsappGroupNameMl} · ${settings.locationMl} · ${settings.ownerName} (${settings.phoneDisplay})`,
      searchTexts: [
        'settings',
        'business',
        'phone',
        'location',
        'group',
        'disclaimer',
        'poster',
        'banana leaf',
        'blue tray',
        settings.businessNameMl,
        settings.businessNameEn,
        settings.whatsappGroupNameMl,
        settings.ownerName,
        settings.locationMl,
        settings.locationEn,
        settings.phoneDisplay,
        'ക്രമീകരണങ്ങൾ',
        'ഫോൺ',
        'സ്ഥലം',
        'വാഴയില',
        'നീല ട്രേ',
        'ഒച്ചിറ',
        'കൃഷ്ണപുരം',
        'ബിജു',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'settings' },
    },
    {
      id: 'sec_install',
      kind: 'section',
      title: lang === 'en' ? 'Install App / Language / Privacy' : 'ആപ്പ് ഇൻസ്റ്റാൾ / ഭാഷ / സുരക്ഷ',
      subtitle:
        lang === 'en'
          ? 'Add to Home Screen, offline storage info'
          : 'ഹോം സ്ക്രീനിൽ ചേർക്കുക, ഓഫ്‌ലൈൻ വിവരങ്ങൾ',
      searchTexts: [
        'install',
        'pwa',
        'home screen',
        'offline',
        'privacy',
        'more',
        'ഇൻസ്റ്റാൾ',
        'ഹോം സ്ക്രീൻ',
        'ഓഫ്‌ലൈൻ',
        'സുരക്ഷ',
        'കൂടുതൽ',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'language' },
    },
    {
      id: 'sec_refs',
      kind: 'section',
      title: lang === 'en' ? 'Poster Reference Sheet (01–10)' : 'പഴയ പോസ്റ്റർ മാതൃകകൾ (01–10)',
      subtitle:
        lang === 'en'
          ? 'View numbered reference poster sheet'
          : 'നമ്പർ ഇട്ട മാതൃകാ ചിത്രങ്ങൾ കാണുക',
      searchTexts: ['reference sheet', '01-10', 'sample', 'മാതൃക', 'റഫറൻസ്'],
      target: { type: 'tab', tab: 'more', moreSection: 'references' },
    },
    {
      id: 'act_theme',
      kind: 'action',
      title: lang === 'en' ? 'Switch Light / Dark Theme' : 'ലൈറ്റ് / ഡാർക്ക് തീം മാറ്റുക',
      subtitle:
        lang === 'en'
          ? 'Tap to toggle pitch-black dark mode'
          : 'പകൽ വെളിച്ചം / രാത്രി മോഡ് മാറ്റുക',
      searchTexts: [
        'theme',
        'dark mode',
        'light mode',
        'night',
        'black',
        'തീം',
        'രാത്രി മോഡ്',
        'ഡാർക്ക്',
      ],
      target: { type: 'toggle_theme' },
    },
    {
      id: 'act_lang',
      kind: 'action',
      title: lang === 'en' ? 'Switch to Malayalam (മലയാളം)' : 'Switch to English',
      subtitle:
        lang === 'en'
          ? 'Tap to change app language to മലയാളം'
          : 'ആപ്പ് ഭാഷ English ആക്കുക',
      searchTexts: ['language', 'malayalam', 'english', 'ഭാഷ', 'മലയാളം', 'ഇംഗ്ലീഷ്'],
      target: { type: 'switch_lang', lang: lang === 'en' ? 'ml' : 'en' },
    },
    {
      id: 'act_share_customer',
      kind: 'action',
      title:
        lang === 'en'
          ? 'Share Customer View Link & Offline HTML'
          : 'കസ്റ്റമർ പേജ് ലിങ്ക് & ഓഫ്‌ലൈൻ HTML പങ്കിടുക',
      subtitle:
        lang === 'en'
          ? 'Zero-backend customer menu snapshot, QR code & standalone HTML'
          : 'കസ്റ്റമർ പേജ്, QR കോഡ്, ഓഫ്‌ലൈൻ HTML ഫയൽ',
      searchTexts: [
        'customer view',
        'snapshot',
        'link',
        'html',
        'qr',
        'qr code',
        'കസ്റ്റമർ പേജ്',
        'ലിങ്ക്',
        'ക്യുആർ',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'qr' },
    },
    {
      id: 'sec_enquiries',
      kind: 'section',
      title:
        lang === 'en'
          ? 'Local Customer Enquiries Notebook'
          : 'ഓർഡർ / അന്വേഷണ നോട്ട്ബുക്ക്',
      subtitle:
        lang === 'en'
          ? 'Record customer calls & enquiries locally on phone'
          : 'കസ്റ്റമർ വിളിച്ച വിവരങ്ങൾ ഫോണിൽ കുറിച്ചുവയ്ക്കുക',
      searchTexts: [
        'enquiry',
        'enquiries',
        'order',
        'orders',
        'notebook',
        'csv',
        'അന്വേഷണം',
        'ഓർഡർ',
        'നോട്ട്ബുക്ക്',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'enquiries' },
    },
    {
      id: 'sec_templates',
      kind: 'section',
      title:
        lang === 'en'
          ? 'Malayalam Customer Message Templates'
          : 'മലയാളം സന്ദേശ മാതൃകകൾ (Templates)',
      subtitle:
        lang === 'en'
          ? 'Quick morning catch, limited stock, sold out updates'
          : 'രാവിലെ വരവ്, കുറച്ചു മാത്രം, തീർന്നു സന്ദേശങ്ങൾ',
      searchTexts: [
        'templates',
        'message templates',
        'quick reply',
        'സന്ദേശ മാതൃക',
        'ടെംപ്ലേറ്റ്',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'templates' },
    },
    {
      id: 'sec_glossary',
      kind: 'section',
      title:
        lang === 'en'
          ? 'Fish Name Glossary (Malayalam ↔ English)'
          : 'മീൻ പേരുകളുടെ പട്ടിക (Glossary)',
      subtitle:
        lang === 'en'
          ? 'Bilingual fish names, aliases & identification confidence'
          : 'മലയാളം, ഉച്ചാരണം, ശാസ്ത്രീയ നാമം എന്നിവ തിരയുക',
      searchTexts: [
        'glossary',
        'scientific name',
        'names',
        'alias',
        'ഉച്ചാരണം',
        'ശാസ്ത്രീയ നാമം',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'glossary' },
    },
    {
      id: 'sec_coastal_dir',
      kind: 'section',
      title:
        lang === 'en'
          ? 'Coastal Landing & Seller Directory'
          : 'തീരദേശ മത്സ്യ കേന്ദ്രങ്ങൾ (ഒച്ചിറ – കൊല്ലം)',
      subtitle:
        lang === 'en'
          ? 'Kayamkulam, Azhikkal, Neendakara, Thottappally reference'
          : 'അഴീക്കൽ, കായംകുളം, നീണ്ടകര, തോട്ടപ്പള്ളി വിവരങ്ങൾ',
      searchTexts: [
        'directory',
        'harbour',
        'azhikkal',
        'kayamkulam',
        'neendakara',
        'thottappally',
        'ഹാർബർ',
        'അഴീക്കൽ',
        'കായംകുളം',
      ],
      target: { type: 'tab', tab: 'more', moreSection: 'directory' },
    },
  ];

  entries.push(...appSections);

  return entries;
}

function scoreTextMatch(
  query: string,
  tokens: string[],
  searchTexts: string[]
): number {
  const fullLower = query.toLowerCase().normalize('NFC').trim();
  const qPhonetic = isMalayalamText(fullLower)
    ? mlPhoneticKey(fullLower)
    : latinPhoneticKey(fullLower);

  let best = 0;

  for (const rawText of searchTexts) {
    const text = rawText.normalize('NFC');
    const lower = text.toLowerCase();

    if (lower === fullLower) return 120;
    if (lower.startsWith(fullLower)) best = Math.max(best, 95);
    else if (lower.includes(fullLower)) best = Math.max(best, 80);

    const words = lower.split(/[\s,·/|()\-:]+/).filter(Boolean);
    for (const w of words) {
      if (w === fullLower) best = Math.max(best, 110);
      else if (w.startsWith(fullLower)) best = Math.max(best, 90);

      const isMl = isMalayalamText(w) || isMalayalamText(fullLower);
      const wPhon = isMl ? mlPhoneticKey(w) : latinPhoneticKey(w);

      if (qPhonetic.length >= 2 && wPhon === qPhonetic) {
        best = Math.max(best, 78);
      } else if (
        qPhonetic.length >= 3 &&
        (wPhon.startsWith(qPhonetic) || wPhon.includes(qPhonetic))
      ) {
        best = Math.max(best, 64);
      } else if (fullLower.length >= 3) {
        const maxD = fullLower.length <= 4 ? 1 : 2;
        const dRaw = damerauLevenshtein(fullLower, w, maxD);
        if (dRaw <= maxD) {
          best = Math.max(best, 66 - dRaw * 12);
        } else if (qPhonetic.length >= 3 && wPhon.length >= 3) {
          const dPhon = damerauLevenshtein(qPhonetic, wPhon, maxD);
          if (dPhon <= maxD) {
            best = Math.max(best, 60 - dPhon * 12);
          }
        }
      }
    }
  }

  // Multi-token aggregate bonus if all tokens match cleanly
  if (tokens.length > 1) {
    let matchedCount = 0;
    for (const tok of tokens) {
      if (scoreTextMatch(tok, [tok], searchTexts) >= 45) matchedCount++;
    }
    if (matchedCount === tokens.length) {
      best = Math.max(best, 74);
    } else if (matchedCount > 0) {
      best = Math.max(best, Math.round((matchedCount / tokens.length) * 58));
    }
  }

  return best;
}

export function runUniversalOfflineSearch(params: {
  query: string;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  allDailyRecords: DailyRecord[];
  trashList: TrashFishItem[];
  settings: BusinessSettings;
  lang: Language;
}): UniversalSearchOutput {
  const { query, fishList, dailyRecord, allDailyRecords, trashList, settings, lang } =
    params;

  const trimmed = query.normalize('NFC').trim();
  if (!trimmed) {
    return {
      matchedFishIds: new Set(fishList.map((f) => f.id)),
      appResults: [],
      spellSuggestions: [],
      isValidKnownQuery: false,
    };
  }

  const tokens = tokenizeQuery(trimmed);
  const vocab = buildAppVocabulary(fishList, trashList, settings);
  const index = buildAppIndex(
    fishList,
    dailyRecord,
    allDailyRecords,
    trashList,
    settings,
    lang
  );

  // Offline Spell Check for every token in the query
  const spellSuggestions: SpellSuggestion[] = [];
  let allTokensExactOrPrefix = true;

  for (const tok of tokens) {
    if (tok.length < 2) continue;
    const tokLower = tok.toLowerCase();
    const tokIsMl = isMalayalamText(tok);
    const tokPhon = tokIsMl ? mlPhoneticKey(tok) : latinPhoneticKey(tok);

    const exactHit = vocab.some(
      (v) => v.lower === tokLower || (tok.length >= 2 && v.lower.startsWith(tokLower))
    );
    if (exactHit) continue;

    allTokensExactOrPrefix = false;
    if (tok.length < 3) continue;

    let bestCandidate: { word: string; dist: number; priority: number } | null = null;
    const maxDist = tok.length <= 4 ? 1 : tok.length <= 7 ? 2 : 3;

    for (const v of vocab) {
      if (v.isMl !== tokIsMl) continue;
      if (tokPhon && v.phonetic === tokPhon && v.lower !== tokLower) {
        if (!bestCandidate || 0.2 < bestCandidate.dist || (0.2 === bestCandidate.dist && v.priority > bestCandidate.priority)) {
          bestCandidate = { word: v.word, dist: 0.2, priority: v.priority };
        }
        continue;
      }
      const dRaw = damerauLevenshtein(tokLower, v.lower, maxDist);
      const dPhon =
        tokPhon.length >= 2 && v.phonetic.length >= 2
          ? damerauLevenshtein(tokPhon, v.phonetic, maxDist)
          : maxDist + 1;
      const effDist = Math.min(dRaw, dPhon + 0.4);
      if (effDist <= maxDist) {
        if (
          !bestCandidate ||
          effDist < bestCandidate.dist ||
          (effDist === bestCandidate.dist && v.priority > bestCandidate.priority)
        ) {
          bestCandidate = { word: v.word, dist: effDist, priority: v.priority };
        }
      }
    }

    if (bestCandidate && bestCandidate.word.toLowerCase() !== tokLower) {
      const replacedQuery = tokens
        .map((t) => (t === tok ? bestCandidate!.word : t))
        .join(' ');
      if (!spellSuggestions.some((s) => s.suggested.toLowerCase() === bestCandidate!.word.toLowerCase())) {
        spellSuggestions.push({
          originalToken: tok,
          suggested: bestCandidate.word,
          replacedQuery,
        });
      }
    }
  }

  // Score all app items + fish using both raw query & top spell-corrected query if available
  const effectiveQueries = [trimmed];
  if (spellSuggestions.length > 0) {
    effectiveQueries.push(spellSuggestions[0].replacedQuery);
  }

  const matchedFishItems: { id: string; score: number }[] = [];
  const scoredResults: AppSearchResult[] = [];

  for (const item of index) {
    let topScore = 0;
    for (const eq of effectiveQueries) {
      const s = scoreTextMatch(eq, tokenizeQuery(eq), item.searchTexts);
      // Slight penalty when matched only via spell-correction
      const weighted = eq === trimmed ? s : Math.round(s * 0.92);
      if (weighted > topScore) topScore = weighted;
    }

    if (topScore >= 48) {
      if (item.kind === 'fish' && item.id.startsWith('fish_')) {
        matchedFishItems.push({
          id: item.id.slice('fish_'.length),
          score: topScore,
        });
      } else {
        scoredResults.push({
          id: item.id,
          kind: item.kind,
          title: item.title,
          subtitle: item.subtitle,
          score: topScore,
          target: item.target,
        });
      }
    }
  }

  const maxFishScore = matchedFishItems.reduce(
    (max, item) => (item.score > max ? item.score : max),
    0
  );
  const fishScoreFloor = maxFishScore >= 90 ? 68 : 48;
  const matchedFishIds = new Set(
    matchedFishItems
      .filter((item) => item.score >= fishScoreFloor)
      .map((item) => item.id)
  );

  scoredResults.sort((a, b) => b.score - a.score);

  return {
    matchedFishIds,
    appResults: scoredResults.slice(0, 8),
    spellSuggestions: spellSuggestions.slice(0, 3),
    isValidKnownQuery: allTokensExactOrPrefix && tokens.length > 0,
  };
}
