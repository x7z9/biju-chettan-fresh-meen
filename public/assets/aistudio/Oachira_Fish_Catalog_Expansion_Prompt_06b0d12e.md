# Vibe-Coding Prompt: Safely Expand the Oachira Fresh-Fish Catalogue

> **Primary goal:** Add only genuinely missing Kerala coastal fish entries, accurate Malayalam names, useful species details, and realistic 3:4 fish images to my existing website. Preserve every existing fish photo, description, record, page, and feature exactly as it is.

## 1. Your role

Act as a senior full-stack engineer, Kerala marine-fish research assistant, Malayalam proofreader, and realistic fish-image art director. Work inside the existing website and follow its current framework, data model, components, design system, file conventions, and deployment setup. Do not rebuild the website or introduce a second catalogue system.

My business serves customers around **Oachira, Krishnapuram, and the Alappad–Azhikkal coastal area of Kollam, Kerala**. The catalogue must prioritise names actually used by local fish sellers and customers in this region. Scientific English names are for accurate identification and supporting details; the Malayalam market name is the customer-facing name.

## 2. Non-destructive rule — highest priority

**Do not disturb existing fish photos or their details.** Before making any change:

1. Inspect the existing website, its source code, current fish catalogue, image assets, database/CMS records, and the way fish cards/details are displayed.
2. Build an inventory of every current fish entry, including Malayalam names, English names, scientific names (where present), aliases, photos, image paths, descriptions, and metadata.
3. Compare the proposed fish against this inventory before generating or adding anything.
4. If an existing entry already represents the same fish/species and its photo/details are already present, **skip it completely**. Do not replace its image, rewrite its name, change its details, regenerate its photo, or create a second record under a spelling variant.
5. Treat Malayalam spelling variants, transliterations, English common names, and scientific synonyms as possible duplicate clues. Confirm taxonomic identity before deciding whether two differently named entries are the same fish.
6. If the match is uncertain, do not create a duplicate and do not overwrite anything. Put it in a `needs_review` report for manual confirmation.
7. Add only missing records and their new assets. Use the current website's existing data structure and visual components.

### Prohibited changes

- Do not delete, overwrite, rename, move, compress destructively, recolour, crop, regenerate, or otherwise alter any existing fish image or its source file.
- Do not edit existing fish names, descriptions, prices, availability, dates, IDs, URLs, metadata, or database records.
- Do not redesign existing pages, navigation, header/footer, themes, CSS, layout, authentication, APIs, checkout, contact details, or unrelated features.
- Do not migrate or replace the database, change frameworks, or refactor unrelated code.
- Do not remove or replace any existing content to make room for new entries.

If a code or data change is essential, make the smallest additive change possible. Keep a clear change log. If Git is available, create a branch or checkpoint before editing. Never run destructive database commands.

## 3. Research sources — use these real reference websites

Use the following sources to verify species identity, scientific names, Malayalam/vernacular names, morphology, and reference imagery. Open the actual pages and inspect the content; do not rely only on search snippets. Record the source URL and access date for every new fish entry.

### Primary Kerala / Indian fisheries and research sources

1. **ICAR–Central Marine Fisheries Research Institute (CMFRI): Scientific, common and vernacular names of commercially important Kerala fishes**  
   https://eprints.cmfri.org.in/3635/  
   Use this as a key source for Kerala vernacular names matched to scientific and English names.

2. **ICAR–CMFRI: Carangids of Indian Seas — Illustrated Pocket Guide for Field Identification**  
   https://eprints.cmfri.org.in/13839/  
   Use for scads, trevallies, jacks and related fish. It contains illustrated identification information and explains why similar carangids can be misidentified.

3. **ICAR–CMFRI: FishFinder App**  
   https://eprints.cmfri.org.in/11740/  
   A fish-identification resource with field photographs for reef fishes from Indian coasts. Use as an identification/reference lead; check current availability and terms before using any assets.

4. **ICAR–CMFRI: Field Guide on Reef Associated Fishes of India**  
   https://eprints.cmfri.org.in/10163/  
   Use for fish identification and comparison with photographs collected around Indian harbours and coastal waters.

5. **Kerala Fisheries Department: Cultivable species of brackish-water fishes and molluscs**  
   https://fisheries.kerala.gov.in/en/cultivable-species-brackish-water-fishes-and-molluscs  
   Use for state-level verification of species such as karimeen, poomeen, sea bass, mullets, crabs and shellfish. This is not a complete marine market-fish list.

6. **Government of Kerala: Kerala Marine Fisheries Statistics 2015**  
   https://www.fisheries.kerala.gov.in/sites/default/files/2018-08/marine_2015.pdf  
   Use for official species groups and marine fisheries terminology. Do not treat this older statistical publication as proof of current daily availability.

7. **Checklist of Fishes of Kerala, India — Journal of Threatened Taxa**  
   https://www.threatenedtaxa.org/index.php/JoTT/article/view/2004  
   Use for scientific taxonomy and the Kerala fish checklist; it covers freshwater, brackish-water and marine fishes, so filter carefully for marine/coastal relevance.

### Species photographs and identification details

8. **FishBase — global fish species reference**  
   https://www.fishbase.org/  
   Use its species pages for photographs, accepted scientific names, common English names, distribution and diagnostic descriptions. Verify that the species occurs in Indian waters and check the photographer/licensing information for each image.

Useful starting species pages:

- Indian oil sardine (*Sardinella longiceps*): https://www.fishbase.org/summary/1511
- Indian mackerel (*Rastrelliger kanagurta*): https://www.fishbase.org/summary/111
- Fringescale sardinella (*Sardinella fimbriata*): https://www.fishbase.org/summary/Sardinella_fimbriata.html
- Indian scad (*Decapterus russelli*): https://fishbase.org/summary/Decapterus-russelli.html
- Bigeye scad (*Selar crumenophthalmus*): https://fishbase.org/summary/387
- Yellowfin tuna (*Thunnus albacares*): https://www.fishbase.org/summary/Thunnus_albacares.html
- Narrow-barred Spanish mackerel (*Scomberomorus commerson*): https://www.fishbase.org/summary/121
- Japanese threadfin bream (*Nemipterus japonicus*): https://www.fishbase.org/summary/4559
- Silver pomfret (*Pampus argenteus*): https://www.fishbase.org/summary/Pampus-argenteus
- Pearlspot (*Etroplus suratensis*): https://www.fishbase.org/summary/4681
- Black pomfret (*Parastromateus niger*): https://fishbase.org/summary/1947
- Asian seabass (*Lates calcarifer*): https://www.fishbase.org/summary/Lates-calcarifer

9. **Onmanorama: Fish names in Malayalam and English — Kerala market-name guide**  
   https://www.onmanorama.com/food/features/2024/11/12/malaylam-english-kerala-fish-names.amp.html  
   Use as a secondary guide to familiar Kerala market names, not as the sole authority for scientific identification or Oachira-specific pronunciation.

### Source-use and copyright rules

- Prefer official CMFRI, Kerala Fisheries Department, peer-reviewed/academic sources, and clearly licensed photographs.
- Reference photographs are for identification and visual guidance. **Do not download, copy, hotlink, or republish a copyrighted photograph unless its licence explicitly permits that use.**
- When an image has a Creative Commons or other reuse licence, store the original source URL, creator/photographer, licence name, and required attribution with the asset.
- If reuse permission is unclear, do not use the source image in the website. Use it only as a visual reference to create a new, original image, or use a photo supplied by me.
- Never remove watermarks or copyright notices.
- Do not use random social-media images as scientific proof. Reels/videos can provide clues about local trade names, but cross-check the species with CMFRI/FishBase or another scientific source.

## 4. Malayalam spelling and Oachira market-name rules

The customer-facing name must be written in Malayalam script, correctly spelled and proofread before publishing. Preserve the actual Oachira/Krishnapuram/Alappad market wording when it is confirmed by me or by reliable local evidence. Do not invent an “Oachira pronunciation” or claim a local term is universal across Kerala.

Use this workflow for every name:

1. Collect the Malayalam market name exactly as supplied by me or found in a relevant regional source.
2. Check its spelling against CMFRI vernacular-name references and credible Kerala-language usage.
3. Check the English/common name and scientific identity independently.
4. Compare the fish's actual body shape, head, eye, mouth, fins, lateral line, scales, tail and markings against identification photographs.
5. If the local name maps to multiple species, keep the Malayalam trade name but do not invent one scientific name. Mark the scientific identification as `unconfirmed` until resolved.
6. If two local names mean the same species, store one canonical fish record and place the second confirmed name in its aliases. Do not create duplicate cards or images.
7. Ask for my confirmation before publishing a questionable local spelling or species mapping.

### Seed names from my Oachira-area market notes

These are starting points to research, not permission to assume every scientific identity:

| Malayalam market label | Initial research note | Required action |
|---|---|---|
| മത്തി | Kerala oil sardine trade name is commonly used | Verify whether the particular photo is *Sardinella longiceps* or another sardine |
| ചാള | A broader sardine-market term in Kerala | Do not automatically merge every chala with oil sardine |
| കൊച്ചു മത്തി | Often a size/market description of small mathi | Treat as a possible size alias of മത്തി, not a separate species, unless evidence shows otherwise |
| അയല | Common Kerala name for Indian mackerel | Verify against *Rastrelliger kanagurta* |
| കരിചാള | Spelling to check carefully; commonly given for fringescale sardinella | Check against *Sardinella fimbriata* and local Oachira usage |
| മങ്കട | Local market label from my notes | Keep scientific identity unconfirmed until a reliable local match/photo confirms it |
| കണ്ണൻ കോഴിയാള | A Kerala market name reported for Bigeye scad in a regional guide | Check the fish photo against *Selar crumenophthalmus*; do not confuse with Indian scad (*Decapterus russelli*) |
| കണ്ണൻ അയല | Alternative wording heard in my market context | Do not silently replace it; ask me whether this is the same fish locally called കണ്ണൻ കോഴിയാള |
| കേര ചൂര | Kerala market name reported for Yellowfin tuna | Verify against *Thunnus albacares* before assigning the scientific name |
| ചൂര | General tuna-market name | Do not assume every choora is Yellowfin tuna |
| നെയ്മീൻ / അയക്കൂറ | Seer-fish market names | Treat as a group until exact species is visible and confirmed |
| ആവോലി | Pomfret market name | Determine silver/black/other pomfret before choosing a scientific species |
| ചെമ്പല്ലി | Snapper market label | Confirm exact snapper species from the fish photo |
| കരിമീൻ | Pearlspot | Verify against *Etroplus suratensis* |
| കിളിമീൻ | Kerala market label commonly used for pink perch/threadfin bream types | Confirm exact species; do not assume all kili meen are one species |
| നത്തോലി / കൊഴുവ | Anchovy-market names | Identify genus/species only when the photo supports it |
| കാളാഞ്ചി | Sea bass market name | Verify against *Lates calcarifer* where applicable |
| പൂമീൻ | Milkfish | Verify against *Chanos chanos* |
| വാള | Ribbonfish market name | Use a species-level name only when identifiable |
| വറ്റ / പാറ | Trevally/jack-type market names | Check with the CMFRI Carangids guide; do not treat them as exact synonyms without evidence |

### Additional candidate fish to research

Research these only when the fish is relevant to the Kerala coast and the website does not already have the same fish:

- നെത്തോലി / കൊഴുവ — anchovies
- നെയ്മീൻ / അയക്കൂറ — seer fishes
- ആവോലി — pomfrets
- ചെമ്പല്ലി — snappers
- കിളിമീൻ — threadfin bream / pink perch market group
- കാളാഞ്ചി — Asian seabass
- വറ്റ / പാറ — trevallies and jacks
- കോര — croakers
- ശീലാവ് — barracuda
- വാള — ribbonfish
- മാന്തൾ / നങ്ങ് — solefishes
- പൂമീൻ — milkfish
- വരാൽ / ബ്രാൽ — snakeheads (include only if the website sells freshwater fish too)

Do not bulk-add the candidate list automatically. Research, check the current catalogue, identify the exact fish, and add only entries that are genuinely missing and locally relevant.

## 5. Image design specification — apply to every new fish image

Create one separate, original image for each genuinely new fish entry. Use a **portrait 3:4 aspect ratio** (for example, 1024 × 1365 px or the image tool's closest supported 3:4 size). Keep the existing website's image dimensions and file format if it has an established standard; do not change existing images.

### Composition and appearance

- Photorealistic, high-clarity seafood/fish photography, not cartoon, painting, 3D toy, poster collage or AI fantasy art.
- Show one fish species only, with the full fish visible and correctly proportioned; for a naturally sold group of small fish, show a realistic group of that same species only.
- Set the fish on a **fresh, clean green banana leaf**. The leaf should be a simple natural background with visible veins and gentle tonal variation, not a decorative food arrangement.
- Use soft natural daylight, balanced exposure, realistic white balance, subtle contrast, crisp scales and texture, and especially **sharp, clearly visible eyes**.
- Preserve correct species-specific anatomy: head shape, eye size and position, mouth, gill plate, fins, finlets, tail shape, lateral line, markings and body proportions.
- Show natural fresh-caught appearance and realistic moist skin. Avoid over-saturation, plastic-looking shine, excessive sharpening, fake metallic scales or unnatural colour changes.
- Centre the fish with enough margin so no head, tail or fin is cut off. Ensure the image still reads clearly at mobile-screen size.
- The image must look like a real freshly caught fish from a Kerala coastal market, not a frozen supermarket product.

### Strictly forbidden image additions

- **No ice, crushed ice, ice cubes, frost, freezer effects or frozen-fish styling.**
- No lemon, lime, curry leaves, herbs, coriander, spices, chilli, garnish, cooked food, plates, baskets, nets, boats, extra fish species, prawns, price tags or unrelated props.
- No water splashes, decorative droplets, fake ocean waves, artificial glows, badges, logos, phone numbers, slogans or marketing copy.
- Do not invent or alter fish anatomy, add missing fins, change the fish species, or replace my uploaded real fish with a different species.

### Text on the generated fish image

Use Malayalam only. The only permitted visible text is:

- Small heading: **ഇന്നത്തെ മീൻ**
- Main large fish name: **{{MALAYALAM_FISH_NAME}}**

If the existing website's established fish-photo style uses only the fish name, preserve that exact existing style and show only **{{MALAYALAM_FISH_NAME}}**. Do not add English, transliteration, scientific name, price, description, business name, phone number, date, extra slogan or any other text on the image.

Malayalam typography must be accurate and readable, with correct chillus, vowel signs, conjuncts and spacing. Use a clean, attractive Malayalam font already available in the website or a properly licensed font. Never let image generation guess a complicated Malayalam spelling without a final text check. For reliable spelling, create the fish photograph first and render the Malayalam text as a separate text layer in the website/image-composition pipeline using a real Malayalam font; inspect the final output for glyph errors.

## 6. Fish details to store in the website

Follow the existing website's data model and detail-card design. Add only fields that fit the current architecture; do not redesign the page. For each new fish, store as much of the following as can be verified:

- Canonical Malayalam display name.
- Confirmed Oachira/Alappad/Krishnapuram aliases and pronunciation (mark unverified aliases clearly).
- English common/trade name.
- Accepted scientific name and family, only if identification is reliable.
- Short, plain-language identification features useful to customers and sellers.
- Relevant habitat/distribution summary based on trustworthy sources.
- Image asset path and image-generation/reference method.
- Reference URLs, source title, access date, image creator/licence/attribution (where a source image is reused).
- Identification confidence: `confirmed`, `probable`, or `needs_local_confirmation`.
- Any ambiguity warning where a market name can refer to more than one species.

Do not invent health benefits, nutrition claims, catch location, catch date, freshness guarantees, prices, weights, stock or availability. These are operational details and must come from me or the website's existing verified data.

## 7. Duplicate detection — implement before creating any new content

For each candidate, compare against all existing records using:

1. Normalised Malayalam name (Unicode NFC; remove only non-semantic spacing/punctuation for comparison).
2. Known Malayalam aliases and Romanised aliases.
3. English common name and accepted scientific name.
4. Scientific synonyms and known taxonomic changes.
5. Existing image similarity, perceptual hash or visual embedding if available.
6. Existing fish descriptions and identifying characteristics.

### Skip decision

- If the same species/fish already exists with an existing photo and details: **SKIP; make zero edits to it**.
- If the same fish exists under another confirmed local name: treat the new name as an alias only if the current site supports safe alias metadata; otherwise skip and report the alias. Do not create a second fish card.
- If the same Malayalam market name appears but the scientific identity differs or is uncertain: do not merge automatically; send it to `needs_review`.
- If the photo looks similar but the identity is uncertain: do not replace or overwrite; flag it.
- If a fish is genuinely absent: generate its new image and append its new record following the website's current pattern.

Maintain an explicit audit list with one status per candidate: `ADDED`, `SKIPPED_EXISTING`, or `NEEDS_REVIEW`, plus a short reason and the matching existing record ID/path when applicable.

## 8. Implementation sequence

1. Inspect and document the current website structure and fish catalogue.
2. Build the duplicate inventory before generating images.
3. Research each candidate using the reference sources above and cross-check the Malayalam spelling.
4. Create a research table with local name, English name, scientific name (if confirmed), source links, image-reference link/licence, confidence, and duplicate status.
5. Generate images only for entries marked genuinely missing and sufficiently identified.
6. Proofread Malayalam text independently before adding it to the image or page.
7. Add only the new image assets and fish records, reusing existing card/detail components.
8. Verify the new cards and images on desktop and mobile, especially the 3:4 ratio, safe margins, fish visibility, Malayalam font rendering and loading behaviour.
9. Confirm that every original photo, fish detail, URL, ID, existing entry, route and page is unchanged.
10. Produce a final audit report listing new additions, skipped duplicates and unresolved local names.

## 9. Required final report

At the end, provide:

- Number of existing fish records inspected.
- Number of candidates researched.
- Number of new fish records and images added.
- Number skipped because the same fish/photo/details already existed.
- Names needing local confirmation, with the exact question that needs my answer.
- Source links used for species identification and Malayalam spelling.
- Image source/licence notes for any reused source images; otherwise state that new original images were generated from references.
- Confirmation that no existing fish photo, fish detail, record, route, page, layout or unrelated feature was modified.
- A list of all changed/new file paths and database records.

## 10. Acceptance checklist — all must pass

- [ ] Existing website and its current design remain intact.
- [ ] Existing fish photos and details remain byte-for-byte or record-for-record unchanged.
- [ ] Every candidate was checked against the current catalogue before image generation.
- [ ] Existing matching fish were skipped, not replaced or duplicated.
- [ ] New entries are relevant to Kerala coastal/Oachira-area trade or clearly marked as broader Kerala candidates.
- [ ] Malayalam spelling has been checked against trustworthy sources and local confirmation where needed.
- [ ] Scientific names are included only when the photo and references support the identification.
- [ ] Every new fish image is photorealistic, portrait 3:4, on a simple green banana leaf background, with sharp eyes and natural colour.
- [ ] No ice, lemon, curry leaves, herbs, food garnish, frozen appearance, extra fish species, logos or unwanted text appear.
- [ ] Image text contains only the permitted Malayalam heading/name, or only the name if that matches the existing site style.
- [ ] Original-image copyright and attribution rules are respected.
- [ ] Mobile and desktop layouts work without changing existing page design.
- [ ] The final audit report lists added, skipped and unresolved items.

**Start by inspecting the existing website and building the fish inventory. Do not generate images or modify files until the duplicate check and research table are complete. Preserve the existing catalogue as read-only; only append confirmed missing entries.**
