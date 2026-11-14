# GOOGLE AI STUDIO — COMPLETE BUILD PROMPT
# ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി | Biju Chettante Fresh Meen Vandi
## Malayalam-first, bilingual, installable, image-first daily fish availability app

You are a senior product designer and front-end engineer. Build a complete, production-quality **static Progressive Web App (PWA)** using only HTML, CSS and vanilla JavaScript. This is a real small family fish-selling business tool for the owner's father in Oachira–Krishnapuram, Kerala. The father primarily reads Malayalam, understands only basic English, and will use an Android phone early every morning. Prioritise immediate comprehension, large images, large buttons and a 3-tap daily workflow.

**The finished product must look and behave like a simple mobile app, not like a conventional website.** Do not create a desktop-style website header, hero page, huge marketing text, long paragraphs, complex dashboard or crowded admin panel. The app is a practical daily fish-photo and WhatsApp helper.

---

# A. SOURCE REFERENCE — READ THIS FIRST

The project includes the user-uploaded numbered reference sheet at:
`reference/numbered_image_reference_sheet.png`

The sheet contains ten poster thumbnails numbered 1 through 10. Match each number to the exact fish name and provided generated reference asset below. Do not reorder, swap or guess these mappings.

| Reference number | Exact Malayalam fish name | English-letter pronunciation | Exact app asset filename |
|---:|---|---|---|
| 01 | കണ്ണൻ അയല | Kannan Ayala | `assets/fish_reference_posters/01_kannan_ayala.png` |
| 02 | കായൽ കൂരി | Kayal Koori | `assets/fish_reference_posters/02_kayal_koori.png` |
| 03 | വെള്ള ചൂര | Vella Choora | `assets/fish_reference_posters/03_vella_choora.png` |
| 04 | അയല | Ayala | `assets/fish_reference_posters/04_ayala.png` |
| 05 | കൊച്ചു മത്തി | Kochu Mathi | `assets/fish_reference_posters/05_kochu_mathi.png` |
| 06 | ഉണ്ണിമേരി | Unnimery | `assets/fish_reference_posters/06_unnimery.png` |
| 07 | വാള | Vaala | `assets/fish_reference_posters/07_vaala.png` |
| 08 | മങ്കട | Mankada | `assets/fish_reference_posters/08_mankada.png` |
| 09 | കേര ചൂര | Kera Choora | `assets/fish_reference_posters/09_kera_choora.png` |
| 10 | വലിയ മത്തി | Valiya Mathi | `assets/fish_reference_posters/10_valiya_mathi.png` |

These exact images are already included in the project. Use them for the catalogue cards, fish identification references and poster-style inspiration. The embedded lettering in a reference poster is artwork and must not be trusted as the authoritative fish name; always read the name from `fish_catalog.json`.

**Important image distinction:** these are generated reference posters, not verified photos of the fish available today. The father must upload a fresh, real catch photo for each day's actual product poster. Never use a generated reference image as evidence that the fish is in stock.

Other older generated fish posters are inside `assets/legacy_fish_artwork/`. Business/group logo images are inside `assets/business_brand_assets/`. They are optional reference artwork only. Some older art may contain unwanted ice, lemons, leaves, sea scenery or outdated text; do not use those as current product posters.

---

# B. BUSINESS DEFAULTS — USE EXACT VALUES

- Business name (Malayalam): `ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ`
- Business name (English): `Biju Chettante Fresh Fish`
- WhatsApp group (Malayalam): `ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി`
- Owner: `Biju`
- Location (Malayalam): `ഒച്ചിറ – കൃഷ്ണപുരം`
- Location (English): `Oachira – Krishnapuram, Kerala, India`
- Contact: `+91 95444 33018`
- Default poster heading (Malayalam): `ഇന്നത്തെ മീൻ`
- Default poster heading (English): `Today's Fish`
- Default small creative note (Malayalam): `സൂചന: പരസ്യത്തിനായുള്ള സൃഷ്ടിപരമായ ദൃശ്യാവിഷ്കാരം.`
- Default small creative note (English): `Note: Creative visual representation for advertising.`

Make business name, contact number, location, group name and disclaimer editable from a very simple settings screen. Seed them with these exact values.

---

# C. RESPONSIVE DESIGN — MUST FIT ALL DEVICE SIZES

The user says the design must follow the attached reference sheet line by line, scale smoothly and fit the mobile screen. Implement true responsive behaviour, not just a desktop layout shrunk down.

1. Add the viewport meta tag and use mobile-first CSS.
2. Support narrow Android phones from 320 px width, common devices at 360/375/390/412/430 px, tablets, laptops and desktop screens.
3. Use flexible CSS Grid/Flexbox, `minmax()`, `clamp()`, relative units and fluid image sizing. Avoid fixed-width panels and fixed-height cards that clip Malayalam text.
4. Use `box-sizing: border-box`, responsive font sizes, safe-area insets and dynamic viewport units (`100dvh` with fallback).
5. On phones, the app should use the full available screen, with a compact top bar and a fixed bottom navigation bar that respects `env(safe-area-inset-bottom)`.
6. Main content must not sit behind the bottom navigation; apply suitable bottom padding.
7. On tablets and desktop, keep the app-like layout centred and comfortable, with a sensible max-width; do not stretch cards across the entire screen.
8. Poster previews should preserve the 3:4 ratio and never stretch fish photographs.
9. On narrow screens use one or two cards per row depending on actual available width; no horizontal overflow.
10. Test portrait and landscape. In landscape, allow scrolling and do not cut off actions.
11. Test Malayalam text at browser zoom 100%, 125%, 150% and 200%; labels must wrap naturally and never be clipped.
12. Touch targets should be at least approximately 44–48 CSS pixels; add visible focus states and accessible labels.
13. Use responsive image `object-fit: contain` by default for actual fish; never crop away head, tail or body.
14. No hover-only interactions. Every operation must work by touch.

Use a restrained app colour system: deep navy `#082D59`, bright fish-tray blue `#0879D9`, white/off-white surfaces, small yellow highlights and accessible dark text. Large rounded cards, subtle shadows, calm spacing. Avoid flashy gradients, excessive icons or clutter.

---

# D. APP-LIKE STRUCTURE — NOT A WEBSITE

Create an app shell with:

### Compact top bar
- Small business logo/app icon.
- Business name, shortened on narrow devices if needed.
- A clear language toggle: `മലയാളം | English`.
- A clearly visible install button with home-screen icon: `ഹോം സ്ക്രീനിൽ ചേർക്കുക` / `Add to Home Screen`.
- Date shown compactly.

### Bottom navigation on mobile
Only four simple tabs:
1. `ഇന്ന്` / `Today`
2. `മീൻ` / `Fish`
3. `പുതിയത്` / `Add New`
4. `കൂടുതൽ` / `More`

On tablet/desktop, the same navigation can move to a small side rail or top strip, but retain the phone-app visual language.

### Main screen: Today
The first screen should immediately show a visual grid of the ten seeded fish cards. Each card should show:
- the correct numbered poster image
- Malayalam fish name, prominently
- English pronunciation below in smaller text
- a large simple availability state (not a tiny switch): `ലഭ്യമാണ്` / `Available` or `തീർന്നു` / `Sold out`
- a simple tap target to toggle availability
- optional small camera/add-photo action

Use image-first cards with very little text. The main purpose is to let Biju's father tap the fish photos to mark what is available today.

Add a large, obvious action button:
`ഇന്നത്തെ പട്ടിക പങ്കിടുക` / `Share Today's List`

Also show a simple count, e.g. `ലഭ്യമായ മീനുകൾ: 5` / `Available fish: 5`, but only if it fits cleanly.

### Fish catalogue screen
Show all fish cards, including a search field and an obvious `പുതിയ മീൻ ചേർക്കുക` / `Add New Fish` button. Cards should allow edit, add photographs and pronunciation playback.

### Add-new-fish screen
Keep the form short and simple:
- `മീനിന്റെ പേര് (മലയാളത്തിൽ)` / `Fish name (Malayalam)` — required
- `ഇംഗ്ലീഷ് ഉച്ചാരണം` / `Pronunciation (English letters)` — required
- `ഫോട്ടോ ചേർക്കുക` / `Add photo` — one or more real photos
- `English name` — optional
- `കുറിപ്പ്` / `Note` — optional
- Save and Cancel buttons

New fish must be persisted locally and become available in the Today list. The user must be able to add more fish names and photographs indefinitely, subject to device storage.

### More screen
Keep it simple: settings, language, business details, daily history, install instructions, backup/restore, old poster references.

---

# E. COMPLETE BILINGUAL UI — MALAYALAM AND ENGLISH

All user-facing UI must have complete Malayalam and English translations, not just the title. The language toggle is always visible in the top navigation.

- Default language: Malayalam (`ml`).
- Secondary language: English (`en`).
- Remember the selected language across reloads using localStorage.
- Translate headings, navigation, buttons, placeholders, field labels, empty states, errors, confirmations, share instructions, settings, install instructions, backup text and accessibility labels.
- Never mix languages in one label except where an English pronunciation field is intentionally shown.
- Fish names must remain in their original Malayalam script in both language modes; the English mode should show the English-letter pronunciation beneath the Malayalam name, not replace the local Malayalam name.
- Add a small speaker icon beside the pronunciation. Use `speechSynthesis` when a suitable voice is available; for romanised names, set an English India voice when available. If no suitable voice exists, show the pronunciation text without an error.
- Do not rely on a remote translation API.

Use a central translation object `translations = { ml: {...}, en: {...} }`; never scatter hard-coded UI strings through the JavaScript. Include a complete translation dictionary in `ui_translations.json` and load it from the app.

Minimum visible translations include:

| Malayalam | English |
|---|---|
| ഇന്ന് | Today |
| മീൻ പട്ടിക | Fish List |
| പുതിയ മീൻ ചേർക്കുക | Add New Fish |
| കൂടുതൽ | More |
| ഇന്നത്തെ മീൻ | Today's Fish |
| ലഭ്യമാണ് | Available |
| തീർന്നു | Sold Out |
| ഫോട്ടോ ചേർക്കുക | Add Photo |
| ഫോട്ടോ എടുക്കുക | Take Photo |
| ഫോട്ടോ പങ്കിടുക | Share Photo |
| ഡൗൺലോഡ് ചെയ്യുക | Download |
| ഇന്നത്തെ പട്ടിക പങ്കിടുക | Share Today's List |
| വില ചേർക്കുക | Add Price |
| കിലോയ്ക്ക് | Per kg |
| ഒന്നിന് | Per piece |
| സേവ് ചെയ്യുക | Save |
| റദ്ദാക്കുക | Cancel |
| തിരുത്തുക | Edit |
| ഒഴിവാക്കുക | Delete |
| പകർപ്പ് എടുക്കുക | Create Backup |
| പകർപ്പ് തിരിച്ചെടുക്കുക | Restore Backup |
| ഹോം സ്ക്രീനിൽ ചേർക്കുക | Add to Home Screen |
| ക്രമീകരണങ്ങൾ | Settings |
| പഴയ പോസ്റ്റർ മാതൃകകൾ | Poster References |
| പഴയ ദിവസങ്ങൾ | Daily History |

---

# F. INSTALL TO HOME SCREEN — REAL PWA, NOT A FAKE BUTTON

The father wants a simple button so he can open the app every morning from the phone home screen.

Implement a complete installable Progressive Web App:

1. Create `manifest.webmanifest` with name, short name, Malayalam language, app icons, start URL, scope, `display: standalone`, orientation, background and theme colours.
2. Create `service-worker.js` and register it. Cache the app shell, CSS, JavaScript, translations, catalogue seed and supplied assets. Use versioned caches and safe update logic. Do not cache private daily uploaded fish photos in a shared public cache; keep user data in IndexedDB.
3. Include app icons at 192 × 192 and 512 × 512 using the supplied business logo artwork in `assets/app_icons/`.
4. Include `apple-touch-icon`, theme colour and viewport metadata.
5. On Chromium Android browsers, listen for `beforeinstallprompt`, reveal the in-app `ഹോം സ്ക്രീനിൽ ചേർക്കുക` button only when the event is available, call the browser prompt after a genuine tap, and handle accepted/dismissed outcomes.
6. Listen for `appinstalled` and then show `ആപ്പ് ചേർത്തു` / `App installed` and hide the install button.
7. Use `matchMedia('(display-mode: standalone)')` and iOS standalone detection to avoid showing install instructions after the app is already installed.
8. The `beforeinstallprompt` event is not available on iOS Safari. On iPhone/iPad, the install button should open a simple Malayalam/English help card with these steps: Safari → Share → Add to Home Screen → Add. Explain that the icon is added only to that device.
9. If the app is not running on HTTPS or localhost, show a helpful message that installation/offline features need a secure hosted URL. Do not claim the button worked unless the browser confirms installation.
10. Do not show a dead or decorative install button. It must perform the relevant action or show platform-specific instructions.

The app must still work as a normal responsive static site when PWA installation is unavailable.

---

# G. FISH CATALOGUE — SEED EXACTLY FROM THE NUMBERED SHEET

Create `fish_catalog.json` with these ten records in the exact order and mapping from Section A:

1. `കണ്ണൻ അയല` — `Kannan Ayala` — reference 01
2. `കായൽ കൂരി` — `Kayal Koori` — reference 02
3. `വെള്ള ചൂര` — `Vella Choora` — reference 03
4. `അയല` — `Ayala` — reference 04
5. `കൊച്ചു മത്തി` — `Kochu Mathi` — reference 05
6. `ഉണ്ണിമേരി` — `Unnimery` — reference 06
7. `വാള` — `Vaala` — reference 07
8. `മങ്കട` — `Mankada` — reference 08
9. `കേര ചൂര` — `Kera Choora` — reference 09
10. `വലിയ മത്തി` — `Valiya Mathi` — reference 10

Preserve the seller's local Malayalam spelling exactly. Do not silently change local names, even if another spelling exists in dictionaries. Add a note field for uncertainty in species identification. Never show an unverified scientific name as fact.

Each catalogue record needs:
- unique id
- reference number
- Malayalam display name
- Latin/English-letter pronunciation
- optional English helper name
- optional scientific name only when verified
- species-confidence note
- supplied poster-reference image path
- an array of user-uploaded actual photographs
- created/updated timestamps
- optional background preference (`blue-tray` or `banana-leaf`)

The supplied number images are only artwork samples. The application must ask for or use a new original photo for today's actual stock poster.

---

# H. DAILY AVAILABILITY AND EARLY-MORNING WORKFLOW

The normal use case is early morning.

- Use the device's local date and show it clearly.
- Start each new day with a fresh availability checklist.
- Retain the fish catalogue and all earlier day histories.
- One large tap toggles a fish between Available and Sold Out.
- Offer a simple `ഇന്നത്തെ മീനുകൾ തിരഞ്ഞെടുക്കുക` step.
- An optional note may be added to a fish, such as `വലുത്`, `ചെറുത്`, `1 കിലോ`, or the owner’s own note.
- Save changes automatically, but also show a clear save state.
- Add a single button to prepare a message containing only the fish marked available.
- Let the father reopen today's saved list.
- Do not promise timed background reminders or automated scheduled WhatsApp posting; a static app cannot reliably post a WhatsApp message in the background.

---

# I. OPTIONAL PRICE SYSTEM — OFF BY DEFAULT

Price is optional for every fish.

Allow:
- amount (number)
- unit: `₹ / കിലോ`, `₹ / എണ്ണം`, `₹ / പാക്കറ്റ്`
- optional fish size/quantity note

Default is OFF and hidden from the poster and WhatsApp message.

Add an easy global toggle `വില ചേർക്കണോ?` / `Include prices?` and per-fish prices. Never invent a price, calculate a market price or assume a value. Include only what the father typed. Give a final preview before sharing.

---

# J. ACTUAL FISH PHOTO TO POSTER CREATOR

This is a core feature.

- Take or upload one or more real photos for a fish.
- Use the actual photo as the main poster subject.
- Default output ratio: **3:4 portrait**, recommended 1200 × 1600 pixels.
- Default background: clean bright-blue plastic fish tray.
- Optional background: clean fresh green banana leaf.
- Use `object-fit: contain` or canvas contain fitting by default, keeping the whole fish visible from head to tail.
- Let the owner reposition/zoom only if needed, but the initial framing must not crop the fish.
- Gentle lighting, clarity, exposure and colour corrections only; do not alter identity, anatomy, markings, fins, eye location or fish species.
- Provide a before/after view and preserve the unedited original image.
- Use a premium, clean, image-first layout with the fish occupying most of the poster.

### Poster text defaults

Malayalam mode:
- Heading: `ഇന്നത്തെ മീൻ`
- Large fish name: the exact selected Malayalam catalogue name
- Bottom note, optional and ON by default: `സൂചന: പരസ്യത്തിനായുള്ള സൃഷ്ടിപരമായ ദൃശ്യാവിഷ്കാരം.`

English mode:
- Heading: `Today's Fish`
- Fish label: show the Latin pronunciation and optional English helper name; keep the Malayalam name visible as a secondary line so local customers can identify it.
- Bottom note: `Note: Creative visual representation for advertising.`

Add a setting for poster language: Malayalam (default), English or bilingual. Do not force the app's UI language to change the poster unless the user selects this setting.

### Strict exclusions

Do not add any of the following by default:
- ice or crushed ice
- lemon/lime
- curry leaves, herbs, vegetables, spices or garnish
- plates, baskets, kitchen utensils or extra props
- sea, ocean, beaches, waves, boats or water-horizon scenes
- people, hands, unrelated logos or decorative ingredients
- fake FSSAI logo, approval claim, certification badge or government seal

The owner's real photo must remain the source of truth. Do not duplicate fish or generate new fish. The browser Canvas API can create the poster layout and overlays; it cannot perform generative photo reconstruction by itself. Be honest about this limitation.

Use locally available Malayalam fonts only, with graceful fallback:
`Noto Sans Malayalam`, `Manjari`, `Kartika`, `Nirmala UI`, `sans-serif`.
Do not depend on downloading a web font at runtime.

File name format:
`innathe-meen-{fish-id}-{YYYY-MM-DD}.jpg`

Offer `ഡൗൺലോഡ്` / `Download` and `ഫോട്ടോ പങ്കിടുക` / `Share Photo`.

---

# K. WHATSAPP SHARING

Use native file sharing when supported:
- Build a `File` from the rendered poster Blob.
- Check `navigator.canShare({ files })`.
- On a genuine user tap, use `navigator.share({ files, title, text })`.
- User chooses WhatsApp and then manually selects the group.

Fallback:
- Download the poster file.
- Open WhatsApp with a pre-filled text message using `https://wa.me/?text=`.
- Ask the user to attach the downloaded image manually if the image was not shared through the native file share.

Add:
- `ഫോട്ടോ പങ്കിടുക` / `Share Photo`
- `ഇന്നത്തെ പട്ടിക പങ്കിടുക` / `Share Today's List`
- `സന്ദേശം പകർത്തുക` / `Copy Message`
- `ഫോട്ടോ ഡൗൺലോഡ് ചെയ്യുക` / `Download Photo`

Never claim that the app can silently choose a WhatsApp group or send a message automatically. Display this simple help:
Malayalam: `WhatsApp തുറന്നാൽ നിങ്ങളുടെ ഗ്രൂപ്പ് തിരഞ്ഞെടുക്കുക. ചിത്രം നേരിട്ട് പങ്കിടാൻ കഴിയാത്ത പക്ഷം ആദ്യം ചിത്രം ഡൗൺലോഡ് ചെയ്ത് WhatsApp-ൽ ചേർക്കുക.`
English: `When WhatsApp opens, choose your group. If direct photo sharing is unavailable, download the image first and attach it in WhatsApp.`

### Suggested message

`🐟 ഇന്നത്തെ മീനുകൾ ലഭ്യമാണ്\n📍 ഒച്ചിറ – കൃഷ്ണപുരം\n• കൊച്ചു മത്തി\n• അയല\n• കേര ചൂര\nവില അറിയാൻ വിളിക്കുക: +91 95444 33018\n— ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി`

Generate the list from the actual selected available fish, not hard-coded fish names. Include price only if explicitly enabled.

---

# L. ADD MORE FISH LATER

The father must not need to edit HTML or JSON to add new fish.

Create a simple `പുതിയ മീൻ ചേർക്കുക` form with:
- Malayalam name — required
- English-letter pronunciation — required
- one or more real photographs
- optional English name
- optional note / local market spelling
- optional scientific name and evidence note
- preferred poster background

Save in IndexedDB and update catalogue cards immediately. Allow editing fish names and photos later. Do not impose an arbitrary small limit.

Provide a search field that searches Malayalam name, pronunciation and optional English name.

---

# M. LOCAL DATA, HISTORY AND BACKUP

- IndexedDB: fish records, actual uploaded photos, daily availability, price inputs and poster history.
- localStorage: language, theme, last selected day and small app preferences.
- New local day starts with blank availability; do not erase catalogue or history.
- Add a daily history view with date and fish that were marked available.
- `പകർപ്പ് എടുക്കുക` must export JSON including records and photo data (use Blob URLs; do not save private images in the service-worker public cache).
- `പകർപ്പ് തിരിച്ചെടുക്കുക` must validate the JSON, show a preview and ask for confirmation before restoring.
- Add a way to export only the fish catalogue separately.
- Handle storage quota errors and tell the father to export a backup.

---

# N. ACCESSIBILITY AND SIMPLE INTERACTIONS

- Big buttons, large photo cards, high contrast and simple visual states.
- Use icons with visible Malayalam/English labels; never icon-only for key actions.
- Provide keyboard navigation, focus styles, semantic headings, aria labels and alt text.
- Avoid tiny switches; use large card state buttons.
- Use friendly confirmation prompts.
- No technical messages shown to the father.
- Provide optional sound/haptic feedback only when supported and not intrusive.
- Do not autoplay audio.

---

# O. REQUIRED PROJECT FILES

Produce complete working source, not an outline or a static mock-up.

Required:
- `index.html`
- `styles.css`
- `app.js`
- `fish_catalog.json`
- `ui_translations.json`
- `asset_manifest.json`
- `manifest.webmanifest`
- `service-worker.js`
- `README_MALAYALAM.md`
- `assets/fish_reference_posters/01_...png` through `10_...png`
- `assets/legacy_fish_artwork/` (all older generated fish-art references)
- `assets/business_brand_assets/` (all 9 business/group image assets)
- `assets/app_icons/app-icon-192.png`
- `assets/app_icons/app-icon-512.png`
- `reference/numbered_image_reference_sheet.png`

Use the existing relative file names and update all paths exactly. Do not substitute generic stock photos for the ten supplied fish references.

---

# P. TESTING CHECKLIST — MUST COMPLETE BEFORE DELIVERY

1. Open the app at 320, 360, 375, 390, 412, 430 px, tablet and desktop widths.
2. Confirm no horizontal overflow, clipped buttons or cut Malayalam glyphs.
3. Confirm the interface looks like a simple app in mobile standalone mode, not a website.
4. Confirm the Malayalam/English language toggle translates every UI element and remembers choice.
5. Confirm the ten numbered poster files load and the names match the mapping in Section A.
6. Confirm pronunciation labels and optional speak button work gracefully.
7. Confirm fish can be marked available/sold out and remain saved after reload.
8. Confirm a new fish and multiple photographs can be added, edited and deleted.
9. Confirm price fields remain hidden by default and only show when enabled.
10. Confirm actual-photo poster canvas is 3:4, preserves full fish and exports correctly.
11. Confirm no ice, lemon, curry leaves, herbs, sea, waves or boats are introduced by default.
12. Confirm install button triggers the PWA prompt only where supported; iOS shows clear Add to Home Screen instructions.
13. Confirm app runs in standalone mode after install and caches the app shell for offline opening.
14. Confirm WhatsApp file-sharing support is detected; fallback downloads image and opens a prepared message.
15. Confirm backup export/import works and does not silently overwrite data.
16. Confirm no data or photographs are uploaded to a server.

**Final product principle:** It should be so simple that Biju's father can open it from the home-screen icon each morning, see fish photographs, tap the fish available today, add prices only when needed, prepare a clean Malayalam/English message and share the posters to his WhatsApp group with minimal effort.
