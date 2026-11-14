# ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി — App build bundle v2

ഈ bundle-ൽ നിങ്ങളുടെ numbered reference sheet അനുസരിച്ച് ക്രമപ്പെടുത്തിയ 10 പ്രധാന മീൻ പോസ്റ്ററുകൾ, പഴയ generated artwork, business logos, fish catalogue, Malayalam/English translations, PWA icon files, കൂടാതെ Google AI Studio-യ്ക്കുള്ള പുതിയ build prompt എന്നിവ ഉൾപ്പെടുന്നു.

## ആദ്യം തുറക്കേണ്ട ഫയൽ
`GOOGLE_AI_STUDIO_BUILD_PROMPT.md` — മുഴുവൻ prompt Google AI Studio-യിൽ paste ചെയ്യുക.

## നിങ്ങളുടെ reference sheet-ലെ 10 ചിത്രങ്ങൾ
01 കണ്ണൻ അയല
02 കായൽ കൂരി
03 വെള്ള ചൂര
04 അയല
05 കൊച്ചു മത്തി
06 ഉണ്ണിമേരി
07 വാള
08 മങ്കട
09 കേര ചൂര
10 വലിയ മത്തി

ഓരോന്നും `assets/fish_reference_posters/`-ൽ അതിന്റെ പേരോടെ save ചെയ്തിട്ടുണ്ട്. `reference/numbered_image_reference_sheet.png` എന്നത് നിങ്ങൾ നൽകിയ നമ്പർ ഷീറ്റിന്റെ പകർപ്പാണ്.

## പ്രധാന കാര്യം
പോസ്റ്റർ reference images generated artwork ആണ്; ഇന്നത്തെ യഥാർത്ഥ stock photo അല്ല. ദിവസേന യഥാർത്ഥ മീൻ ഫോട്ടോ അച്ഛൻ upload ചെയ്യണം. പഴയ design files-ൽ ice/lemon/leaves/old lettering ഉണ്ടാകാം; അവ `assets/legacy_fish_artwork/`-ൽ reference-only ആയി സൂക്ഷിച്ചിരിക്കുന്നു.

## PWA / Add to Home Screen
Google AI Studio നിർമ്മിക്കുന്ന app-ൽ `manifest.webmanifest`, `service-worker.js`, `app-icon-192.png`, `app-icon-512.png` ഉൾപ്പെടുത്തണം. PWA install/offline support-ിന് HTTPS hosting അല്ലെങ്കിൽ localhost ആവശ്യമാണ്. Android-ൽ supported browser prompt വന്നാൽ Install അമർത്തുക. iPhone-ൽ Safari → Share → Add to Home Screen → Add.

## WhatsApp
Supported phone browser-ൽ native share sheet വഴി photo file share ചെയ്യാം; അച്ഛൻ WhatsApp തിരഞ്ഞെടുത്ത് group തിരഞ്ഞെടുക്കണം. Unsupported browser-ൽ ചിത്രം download ചെയ്ത് WhatsApp-ൽ attach ചെയ്യാം. Static website-ന് സ്വയം group-ിലേക്ക് അയയ്ക്കാനോ group തിരഞ്ഞെടുക്കാനോ സാധിക്കില്ല.

## ഡാറ്റ സുരക്ഷ
Photo records, fish list, availability, prices എന്നിവ ഫോണിൽ തന്നെ സൂക്ഷിക്കണം. ഇടയ്ക്കിടെ backup എടുക്കുക.
