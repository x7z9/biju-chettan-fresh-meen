# Vibe-Coding Prompt: Safely Expand the Oachira Fresh-Fish and Seafood Catalogue

> **Primary goal:** Add only genuinely missing Kerala coastal finfish and other seafood entries (prawns/shrimp, crabs, clams, squid, cuttlefish and octopus), accurate Malayalam market names, verified species details, and realistic 3:4 images to my existing website. Preserve every existing fish/seafood photo, description, record, page, and feature exactly as it is.

## 1. Your role

Act as a senior full-stack engineer, Kerala marine-fisheries and seafood research assistant, Malayalam proofreader, and realistic seafood-image art director. Work inside the existing website and follow its current framework, data model, components, design system, file conventions, and deployment setup. Do not rebuild the website or introduce a second catalogue system.

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

## 11. Additional catalogue scope: seafood other than finfish

Extend the existing catalogue to cover the following coastal-market products as a separate **Seafood** category. These are not all finfish: prawns/shrimp and crabs are crustaceans; clams are bivalve molluscs; squid, cuttlefish and octopus are cephalopod molluscs. Do not misclassify them as finfish in scientific metadata, filters, schema fields or descriptions.

### 11.1 Requested Malayalam seafood names and identification rules

The Malayalam names below are supplied from my market vocabulary. Preserve them as candidate local labels, but verify each label against authoritative references and confirm Oachira/Alappad seller usage when the available sources do not establish the local name. The English group name does not automatically identify a species.

| Malayalam market name supplied | Romanised pronunciation | English product/group | Identification and spelling rule |
|---|---|---|---|
| ചെമ്മീൻ | Chemmeen | Prawns / shrimp | Broad market category, not one species. Identify the actual prawn species from the specimen/photo before assigning a scientific name. |
| കരിക്കാടി / കരിക്കാടി ചെമ്മീൻ | Karikkadi / Karikkadi Chemmeen | Karikkadi / kiddi shrimp | CMFRI's Kerala fishery article explicitly calls *Parapenaeopsis stylifera* “Karikkadi Chemmeen”. Use **കരിക്കാടി ചെമ്മീൻ** when that species is confirmed; do not apply it to every small shrimp. |
| നാരൻ കൊഞ്ച് | Naaran Konju | Local prawn name supplied by seller | Keep as an unverified Oachira-area market label. The sources checked for this prompt did not establish a reliable scientific mapping. Do not assume it means white prawn (*Penaeus indicus*) or another species without my/local seller confirmation. Preserve the supplied spelling pending confirmation. |
| ഞണ്ട് | Njandu | Crab | Generic crab name, not a species. Use mud crab or sea crab species only after identifying the actual specimen. |
| കക്ക | Kakka | Clam | Generic clam name. Do not assign one species to all kakka. If supported by specimen and local confirmation, distinguish black clam / **കറുത്ത കക്ക** (*Villorita cyprinoides*), short-neck clam / **മഞ്ഞ കക്ക** (*Paphia malabarica*), or another confirmed clam. Check the local spelling with a seller before publishing aliases. |
| കണവ | Kanava | Squid (common market label) | MPEDA lists Indian squid under *Loligo duvaucelii* and also lists *Doryteuthis sibogae* for the Kerala coast. Use the currently accepted taxonomic name after WoRMS verification; do not assign either species based on the Malayalam word alone. |
| കൂന്തൽ | Koonthal | Squid / cuttlefish market term | Local trade usage can overlap with കണവ and can vary by area. Do not automatically make it a separate species or assume it always means cuttlefish. Compare the specimen with CMFRI cephalopod keys and ask for local confirmation where necessary. |
| നീരാളി | Neeraali | Octopus | Generic octopus market name. MPEDA lists *Octopus* spp.; do not invent a species-level name unless identification is supported by the actual specimen and a reliable taxonomic source. |

**Important local-name controls:**

- Keep `ചെമ്മീൻ`, `കരിക്കാടി ചെമ്മീൻ`, and `നാരൻ കൊഞ്ച്` as three separate candidate labels until duplicate and taxonomy checks prove a relationship. Do not merge them simply because they are all prawns.
- CMFRI identifies *Parapenaeopsis stylifera* as Karikkadi Chemmeen in Kerala. This is the strongest confirmed regional mapping in this list.
- MPEDA lists *Penaeus indicus* as White Prawn, but that does **not** prove that the local term `നാരൻ കൊഞ്ച്` means White Prawn. Keep that mapping unassigned until a local seller confirms it.
- `ഞണ്ട്` and `കക്ക` are broad product groups. A species-specific scientific label must not be inferred from either word alone.
- Squid and cuttlefish are different cephalopod groups. `കണവ` and `കൂന്തൽ` may overlap as market labels; use external morphology and CMFRI keys to identify the actual animal.
- Octopus must show eight arms. Do not generate a squid or cuttlefish image and label it നീരാളി.
- If the Malayalam local label is not supported by an authoritative published glossary, mark its source as `seller_supplied_local_name` and `needs_local_confirmation`; do not present a guessed etymology or spelling as official.

### 11.2 Original authoritative reference websites, species details and photographs

Open the original pages and inspect the actual species cards, captions, image links, scientific names, distribution and identification material. Save the direct page URL, individual image URL (when available), page title, image creator/credit, licence and access date in the research record. The web pages below are **reference sources**; a visible image is not automatically licensed for republication.

#### Government of India — Marine Products Export Development Authority (MPEDA)

1. **MPEDA – Crustaceans (original species page with embedded reference images and species data)**  
   https://mpeda.gov.in/?page_id=1263  
   Use its labelled images and species information for mud crab (*Scylla serrata*), sea crabs (*Portunus sanguinolentus*, *Portunus pelagicus*, *Charybdis cruciata*), white prawn (*Penaeus indicus*), tiger prawn (*Penaeus monodon*), flower prawn (*Penaeus semisulcatus*), brown shrimps (*Metapenaeus dobsoni*, *Metapenaeus monoceros*), king prawn (*Metapenaeus affinis*), marine shrimp (*Parapenaeopsis stylifera*) and lobsters. The page includes trade names, scientific names, gear, distribution and image links. It identifies Kerala as an area of abundance for several of these products. Treat the exact species list and page's current taxonomic spellings as source data to be checked against WoRMS before publishing.

2. **MPEDA – Molluscs (original species page with trade names, scientific names and India distribution)**  
   https://mpeda.gov.in/?page_id=1267  
   Use its cephalopod section for cuttlefish (*Sepia* spp.), squid (including *Loligo duvaucelii* and *Doryteuthis sibogae*) and octopus (*Octopus* spp.). Use its bivalve section for green mussel and clam species, including *Meretrix meretrix*, *Villorita cyprinoides* (verify current spelling/taxonomy; other sources use *Villorita*) and *Katelysia opima*. This page provides trade names, scientific names, gear and distribution; do not treat generic trade labels as species-level Malayalam names.

3. **MPEDA – Shrimp products**  
   https://mpeda.gov.in/?page_id=1321  
   Use only as supporting product/appearance context. Processed/frozen product photographs are not substitutes for whole, fresh-animal identification photographs.

4. **MPEDA – Squid products**  
   https://mpeda.gov.in/?page_id=1329  
   Useful for product-form vocabulary and visual comparison, but processed rings/fillets/cleaned squid must not be used as the reference for a whole fresh squid's natural anatomy.

5. **MPEDA – Cuttlefish products**  
   https://mpeda.gov.in/?page_id=1333  
   Supporting product reference only; use CMFRI identification material for natural whole-animal morphology.

6. **MPEDA – Octopus products**  
   https://mpeda.gov.in/?page_id=1348  
   Supporting product reference only; use CMFRI cephalopod identification material for whole octopus anatomy.

7. **MPEDA – Crab products**  
   https://mpeda.gov.in/?page_id=1345  
   Supporting product reference only; use the crustacean species page and CMFRI crab manual for species identity and morphology.

#### ICAR – Central Marine Fisheries Research Institute (CMFRI)

8. **CMFRI – The “Karikkadi” fishery of Kerala**  
   https://eprints.cmfri.org.in/4644/  
   Original Kerala research record. It explicitly identifies *Parapenaeopsis stylifera* as “Karikkadi Chemmeen” and discusses the Kerala karikkadi fishery. Use this as the primary support for the Malayalam-market mapping `കരിക്കാടി ചെമ്മീൻ` → *Parapenaeopsis stylifera*.

9. **CMFRI – Marine Fisheries Information Service, Vol. 102 (original article PDF: “The Karikkadi Fishery of Kerala”)**  
   https://eprints.cmfri.org.in/8096/1/Marine_Fisheries_Information_Service_Vol_102.pdf  
   Use the original article text for the species name and Kerala fishery context. It describes *P. stylifera* and the name Karikkadi Chemmeen.

10. **CMFRI – Handbook of Prawns**  
    https://eprints.cmfri.org.in/7427/  
    CMFRI describes this as an illustrated identification guide to commercially important prawns landed along the Indian coast, with taxonomic keys. The repository marks the full text as restricted to registered users; do not bypass access restrictions. Use only legitimately accessible material.

11. **CMFRI – Handbook of Marine Prawns of India**  
    https://eprints.cmfri.org.in/9353/  
    Use as a high-value taxonomic/photo reference if legitimately accessible. Respect its stated access and copyright conditions.

12. **CMFRI – Training Manual on Species Identification: Marine Commercial Crabs of India**  
    https://eprints.cmfri.org.in/11869/1/Training%20Manual%20on%20Species%20Identification_2017_Josileen%20Jose_Crab.pdf  
    Use its crab morphology diagrams and species keys to distinguish mud crabs and sea crabs. The manual shows diagnostic features such as frontal teeth, carapace, chelipeds and spines; do not identify a crab from colour alone.

13. **CMFRI – Identity of Common Species of Cephalopods of India, Bulletin 37**  
    https://eprints.cmfri.org.in/7028/1/Bulletin_No_37.pdf  
    Use its illustrated keys and descriptions for Indian squids, cuttlefishes and octopods. It describes nine cuttlefish species, six neritic squid species, four oceanic squid species and seven octopod species. This is an important reference for distinguishing കണവ, കൂന്തൽ and നീരാളി by actual anatomy rather than market-name guesswork. Check current taxonomic status separately because this is an older publication.

14. **CMFRI – Field Guide to the Common Marine Molluscs of India**  
    https://eprints.cmfri.org.in/69/  
    Use as a mollusc identification reference if access is legitimately available. The repository indicates registered-user restrictions; never attempt to bypass them.

15. **CMFRI – Clams (Government of Kerala aquaculture package chapter)**  
    https://eprints.cmfri.org.in/15109/  
    Use its clam introduction and source metadata. The linked chapter is from the Government of Kerala's Package of Aquaculture Practices (2021).

16. **Government of Kerala – Package of Aquaculture Practices, 2021 (Clams chapter, around pp. 260–263)**  
    https://fisheries.kerala.gov.in/sites/default/files/2021-02/Aquaculture%20Practices_compressed.pdf  
    Use the clam photographs and descriptions for black clam (*Villorita cyprinoides*) and short-neck clam (*Paphia malabarica*), especially when comparing Kerala brackish-water/backwater clams. This is a state aquaculture source, not proof that every clam sold at Azhikkal is one of those species.

#### Accepted taxonomy and supporting local-language references

17. **World Register of Marine Species (WoRMS)**  
    https://www.marinespecies.org/  
    Use to verify accepted scientific names, synonyms and current combinations for crustaceans and molluscs. Store the WoRMS taxon URL and access date. WoRMS is a taxonomy authority, not a source of Oachira Malayalam market names or fish-product image rights.

18. **Onmanorama – Malayalam and English Kerala fish/seafood names**  
    https://www.onmanorama.com/food/features/2024/11/12/malaylam-english-kerala-fish-names.amp.html  
    Use only as a secondary check for familiar Malayalam market vocabulary such as ഞണ്ട് and നീരാളി. It is not an authoritative taxonomic source and does not establish every Oachira-specific name.

19. **MPEDA – Important species portal**  
    https://mpeda.gov.in/?page_id=573  
    Use for commercially important Indian seafood groups, scientific names, seasons and distribution where listed. Do not apply national trade terms directly as local Malayalam names without confirmation.

### 11.3 Photograph and image-reference workflow for seafood

- Use the MPEDA species-card photographs, CMFRI illustrated guides, and Kerala Government clam photographs as **visual identification references** where access permits.
- Prefer whole-animal photographs showing the natural body, diagnostic features, shell/appendage structure and colour. A processed product image (peeled prawn, squid rings, cleaned cuttlefish, crab meat) is not a valid substitute for whole-animal morphology.
- When the original reference has no suitable whole-animal photo, search for a museum, university, government fisheries, CMFRI or properly licensed research photograph of the exact accepted species. Record the direct source page, photographer, licence and attribution.
- Never reuse a source photograph in the website unless reuse is expressly permitted. MPEDA and CMFRI pages/images are not automatically public domain; respect copyright, registration restrictions and page terms.
- Use reference photos to create a newly generated, original photorealistic visual only when the identity is adequately supported. The generated image must not copy a protected source image's exact composition or remove its watermark.
- For uncertain local terms such as `നാരൻ കൊഞ്ച്`, do not generate a species-specific image until I or a local seller confirms the exact specimen. Use `NEEDS_REVIEW` rather than inventing the animal.

### 11.4 Seafood-specific 3:4 image art direction

Keep the same catalogue identity as the finfish images: portrait **3:4**, clean green banana-leaf background, soft natural daylight, high clarity, natural colours, realistic fresh-caught appearance, generous safe margins and a single clear subject. Do not add ice, lemons, curry leaves, herbs, garnish, plates, nets, baskets, water splashes, price tags, logos or unrelated objects.

Apply the correct whole-animal anatomy for each group:

- **Prawns/shrimp:** Show whole unpeeled animals with natural rostrum, antennae, segmented abdomen, legs, swimmerets and tail fan visible where possible. Preserve the correct size and body colour of the identified species; do not create peeled/cooked shrimp.
- **Crabs:** Show the whole crab in a useful dorsal three-quarter view with carapace, both claws, walking legs and eye stalks visible. Preserve species-specific carapace outline, spines, claws and natural colour; do not add missing limbs or use a generic crab for every species.
- **Clams:** Show realistic intact shells with correct shape, growth lines, colour and shell pattern. For a species where an open shell is needed for identification, show the animal naturally and uncooked; do not turn it into a plated/cooked dish. Use only the same clam species in a small group.
- **Squid:** Show a whole squid with mantle, fins, head, eyes, eight arms and two longer tentacles anatomically coherent. Do not render cuttlefish body proportions and label it squid.
- **Cuttlefish:** Show a whole cuttlefish with its broader oval mantle, lateral fin fringe, head, eyes and arms/tentacles visible. Do not use a squid image.
- **Octopus:** Show a whole octopus with a rounded mantle and exactly eight arms, with visible suckers and realistic eye placement. Do not generate extra tentacles or a squid-shaped mantle.

For seafood, eye clarity is important on prawns, crabs, squid, cuttlefish and octopus where visible; for clams, prioritise sharp, realistic shell structure and surface details rather than inventing eyes. Never add finfish to a seafood image or seafood props to a finfish image.

### 11.5 Text rules for finfish versus other seafood

- For finfish, continue using the existing approved text rule: **ഇന്നത്തെ മീൻ** and the exact Malayalam fish name, unless the website already uses name-only images.
- For prawns, crabs, clams, squid, cuttlefish and octopus, use **ഇന്നത്തെ കടൽവിഭവം** as the small heading and the exact Malayalam product name as the main title. If the existing website already has a single approved heading system, preserve that existing system rather than restyling existing cards.
- The only visible text may be the category heading and the Malayalam product name. Do not add transliteration, English, scientific name, price, availability, seller name, logo, phone number, slogan or decorative copy.
- Render Malayalam typography as a text layer with a real Malayalam font after generating the clean image. Proofread every glyph and word independently; never trust an image model to spell a local Malayalam seafood name correctly.

### 11.6 Seafood metadata and duplicate handling

For each seafood record, store only verified fields that fit the current website schema:

- `catalogue_group`: `finfish` or `seafood_other`.
- `seafood_class`: `crustacean`, `bivalve_mollusc`, `cephalopod`, or another verified group.
- `malayalam_display_name`: exact approved local spelling.
- `local_aliases`: include only confirmed variants; mark seller-supplied names that lack documentary support.
- `english_trade_name` and accepted scientific name, only when confirmed.
- `identification_confidence`: `confirmed`, `probable`, or `needs_local_confirmation`.
- diagnostic features, original source URLs, taxonomy URL, source access date, image source/creator/licence, and new asset path.

Run the same non-destructive duplicate check used for finfish, now across the **entire catalogue**, including fish and seafood entries. Check Malayalam aliases, transliterations, English names, accepted scientific names and synonyms. A generic name such as ചെമ്മീൻ or ഞണ്ട് may contain several species and must not merge species-specific records incorrectly. If a seafood item already exists with a matching photo and details, skip it completely. Never overwrite a finfish entry with a seafood record or vice versa.

### 11.7 Required seafood-specific audit outcomes

For every requested seafood label, report one of:

- `ADDED`: the item was missing, species identity and name were adequately verified, and a new image/record was appended.
- `SKIPPED_EXISTING`: the same product/species already exists; its existing image and details were left untouched.
- `NEEDS_LOCAL_CONFIRMATION`: the local name/species mapping is uncertain, the visual specimen is not diagnostic, or reliable local usage could not be verified.

At minimum, include the eight supplied labels in the audit: ചെമ്മീൻ, കരിക്കാടി, നാരൻ കൊഞ്ച്, ഞണ്ട്, കക്ക, കണവ, കൂന്തൽ, നീരാളി. Do not force an `ADDED` status for every label; accuracy and protection of the existing catalogue take priority over catalogue size.

