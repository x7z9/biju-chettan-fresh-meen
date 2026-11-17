# Biju Fresh Meen — Zero-Backend Upgrade Plan

## Google AI Studio implementation prompt

**Goal:** Upgrade the existing Biju Chettante Fresh Meen application into a more useful, customer-friendly coastal fish availability tool while keeping hosting and running costs at **₹0**. Continue using GitHub Pages as the static host. Do not introduce a paid backend, database server, cloud storage, subscriptions, or services that require a credit card.

> **Core principle:** Make the existing app significantly more useful before attempting to build a large marketplace. Keep the seller's daily workflow simple, help customers make informed decisions, and use downloadable/shareable static data plus WhatsApp instead of a backend.

---

# PART A — INSTRUCTIONS TO GOOGLE AI STUDIO

You are a senior product engineer, frontend architect, UX designer, and QA engineer. You are working on an existing project, not starting a new application.

## 1. Inspect the existing project before changing anything

Repository:

`https://github.com/x7z9/biju-chettan-fresh-meen`

Current GitHub Pages site:

`https://x7z9.github.io/biju-chettan-fresh-meen/`

The application is currently a Vite + React + TypeScript Progressive Web App (PWA), with Tailwind CSS and Lucide icons. It is already organised into modules. Important existing files include:

- `src/App.tsx` — main app state, tabs, data loading and event handlers.
- `src/types.ts` — application data types.
- `src/data/seedCatalog.ts` — default seller settings, fish seed catalogue and asset paths.
- `src/data/translations.ts` — Malayalam and English UI strings.
- `src/db/indexedDb.ts` — IndexedDB persistence, migration, backup and restore.
- `src/components/TodayScreen.tsx` — daily availability and fish cards.
- `src/components/FishCatalogueScreen.tsx` — fish catalogue.
- `src/components/AddEditFishScreen.tsx` — add/edit fish and photos.
- `src/components/PosterStudioModal.tsx` — individual fish poster workflow.
- `src/components/ShareListModal.tsx` — menu, photo batch and text sharing.
- `src/components/MoreScreen.tsx` — settings, history and backup/restore.
- `src/utils/posterRenderer.ts` — 1200 × 1600 (3:4) poster rendering.
- `src/utils/whatsappHelper.ts` — WhatsApp message and native file-sharing helpers.
- `src/hooks/useOnlineStatus.ts` — online/offline state.
- `vite.config.ts` — GitHub Pages base path and PWA configuration.
- `.github/workflows/deploy.yml` — existing GitHub Pages deployment workflow.

The existing IndexedDB database is named `biju_fresh_meen_db`, currently at schema version 2, and stores fish, daily records, poster history, settings and trash. The app already supports Malayalam/English, dark/light themes, local daily records, optional prices, photos, poster creation, WhatsApp sharing, offline use, PWA installation and JSON backup/restore.

### Mandatory codebase rules

1. **Read the full relevant source files before editing.** Do not infer implementation from filenames alone.
2. Preserve the current architecture and existing working features. Refactor only where necessary.
3. Do not replace the app with a new demo, a static mockup, or an unrelated design.
4. Do not remove, rename or silently reset the current IndexedDB database or its stores.
5. Do not overwrite an existing user's saved settings with new defaults. Apply new defaults only for a genuinely fresh installation or through a clearly labelled user-controlled setting.
6. Preserve existing fish records, actual fish photos, daily records, poster history, trash, theme, language and backup compatibility.
7. Keep all routing and assets compatible with the GitHub Pages subpath `/biju-chettan-fresh-meen/`. Do not assume the site is hosted at `/`.
8. Keep the existing GitHub Actions deployment workflow working. Do not introduce Cloud Run or server deployment steps.
9. Implement real functionality for every new button. No decorative or fake buttons.
10. Run the TypeScript check and production build after implementation. Fix all errors before finishing.

---

# PART B — ZERO-COST ARCHITECTURE AND HONEST LIMITS

## 2. Hosting and storage strategy

Use only:

- GitHub Pages for serving the built static frontend.
- GitHub Actions already present in the repository for deployment.
- Browser IndexedDB for seller-side local data.
- Browser localStorage only for small preferences, not large fish images or records.
- Browser Cache API/service worker for offline app assets, following the current PWA approach.
- Native browser features such as Web Share API, download, clipboard, `tel:` links and WhatsApp click-to-chat.
- Static JSON/HTML exports for customer sharing.

Do **not** add or require:

- Supabase, Firebase, Appwrite, MongoDB Atlas, Neon, AWS, Azure, Google Cloud, Cloudflare Workers, hosted APIs or any remote database.
- Paid APIs, paid image hosting, paid authentication, payment gateways or paid analytics.
- An API key, GitHub Personal Access Token or service-role key in frontend code.
- A server process for basic features.

## 3. Explain the data boundary clearly in the UI

This is important and must not be hidden:

- IndexedDB data is stored inside one browser profile on one device.
- A customer opening the public GitHub Pages URL does **not** automatically see the seller's local IndexedDB records.
- A second seller or a second phone does not automatically receive the first seller's updates.
- GitHub Pages is static hosting. The app cannot securely write shared marketplace data to GitHub directly from the browser without an authenticated publishing service.
- Do not claim that stock is live or synchronised across devices unless it actually is.

Use clear, friendly notices such as:

- Malayalam: `ഈ ഫോണിൽ സേവ് ചെയ്തിരിക്കുന്നു` — Saved on this phone.
- Malayalam: `ഉപഭോക്താക്കളുമായി പങ്കിടാൻ ഇന്നത്തെ ലിസ്റ്റ് തയ്യാറാക്കുക` — Prepare today's list to share with customers.
- Malayalam: `അവസാനമായി പുതുക്കിയത്: ...` — Last updated: ...
- Malayalam: `വിൽപ്പനക്കാരനുമായി സ്ഥിരീകരിച്ച ശേഷം മാത്രം ഓർഡർ ഉറപ്പാക്കുക` — Confirm the order with the seller.

---

# PART C — BUILD FEATURES THAT WORK WITHOUT A BACKEND

## 4. Feature 1: Customer-friendly daily snapshot link

This is the most important new feature. Implement a **Share Customer View** action on the existing Today screen and inside the existing Share List modal.

### Required behaviour

1. Seller marks today's available fish using the existing workflow.
2. Seller optionally enters price, price unit, quantity/stock note and a short note.
3. Seller taps `ഉപഭോക്താക്കൾക്കായി പങ്കിടുക` / `Share customer view`.
4. The app generates a compact, read-only customer snapshot using only fields safe for public sharing.
5. The app creates a URL for the existing GitHub Pages app with a compressed payload in the URL fragment (hash), for example:

   `https://x7z9.github.io/biju-chettan-fresh-meen/?view=customer#market=<encoded-data>`

6. Use browser-native compression when available (`CompressionStream` / `DecompressionStream`) and a safe, versioned encoding format. Provide a graceful fallback when compression is not available.
7. Do not send the snapshot data to a server. URL fragments are processed by the browser and are not sent as part of the HTTP request to GitHub Pages.
8. Show a preview before sharing. The seller can choose Malayalam or English customer view.
9. Provide actions:
   - Share link using `navigator.share` when available.
   - Copy link to clipboard.
   - Open WhatsApp with a prepared caption containing the link.
   - Download a compact customer snapshot HTML file as a fallback.
10. Display a warning if the URL becomes too long for reliable messaging. Do not silently create an enormous or broken URL. Offer the downloadable HTML fallback.

### Data allowed in a customer snapshot

- Snapshot schema version.
- Seller's public business display name.
- Seller/owner display name, if configured for public display.
- Public phone number, only if seller enables `showPhoneToCustomers`.
- Locality text.
- Snapshot creation time in local time and an explicit date.
- Fish Malayalam name, English name, pronunciation and optional alias.
- Availability state: `available`, `limited`, `sold_out` or `not_listed`.
- Price and unit only when seller has enabled price sharing for that fish/day.
- Quantity or stock note only if seller explicitly chooses to publish it.
- Public note written by seller.
- A public image URL only if that image is actually hosted as a public static asset. Do not include local IndexedDB `data:` URLs in a share link.
- Seller's WhatsApp contact link when enabled.

Never include internal IndexedDB IDs, trash, customer contact records, private notes, backup metadata, or any non-public field.

### Snapshot validation and expiry

- Add a schema version such as `1` to the public snapshot.
- Validate every decoded property and limit string lengths, fish count, notes and URL payload size.
- Treat any snapshot as untrusted input. Render text with React text nodes; never use `dangerouslySetInnerHTML` for snapshot fields.
- Show the snapshot's own generated date and last-updated time.
- Label old snapshots clearly, e.g. `ഈ ലിസ്റ്റ് 6 മണിക്കൂർ മുമ്പ് തയ്യാറാക്കിയതാണ്`.
- Do not automatically claim that a snapshot is current stock. Customer must contact seller to confirm.
- Provide a `Refresh` / `Create new link` action in seller mode. A shared old link remains a frozen snapshot; it must not mutate when the seller changes today's local list.

### Customer view page

Create a polished read-only customer view within the existing app shell. When `?view=customer` is present:

- Hide seller-management tabs, settings, delete/edit actions and backup tools.
- Show business name, location, published date and last-updated time.
- Show simple fish cards with photo if available, Malayalam name, English name if configured, availability status and price if shared.
- Add search and filters: all, available, limited, sold out.
- Add a prominent `Call seller` button (`tel:`) if public phone sharing is enabled.
- Add a `WhatsApp enquiry` button with pre-filled fish name and optional quantity request via `https://wa.me/<digits>?text=<encoded-message>`.
- Message must say that the customer is enquiring, not that an order is confirmed.
- Add clear notice: `Stock and prices may change. Please confirm with the seller before travelling.`
- Make the page fast, light, Malayalam-first and readable on low-cost phones.
- If the URL is missing, invalid or corrupted, show a friendly error and link back to the main app. Never crash.

### Customer snapshot privacy

A snapshot link is public to anyone who receives it. Explain this before the first share. Let the seller choose whether to include phone number, price, quantity and notes. Do not embed private data.

---

## 5. Feature 2: Downloadable customer update (works offline)

Add `Download customer update` as an offline-friendly fallback.

Generate a standalone `.html` file containing:

- A responsive customer page.
- Embedded safe snapshot JSON.
- Embedded thumbnails only when the seller specifically selects photos to include and the total file size remains under a sensible limit (target 3 MB; hard warning above 5 MB).
- No remote scripts, no API calls and no unsafe HTML injection.
- Business contact and generated timestamp when public sharing is enabled.

The file should open locally in Android Chrome and desktop browsers. It should display the fish list and an enquiry/call option. If WhatsApp cannot open from a local file, show the phone number as plain text.

Offer native sharing with `navigator.share({ files: [...] })` if supported; otherwise download the file and explain how to attach it to WhatsApp. Never claim it has been sent automatically.

---

## 6. Feature 3: Customer enquiry through WhatsApp

Make customer enquiries easier without pretending to have an online order backend.

### On customer view

Add per-fish actions:

- `വില ചോദിക്കുക` / Ask price.
- `ലഭ്യത ചോദിക്കുക` / Check availability.
- `ഓർഡർ ചോദിക്കുക` / Enquire about ordering.

Each button opens a WhatsApp chat to the seller using the public phone number and pre-fills a short message, for example:

`നമസ്കാരം, ഇന്നത്തെ ലിസ്റ്റിൽ കണ്ട അയല ലഭ്യമാണോ? 1 kg വേണം. വിലയും ലഭ്യതയും അറിയിക്കാമോ?`

The customer can edit and send the message. Do not send messages automatically.

### Seller-side local enquiry notebook

Add a lightweight optional local notebook for a seller to record enquiries they handle by phone or WhatsApp:

- Date/time.
- Customer name or a short reference (optional).
- Contact number (optional; avoid collecting unless needed).
- Fish requested.
- Quantity requested.
- Status: new, replied, confirmed, fulfilled, cancelled.
- Short note.

This notebook is stored only in local IndexedDB and must be included in full backup/restore. Add delete/export controls and a privacy notice. Do not collect address, ID, payment credentials or sensitive personal details. Do not imply that this is a central customer order system.

---

## 7. Feature 4: Better availability and price controls

The existing daily entry already supports an available boolean, note, optional price amount and price unit. Extend it carefully without breaking old records.

### Daily fish status

Support these states:

- `available` — ലഭ്യമാണ്.
- `limited` — പരിമിതമായ അളവിൽ ലഭ്യമാണ്.
- `sold_out` — തീർന്നു.
- `not_listed` — ഇന്ന് ലിസ്റ്റ് ചെയ്തിട്ടില്ല.

Keep the existing simple availability toggle accessible. Add a compact status selector in the details drawer so the seller can choose more precise states. Existing records with `available: true` migrate to `available`; false or missing values should be interpreted conservatively and not automatically published as `sold_out`.

### Additional optional fields

- Price amount.
- Price unit: per kg, per piece, per packet (reuse existing type where possible).
- Quantity/stock note (free text first; do not invent precision).
- Size/grade note (small, medium, large or seller text).
- Source/landing place (seller-entered free text, optional).
- Public customer note.
- Private seller note (never included in public snapshot).
- Entry updated timestamp.

Separate **public note** and **private seller note**. Do not accidentally publish internal notes.

### Stale availability handling

- Keep each entry's `updatedAt`.
- Display age of update: just updated, minutes ago, hours ago, older listing.
- At the next local date, create a fresh daily record as the current app already does.
- Never carry yesterday's availability into today's customer snapshot automatically.
- Add a clear `Today` / date label to every availability screen.

### Price transparency

- Add a per-day master toggle and per-fish price sharing control.
- If no price has been entered, do not show ₹0 or a blank price.
- Never infer price from previous days.
- Always show unit: `₹___ / kg`, `₹___ / piece`, etc.
- Allow seller to mark price as `Call to confirm` instead of sharing a numeric price.

---

## 8. Feature 5: Daily seller workflow — fewer taps

The seller may be using a phone while busy. Prioritise a fast workflow over complex administration.

Improve the Today screen with:

1. A date banner and `last saved` indicator.
2. Counts for available, limited and sold out.
3. Search by Malayalam name, English name, alias and pronunciation.
4. Quick filters: all, available, limited, sold out.
5. A large, accessible one-tap status control on each fish card.
6. A clear `Add today's photo` action that is easy to reach.
7. Quick price entry with unit selection.
8. Optional short customer-facing note.
9. One-tap `Create customer link`.
10. Existing `Share today's photos` flow retained.
11. One-tap `Copy today's message`.
12. Confirm when no fish are marked available before generating a customer update.

Do not require a seller to fill in all fields. The minimum publishing workflow should be: select availability, preview, share.

---

## 9. Feature 6: Fish catalogue that helps customers identify local names

Improve the existing catalogue without asserting uncertain species identifications.

For each fish/seafood entry support:

- Malayalam market name.
- Malayalam pronunciation written in English letters.
- English/common name when known.
- Local aliases.
- Scientific name only when verified.
- Identification confidence: confirmed, probable, needs local confirmation.
- Actual photos supplied by seller.
- Short identification features.
- Note explaining when a local market name may refer to more than one species.

Important local naming rules:

- Preserve the seller's Malayalam spelling exactly when entered.
- Do not silently replace a local market name with a guessed scientific species.
- Keep local Malayalam names as the primary display label.
- Provide an easy edit/correction action.
- Do not use AI to invent a species from a photo or claim certainty without reliable evidence.

Keep the current catalogue seed and user-created additions. Do not delete the current seed fish.

---

## 10. Feature 7: Customer discovery and customer usefulness

The customer view should solve real coastal-area customer problems while remaining static and free.

Include:

- Readable list of today's shared availability.
- Fish search by Malayalam and English names.
- Price and unit when shared.
- Status and timestamp.
- Call/WhatsApp enquiry.
- Location text and an optional `Open directions` link to a map search URL only when seller enables it.
- Clear note to confirm availability before travelling.
- A printable/saveable customer list.
- A simple fish-name glossary with Malayalam name, pronunciation and English name.

Do not create fake live seller listings. Do not seed random sellers or imaginary reviews. The customer view displays only the snapshot that was intentionally shared by a seller.

### Optional multi-seller directory (static/manual only)

If you add a directory, make it explicitly a manually maintained static directory from a repository JSON file. Each seller must be added by the site maintainer, not self-registered by writing to a server. Show the directory's `last updated` date and explain that sellers and stock must be contacted for confirmation.

Do not suggest that this directory is a live marketplace. Keep this feature secondary to Biju's own working flow.

---

# PART D — BUSINESS SETTINGS AND BRANDING

## 11. Update Biju's default profile carefully

Use these values as defaults only for new installations. If an existing installation already has settings saved in IndexedDB, preserve the saved values and let the user edit them in Settings.

| Field | Default |
|---|---|
| Business name (Malayalam) | ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ |
| Business name (English) | Biju Chettante Fresh Fish |
| WhatsApp group name (Malayalam) | ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി |
| WhatsApp group name (English) | Biju Chettante Fresh Meen Vandi |
| Owner display name | Biju R |
| Phone display | +91 95444 33018 |
| Phone digits for WhatsApp | 919544433018 |
| Location (Malayalam) | ഒച്ചിറ – തെക്കു കൊച്ചുമുറി, കൃഷ്ണപുരം |
| Location (English) | Oachira – Thekku Kochumuri, Krishnapuram, Kerala, India |
| Poster language | Malayalam |
| Poster background | Banana Leaf |

Add editable settings:

- Owner display name.
- Public phone display.
- Public phone/WhatsApp visibility toggle.
- Customer snapshot defaults (include price, quantity, note).
- Map/directions link (optional).
- Default poster language.
- Default poster background.
- Disclaimer visibility and text.

Make sure `ownerName` is actually editable; it already exists in the `BusinessSettings` type but should be surfaced in the settings form if it is not currently exposed.

Use accurate Malayalam spelling. Prefer `ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ` as the brand and `ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി` as the group/business vehicle name. Keep brand and WhatsApp group fields distinct.

---

# PART E — POSTERS AND WHATSAPP

## 12. Preserve and improve poster generation

Keep the current 3:4, 1200 × 1600 poster renderer and the existing poster studio.

Requirements:

- Original user-uploaded fish photo remains the primary image.
- Improve clarity, brightness and crop controls without changing the fish species or inventing details.
- Allow blue tray and green banana leaf backgrounds.
- Malayalam heading should be editable.
- Fish name spelling must be exactly the saved catalogue name unless user edits it.
- Allow a poster to show only the fish name when the seller chooses that template.
- Optional `ഇന്നത്തെ മീൻ` heading.
- Optional owner, brand, phone and location footer for promotional templates.
- Optional price and unit; only if user explicitly enables it.
- Optional creative disclaimer; configurable and off/on by user.
- Do not force extra promotional wording into a minimal fish-name poster.
- Do not automatically add lemons, curry leaves, herbs, vegetables, cooking props, unrelated seafood, ice or sea scenery. The selected design should match the seller's background setting.
- Keep a high-resolution download and preview.

## 13. Preserve WhatsApp sharing behaviour

Keep the current options:

- Daily menu card.
- Individual fish photos.
- Batch photo sharing.
- Text-only message.
- Copy caption.
- Open WhatsApp fallback.

Improve the Malayalam message format. Example:

```text
🐟 ഇന്നത്തെ മീനുകൾ ലഭ്യമാണ്!

📍 ഒച്ചിറ – തെക്കു കൊച്ചുമുറി, കൃഷ്ണപുരം

📞 വില അറിയാൻ വിളിക്കുക:
ബിജു R – +91 95444 33018

🚚 ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ വണ്ടി
```

Do not hard-code the example text into every seller's account. Build it from the editable settings and daily list.

WhatsApp rules:

- Only open WhatsApp or invoke native sharing after a real user tap.
- Do not claim a message was delivered or posted to a group.
- The user must choose the WhatsApp conversation/group and press Send.
- Keep the fallback for devices that cannot share multiple images directly.

---

# PART F — DATA SAFETY, MIGRATION AND BACKUP

## 14. IndexedDB migration

If new fields are required, update `src/types.ts` and `src/db/indexedDb.ts` using a safe schema migration.

- Increment IndexedDB version only when the schema needs it.
- Do not delete existing object stores.
- Add new object stores only when required (for example, a local enquiry notebook).
- Add safe defaults when reading older records.
- Preserve the current seed-catalog merge behaviour.
- Do not overwrite custom photos or actual fish photographs.
- Update backup schema and validation.
- Ensure old version-2 backups can still be restored.
- Add tests or a test harness for migration from the current schema.

## 15. Backup improvements

Retain the existing full JSON backup/restore. Improve it by:

- Clearly showing backup creation date and estimated size.
- Exporting all seller settings, fish, local photos, daily records, poster history, trash and local enquiry notebook.
- Validating imported JSON before writing anything.
- Showing a preview before restore.
- Providing a clear warning that restoring replaces current local data.
- Never upload a backup to any server.
- Add a reminder message to export a backup periodically.
- Offer a catalogue-only export separately from full backup.

Add a `Download today's customer snapshot` action that is separate from the full private backup. Do not accidentally put private settings, trash or local enquiries into the public snapshot.

---

# PART G — DESIGN AND ACCESSIBILITY

## 16. UI design principles

The app is mainly used on Android phones and must feel like a small, practical mobile app—not a complicated desktop dashboard squeezed onto a phone.

Design priorities:

- Malayalam-first by default.
- Language switch to English remains accessible.
- Keep the current simple top header and bottom navigation pattern.
- Large touch targets: ideally 44–48 px minimum.
- Short Malayalam labels and familiar icons.
- Clear status colours, but never use colour alone to communicate status.
- High contrast in light and dark mode.
- Avoid tiny text, dense tables and excessive cards.
- No horizontal overflow at 320 px viewport width.
- Use safe area insets on modern phones.
- Forms should fit the screen and keyboard should not cover the active field.
- Add loading, empty, error, success and offline states.
- Add an undo option for accidental availability changes where practical.
- Add accessible labels and keyboard focus states.

Use Noto Sans Malayalam / Manjari with safe system fallbacks. Do not rely on a Malayalam font being locally installed without a fallback.

## 17. Customer view visual style

The customer page must be lighter and simpler than the seller interface:

- Brand and seller location at the top.
- Date and last update clearly visible.
- A simple search field.
- Four compact filters.
- Large fish photographs with readable Malayalam names.
- Availability and price displayed prominently.
- Sticky but unobtrusive call/WhatsApp contact actions.
- A compact freshness/confirmation note.
- No seller editing tools.

Avoid intrusive advertisements, popups, fake testimonials, fake live counters and unnecessary animations.

---

# PART H — OPTIONAL ZERO-COST FEATURES

## 18. Prioritise these only after the core features work

### A. Voice input

Allow optional browser speech recognition for fish search and short notes. Treat this as an enhancement only: browser language support varies, and the app must work without it. Never require voice input.

### B. Text-to-speech

Optional Malayalam read-aloud for customer availability. Use browser speech synthesis when a Malayalam voice exists; provide graceful fallback when unavailable.

### C. Local customer message templates

Provide editable Malayalam message templates:

- Today's stock available.
- Limited quantity.
- Sold out.
- Harbour supply low / fish not available today.
- Tomorrow's availability update.
- Order confirmation (seller manually sends this after confirming).

Do not automatically send them.

### D. QR code

Provide a QR code for the stable public app URL or WhatsApp chat link. Do not generate a QR code for a private local IndexedDB record. A QR for a daily customer snapshot should encode the exact share link and show its generated date.

### E. Install and offline help

Improve the PWA install instructions for Android Chrome and explain that offline seller data stays on the device. If browser storage is cleared or the user changes device/browser, restore from backup.

---

# PART I — IMPLEMENTATION ORDER

## 19. Work in phases; do not try to ship everything at once

### Phase 0 — Safety baseline

- Inspect all source files and current behaviour.
- Verify current GitHub Pages deployment path.
- Add a migration-safe backup test.
- Create a clear change plan.
- Do not modify data until a backup/export path is verified.

### Phase 1 — Improve the existing Biju seller app

- Editable owner name and public contact settings.
- More precise locality defaults for new installations.
- Better status states: available, limited, sold out, not listed.
- Separate public and private notes.
- Timestamps and stale listing labels.
- Better customer message generation.
- Keep poster and WhatsApp workflow working.
- Backup and restore compatibility.

### Phase 2 — Customer snapshot, no backend

- Versioned customer snapshot schema.
- URL fragment encode/decode and compression.
- Customer read-only route/view.
- Preview, copy link, native share and WhatsApp caption.
- Standalone HTML download fallback.
- Payload size, malformed data and stale snapshot handling.
- Customer enquiry via WhatsApp click-to-chat.

### Phase 3 — Local seller operations

- Local enquiry notebook.
- Quick daily workflow refinements.
- Customer message templates.
- Optional QR and voice tools.

### Phase 4 — Static regional information

- Fish-name glossary and local aliases.
- Optional manually maintained seller directory from a repository JSON file.
- Clear `directory last updated` date.
- No fake real-time stock data.

Do not start Phase 3 or 4 until Phases 1 and 2 build and work correctly.

---

# PART J — TESTING AND ACCEPTANCE CRITERIA

## 20. Required test scenarios

Test on mobile viewport sizes and desktop. At minimum test 320 px, 360 px, 390 px and 430 px phone widths.

### Existing functionality regression

- App loads at the GitHub Pages project subpath.
- Malayalam/English switch works and persists.
- Light/dark theme works and persists.
- Existing fish catalogue loads.
- Add/edit/delete/restore fish works.
- Actual fish images persist after reload.
- Toggle availability and save daily records.
- Optional price and unit work.
- Poster generation works in both backgrounds.
- Download poster works.
- Share selected photos and text works with native/fallback paths.
- Backup/restore round-trip works.
- Offline app shell loads and local records remain accessible.

### Customer snapshot tests

- Create a snapshot with 1, 5 and 30 fish.
- Verify Malayalam text survives encode/decode exactly.
- Verify prices/units and statuses are correct.
- Verify phone inclusion toggle works.
- Verify private notes are never included.
- Verify local `data:` photos are never embedded into the URL payload.
- Verify malformed or edited payload does not crash the app.
- Verify oversized payload produces a useful warning and HTML download fallback.
- Verify old snapshots show their original date and stale warning.
- Verify new seller changes do not mutate an old snapshot.
- Verify customer enquiry opens the correct WhatsApp number with an editable pre-filled message.
- Verify customer view cannot edit seller data.

### Data migration tests

- Start with a version-2 database containing fish, images, daily records, poster history, settings and trash.
- Upgrade to the new version.
- Confirm every old record and photo is still present.
- Import an old version-2 backup and verify migration.
- Export a new full backup and restore it.
- Confirm public snapshots contain no private local data.

### Deployment checks

- `npm run lint` passes.
- `npm run build` passes.
- GitHub Pages base path is correct.
- All images and assets load under the project subpath.
- Service worker updates correctly and old caches are cleaned safely.
- No secrets or API keys are exposed in generated assets.

---

# PART K — REQUIRED DELIVERABLES FROM GOOGLE AI STUDIO

## 21. At the end, provide

1. The complete modified source code, not snippets only.
2. A concise list of files changed and why.
3. A clear statement of which features work fully offline.
4. A clear explanation of the customer snapshot link and what information it contains.
5. Exact GitHub Pages deployment instructions using the existing workflow.
6. A test report showing `npm run lint` and `npm run build` results.
7. A data migration and backup safety report.
8. A list of limitations that remain because the app has no backend.

Do not say that multi-device sync, global live stock, customer accounts, push notifications, online payment or automatic order storage is implemented. Those require a shared server/backend or an external service and are out of scope for this zero-cost release.

---

# FINAL PRODUCT VISION

Build a practical, free, offline-first fish availability tool that:

- Helps Biju update today's fish availability and create attractive fish posters quickly.
- Helps customers understand what is available, what it costs (when price is shared), when the list was updated and how to contact the seller.
- Reduces unnecessary travel by making availability and update time visible.
- Makes it easy to ask about a fish through WhatsApp.
- Preserves seller data even when the internet is unavailable.
- Runs on GitHub Pages without a paid backend.
- Is honest about the difference between a frozen shared snapshot and live stock.

**Build for the real coastal-market workflow: simple for sellers, clear for customers, Malayalam-first, low-data, mobile-first, and free to host.**
