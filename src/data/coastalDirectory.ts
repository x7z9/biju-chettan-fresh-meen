import type { MessageTemplateItem } from '../types';

export interface CoastalDirectoryEntry {
  id: string;
  category: 'coastal_area' | 'seller_or_unit';
  nameMl: string;
  nameEn: string;
  placeMl: string;
  placeEn: string;
  typeMl: string;
  typeEn: string;
  contactOrSource?: string;
  notesMl: string;
  notesEn: string;
  verifiedAt: string;
}

export const COASTAL_DIRECTORY_META = {
  lastUpdated: '2026-11-17',
  regionMl: 'ഒച്ചിറ · അഴീക്കൽ · കായംകുളം · തോട്ടപ്പള്ളി · കൊല്ലം · കരുനാഗപ്പള്ളി',
  regionEn: 'Oachira · Azhikkal · Kayamkulam · Thottappally · Kollam · Karunagappally',
};

export const COASTAL_DIRECTORY_ENTRIES: CoastalDirectoryEntry[] = [
  {
    id: 'kayamkulam_harbour',
    category: 'coastal_area',
    nameMl: 'കായംകുളം (അഴീക്കൽ) ഫിഷിംഗ് ഹാർബർ',
    nameEn: 'Kayamkulam (Azhikkal) Fishing Harbour',
    placeMl: 'അഴീക്കൽ – ആലപ്പാട് / കരുനാഗപ്പള്ളി അതിർത്തി',
    placeEn: 'Azhikkal – Alappad / Karunagappally coastal belt',
    typeMl: 'തീരദേശ ലാൻഡിംഗ് & മത്സ്യബന്ധന കേന്ദ്രം',
    typeEn: 'Coastal fishing harbour & fish landing centre',
    contactOrSource: 'Kerala Harbour Engineering Department / Public coastal directory',
    notesMl: 'രാവിലെയും ഉച്ചയ്ക്കും തത്സമയ കടൽ മീനുകളും ചെമ്മീനും ഞണ്ടും എത്തുന്ന പ്രധാന കേന്ദ്രം.',
    notesEn: 'Primary landing belt near Oachira for fresh marine catch, prawns, and crabs.',
    verifiedAt: '2026-11-17',
  },
  {
    id: 'oachira_krishnapuram_route',
    category: 'coastal_area',
    nameMl: 'ഒച്ചിറ – തെക്കു കൊച്ചുമുറി – കൃഷ്ണപുരം മേഖല',
    nameEn: 'Oachira – Thekku Kochumuri – Krishnapuram Belt',
    placeMl: 'കൊല്ലം – ആലപ്പുഴ ജില്ലാ അതിർത്തി',
    placeEn: 'Kollam – Alappuzha District border',
    typeMl: 'കായൽ / പ്രാദേശിക വിപണന മേഖല',
    typeEn: 'Backwater & local neighbourhood catch area',
    contactOrSource: 'Seller service area (Biju Chettante Fresh Fish)',
    notesMl: 'കായൽ കരിമീൻ, കായൽ കൂരി, ചെമ്മീൻ, പ്രാദേശിക കടൽ മീനുകൾ എന്നിവയുടെ പ്രധാന വിതരണ മേഖല.',
    notesEn: 'Service zone known for backwater Pearlspot, catfish, prawns, and coastal landings.',
    verifiedAt: '2026-11-17',
  },
  {
    id: 'neendakara_kollam_harbour',
    category: 'coastal_area',
    nameMl: 'നീണ്ടകര & ശക്തികുളങ്ങര ഫിഷിംഗ് ഹാർബർ',
    nameEn: 'Neendakara & Sakthikulangara Fishing Harbour',
    placeMl: 'കൊല്ലം',
    placeEn: 'Kollam',
    typeMl: 'പ്രധാന ഫിഷിംഗ് ഹാർബർ',
    typeEn: 'Major marine fishing harbour',
    contactOrSource: 'Kerala Fisheries / CMFRI landing records',
    notesMl: 'ചെമ്മീൻ, കണവ, അയല, മത്തി, ചൂര, കിളിമീൻ എന്നിവയുടെ പ്രധാന ദക്ഷിണ കേരള ഹാർബർ.',
    notesEn: 'Major South Kerala marine landing harbour for shrimp, cephalopods, tuna, and mackerel.',
    verifiedAt: '2026-11-17',
  },
  {
    id: 'thottappally_harbour',
    category: 'coastal_area',
    nameMl: 'തോട്ടപ്പള്ളി ഫിഷിംഗ് ഹാർബർ',
    nameEn: 'Thottappally Fishing Harbour',
    placeMl: 'ആലപ്പുഴ ജില്ല',
    placeEn: 'Alappuzha District',
    typeMl: 'തീരദേശ മത്സ്യബന്ധന കേന്ദ്രം',
    typeEn: 'Coastal harbour & backwater outlet',
    contactOrSource: 'Kerala Harbour Engineering Department',
    notesMl: 'സീസൺ അനുസരിച്ച് മത്തി, അയല, മാന്തൾ, നത്തോലി, ചെമ്മീൻ ലാൻഡിംഗുകൾ.',
    notesEn: 'Seasonal landings of sardines, mackerel, soles, anchovies, and prawns.',
    verifiedAt: '2026-11-17',
  },
  {
    id: 'matsyafed_fresh_fish',
    category: 'seller_or_unit',
    nameMl: 'മത്സ്യഫെഡ് (Matsyafed) പൊതു വിപണന കേന്ദ്രങ്ങൾ',
    nameEn: 'Matsyafed Public Fish Stalls & Cooperatives',
    placeMl: 'കൊല്ലം – ആലപ്പുഴ തീരദേശം',
    placeEn: 'Kollam – Alappuzha coastal network',
    typeMl: 'സംസ്ഥാന സഹകരണ മത്സ്യ വിപണനം',
    typeEn: 'Kerala state cooperative fisheries body',
    contactOrSource: 'https://matsyafed.kerala.gov.in',
    notesMl: 'ഫോൺ നമ്പറുകളും സമയവും നേരിട്ട് പരിശോധിച്ചതിന് ശേഷമേ ഉറപ്പിക്കാവൂ; പ്രാദേശിക സൊസൈറ്റികൾ മാറാം.',
    notesEn: 'Check official Matsyafed portal directly for current cooperative stall timings.',
    verifiedAt: '2026-11-17',
  },
];

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplateItem[] = [
  {
    id: 'morning_catch_ready',
    labelMl: 'രാവിലെ മീൻ വന്നു',
    labelEn: 'Morning fresh catch ready',
    bodyMl:
      '🐟 ഇന്നത്തെ ഫ്രെഷ് മീനുകൾ റെഡിയാണ്!\n📍 {location}\n{fish_summary}\nവിളിക്കുക / WhatsApp: {owner} ({phone})',
    bodyEn:
      "🐟 Today's fresh catch is ready!\n📍 {location}\n{fish_summary}\nCall / WhatsApp: {owner} ({phone})",
  },
  {
    id: 'no_price_call',
    labelMl: 'വില വിളിച്ചു ചോദിക്കൂ',
    labelEn: 'Call to confirm rate',
    bodyMl:
      '🐟 ഇന്നത്തെ മീൻ വിവരങ്ങൾക്ക് വിളിക്കൂ അല്ലെങ്കിൽ WhatsApp ചെയ്യൂ.\nഇന്നത്തെ ലഭ്യത: {fish_summary}\n📞 {owner}: {phone}',
    bodyEn:
      '🐟 Call or WhatsApp for today’s rate and catch details.\nAvailable today: {fish_summary}\n📞 {owner}: {phone}',
  },
  {
    id: 'limited_stock',
    labelMl: 'കുറച്ചു മാത്രം ബാക്കി',
    labelEn: 'Limited stock left',
    bodyMl:
      '⚠️ ഇന്നത്തെ ചില മീനുകൾ കുറച്ചു മാത്രം ബാക്കിയുണ്ട്.\nവേണ്ടവർ വേഗം വിളിക്കുക / മെസ്സേജ് അയക്കുക:\n📞 {owner} — {phone}',
    bodyEn:
      '⚠️ Limited stock remaining today.\nCall or message early if interested:\n📞 {owner} — {phone}',
  },
  {
    id: 'sold_out_update',
    labelMl: 'ഇന്നത്തെ സ്റ്റോക്ക് തീർന്നു',
    labelEn: 'Sold out for today',
    bodyMl:
      '🙏 ഇന്നത്തെ ഫ്രെഷ് മീനുകൾ എല്ലാം തീർന്നു. അടുത്ത വരവ് അറിയാൻ ഗ്രൂപ്പിൽ ശ്രദ്ധിക്കുക.\n— {business} ({owner})',
    bodyEn:
      "🙏 Today's catch is completely sold out. Thank you everyone!\n— {business} ({owner})",
  },
  {
    id: 'afternoon_update',
    labelMl: 'ഉച്ചയ്ക്ക് ശേഷമുള്ള അപ്ഡേറ്റ്',
    labelEn: 'Afternoon availability update',
    bodyMl:
      '🐟 ഉച്ചയ്ക്ക് ശേഷം ഇപ്പോൾ ലഭ്യമായ മീനുകൾ:\n{fish_summary}\n📍 {location}\n📞 {owner}: {phone}',
    bodyEn:
      '🐟 Currently available this afternoon:\n{fish_summary}\n📍 {location}\n📞 {owner}: {phone}',
  },
  {
    id: 'delivery_pickup_note',
    labelMl: 'വണ്ടി / പിക്കപ്പ് സമയം',
    labelEn: 'Delivery / pickup note',
    bodyMl:
      '🚐 ഇന്നത്തെ മീൻ വിതരണം / പിക്കപ്പ് ({location} പരിസരത്ത്) തുടങ്ങി.\nഓർഡർ അന്വേഷിക്കാൻ വിളിക്കുക: {owner} ({phone})',
    bodyEn:
      '🚐 Pickup / local van route near {location} is open.\nCall to check availability: {owner} ({phone})',
  },
];
