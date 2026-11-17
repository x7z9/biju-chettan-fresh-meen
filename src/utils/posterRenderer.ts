import { BUSINESS_LOGO_PATH } from '../data/seedCatalog';
import type {
  BusinessSettings,
  DailyFishEntry,
  DailyRecord,
  FishItem,
  Language,
  PosterBackground,
  PosterLanguageMode,
  PosterTemplateStyle,
  PriceUnit,
} from '../types';
import { dataUrlToBlob, formatDisplayDate } from './speechAndDate';

export interface PosterRenderOptions {
  fish: FishItem;
  photoSrc: string;
  background: PosterBackground;
  posterLanguage: PosterLanguageMode;
  templateStyle?: PosterTemplateStyle;
  headingOverrideMl?: string;
  settings: BusinessSettings;
  zoom: number;
  offsetX: number; // -1 to 1
  offsetY: number; // -1 to 1
  brightness: number; // 80 to 130 (percent)
  contrast: number; // 85 to 130 (percent)
  priceAmount?: string;
  priceUnit?: PriceUnit;
  includePrice?: boolean;
  noteText?: string;
  previewScale?: number;
}

const POSTER_W = 1200;
const POSTER_H = 1600;
const FONT_STACK =
  '"Noto Sans Malayalam", "Manjari", "Kartika", "Nirmala UI", sans-serif';

function fitFontAndDrawCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxFontPx: number,
  minFontPx: number,
  weight: number
) {
  let size = maxFontPx;
  while (size > minFontPx) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  ctx.fillText(text, x, y, maxWidth);
}

function drawBlueTrayBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#062447';
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  const pad = 24;
  ctx.beginPath();
  ctx.roundRect(pad, pad, POSTER_W - pad * 2, POSTER_H - pad * 2, 54);
  const rimGrad = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  rimGrad.addColorStop(0, '#1d8ff0');
  rimGrad.addColorStop(0.5, '#0879d9');
  rimGrad.addColorStop(1, '#065aa5');
  ctx.fillStyle = rimGrad;
  ctx.fill();

  const innerPad = 52;
  ctx.beginPath();
  ctx.roundRect(
    innerPad,
    innerPad,
    POSTER_W - innerPad * 2,
    POSTER_H - innerPad * 2,
    40
  );
  const trayGrad = ctx.createRadialGradient(
    POSTER_W * 0.5,
    POSTER_H * 0.48,
    80,
    POSTER_W * 0.5,
    POSTER_H * 0.5,
    820
  );
  trayGrad.addColorStop(0, '#1689e8');
  trayGrad.addColorStop(1, '#0870ca');
  ctx.fillStyle = trayGrad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawBananaLeafBackground(ctx: CanvasRenderingContext2D) {
  const leafGrad = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  leafGrad.addColorStop(0, '#2e7d32');
  leafGrad.addColorStop(0.5, '#388e3c');
  leafGrad.addColorStop(1, '#1b5e20');
  ctx.fillStyle = leafGrad;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.save();
  ctx.strokeStyle = 'rgba(220, 252, 231, 0.14)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, POSTER_H * 0.54);
  ctx.lineTo(POSTER_W, POSTER_H * 0.51);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(220, 252, 231, 0.08)';
  for (let x = -200; x <= POSTER_W + 200; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, POSTER_H * 0.525);
    ctx.lineTo(x + 120, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, POSTER_H * 0.525);
    ctx.lineTo(x + 120, POSTER_H);
    ctx.stroke();
  }
  ctx.restore();
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (typeof img.decode === 'function') {
        try {
          await img.decode();
        } catch {
          // Safe to ignore decode failure if already loaded
        }
      }
      resolve(img);
    };
    img.onerror = () => {
      imageCache.delete(src);
      reject(new Error('Could not load image for poster'));
    };
    img.src = src;
  });

  if (imageCache.size >= 16) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) imageCache.delete(firstKey);
  }
  imageCache.set(src, promise);
  return promise;
}

function formatPriceUnitLabel(
  unit: PriceUnit | undefined,
  langMode: PosterLanguageMode
): string {
  if (langMode === 'en') {
    if (unit === 'per_piece') return '/ piece';
    if (unit === 'per_packet') return '/ packet';
    return '/ kg';
  }
  if (unit === 'per_piece') return '/ എണ്ണം';
  if (unit === 'per_packet') return '/ പാക്കറ്റ്';
  return '/ കിലോ';
}

export async function renderFishPosterToDataUrl(
  options: PosterRenderOptions
): Promise<string> {
  const {
    fish,
    photoSrc,
    background,
    posterLanguage,
    templateStyle = 'standard',
    headingOverrideMl,
    settings,
    zoom,
    offsetX,
    offsetY,
    brightness,
    contrast,
    priceAmount,
    priceUnit,
    includePrice,
    noteText,
    previewScale = 1,
  } = options;

  const safeScale = Math.max(0.25, Math.min(1, previewScale));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(POSTER_W * safeScale);
  canvas.height = Math.round(POSTER_H * safeScale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  if (safeScale !== 1) {
    ctx.scale(safeScale, safeScale);
  }

  // 1. Clean Tray or Banana Leaf background
  if (background === 'banana-leaf') {
    drawBananaLeafBackground(ctx);
  } else {
    drawBlueTrayBackground(ctx);
  }

  const cleanPrice = priceAmount?.trim();
  const cleanNote = noteText?.trim();
  const hasBadge = Boolean((includePrice && cleanPrice) || cleanNote);

  const img = await loadImage(photoSrc);

  // Minimal fish-focused template: clean title banner at top + generous unobstructed photo + small bottom note
  if (templateStyle === 'minimal') {
    const frameX = 64;
    const frameY = 178;
    const frameW = POSTER_W - frameX * 2;
    const frameH = POSTER_H - frameY - (settings.showDisclaimerOnPoster ? 110 : 64);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 32);
    ctx.clip();
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    const containScale = Math.min(frameW / img.width, frameH / img.height);
    const drawW = img.width * containScale * zoom;
    const drawH = img.height * containScale * zoom;
    const centerX = frameX + frameW / 2 + offsetX * (frameW * 0.25);
    const centerY = frameY + frameH / 2 + offsetY * (frameH * 0.25);
    ctx.drawImage(img, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleLabel =
      posterLanguage === 'en' ? fish.pronunciationLatin : fish.nameMl;
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 12;
    fitFontAndDrawCentered(ctx, titleLabel, POSTER_W / 2, 102, POSTER_W - 140, 74, 38, 800);
    ctx.restore();

    if (settings.showDisclaimerOnPoster) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      const note =
        posterLanguage === 'en' ? settings.disclaimerEn : settings.disclaimerMl;
      fitFontAndDrawCentered(ctx, note, POSTER_W / 2, POSTER_H - 54, POSTER_W - 140, 24, 16, 600);
      ctx.restore();
    }

    return canvas.toDataURL('image/jpeg', safeScale < 1 ? 0.85 : 0.92);
  }

  // 2. Photo Frame (strictly bounded between header and badge/footer)
  const headerBottom = 302;
  const footerTop = 1422;
  const badgeHeight = hasBadge ? 98 : 0;
  const frameX = 82;
  const frameY = headerBottom + 20;
  const frameW = POSTER_W - frameX * 2;
  const frameH = footerTop - badgeHeight - 24 - frameY;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(frameX, frameY, frameW, frameH, 32);
  ctx.clip();

  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

  const containScale = Math.min(frameW / img.width, frameH / img.height);
  const drawW = img.width * containScale * zoom;
  const drawH = img.height * containScale * zoom;
  const centerX = frameX + frameW / 2 + offsetX * (frameW * 0.25);
  const centerY = frameY + frameH / 2 + offsetY * (frameH * 0.25);

  ctx.drawImage(img, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
  ctx.restore();

  // 3. Top Header Card (y: 44 -> 302, height: 258)
  ctx.save();
  ctx.fillStyle = 'rgba(8, 45, 89, 0.90)';
  ctx.beginPath();
  ctx.roundRect(68, 44, POSTER_W - 136, 258, 32);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxHeaderTextW = POSTER_W - 200;

  const isSeafoodOther = fish.catalogueGroup === 'seafood_other';
  const defaultMlHeading =
    headingOverrideMl?.trim() ||
    (isSeafoodOther ? 'ഇന്നത്തെ കടൽവിഭവം' : settings.posterHeadingMl);
  const defaultEnHeading = isSeafoodOther
    ? "Today's Seafood"
    : settings.posterHeadingEn;

  let heading = defaultMlHeading;
  if (posterLanguage === 'en') heading = defaultEnHeading;
  if (posterLanguage === 'bilingual') {
    heading = `${defaultMlHeading} · ${defaultEnHeading}`;
  }

  ctx.fillStyle = '#ffffff';
  fitFontAndDrawCentered(
    ctx,
    heading,
    POSTER_W / 2,
    92,
    maxHeaderTextW,
    posterLanguage === 'ml' ? 36 : 32,
    22,
    700
  );

  if (posterLanguage === 'ml') {
    ctx.fillStyle = '#facc15';
    fitFontAndDrawCentered(
      ctx,
      fish.nameMl,
      POSTER_W / 2,
      200,
      maxHeaderTextW,
      64,
      34,
      800
    );
  } else if (posterLanguage === 'en') {
    ctx.fillStyle = '#facc15';
    fitFontAndDrawCentered(
      ctx,
      fish.pronunciationLatin,
      POSTER_W / 2,
      174,
      maxHeaderTextW,
      54,
      30,
      800
    );

    ctx.fillStyle = '#e0f2fe';
    const sub = fish.nameEn ? `${fish.nameMl} · ${fish.nameEn}` : fish.nameMl;
    fitFontAndDrawCentered(ctx, sub, POSTER_W / 2, 254, maxHeaderTextW, 28, 18, 600);
  } else {
    ctx.fillStyle = '#facc15';
    fitFontAndDrawCentered(
      ctx,
      fish.nameMl,
      POSTER_W / 2,
      174,
      maxHeaderTextW,
      54,
      32,
      800
    );

    ctx.fillStyle = '#e0f2fe';
    fitFontAndDrawCentered(
      ctx,
      fish.pronunciationLatin,
      POSTER_W / 2,
      254,
      maxHeaderTextW,
      30,
      18,
      600
    );
  }
  ctx.restore();

  // 4. Optional Price & Size Note Badge (y: 1320 -> 1400, strictly above footerTop 1422)
  if (hasBadge) {
    ctx.save();
    const parts: string[] = [];
    if (cleanNote) parts.push(cleanNote);
    if (includePrice && cleanPrice) {
      parts.push(`₹${cleanPrice} ${formatPriceUnitLabel(priceUnit, posterLanguage)}`);
    }
    const label = parts.join('  •  ');

    let badgeFontSize = 38;
    while (badgeFontSize > 24) {
      ctx.font = `800 ${badgeFontSize}px ${FONT_STACK}`;
      if (ctx.measureText(label).width <= POSTER_W - 240) break;
      badgeFontSize -= 2;
    }
    ctx.font = `800 ${badgeFontSize}px ${FONT_STACK}`;
    const textW = Math.min(ctx.measureText(label).width + 88, POSTER_W - 160);
    const badgeX = POSTER_W / 2 - textW / 2;
    const badgeY = 1322;

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, textW, 78, 22);
    ctx.fill();

    ctx.fillStyle = '#082d59';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, POSTER_W / 2, badgeY + 40, textW - 40);
    ctx.restore();
  }

  // 5. Bottom Business Footer (y: 1422 -> 1548, height: 126)
  ctx.save();
  ctx.fillStyle = 'rgba(8, 45, 89, 0.92)';
  ctx.beginPath();
  ctx.roundRect(68, footerTop, POSTER_W - 136, 126, 26);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxFooterTextW = POSTER_W - 190;

  ctx.fillStyle = '#ffffff';
  const brandLine =
    posterLanguage === 'en'
      ? `${settings.businessNameEn}  •  ${settings.phoneDisplay}`
      : `${settings.businessNameMl}  •  ${settings.phoneDisplay}`;

  if (settings.showDisclaimerOnPoster) {
    fitFontAndDrawCentered(
      ctx,
      brandLine,
      POSTER_W / 2,
      1464,
      maxFooterTextW,
      32,
      20,
      700
    );
    const note =
      posterLanguage === 'en' ? settings.disclaimerEn : settings.disclaimerMl;
    ctx.fillStyle = 'rgba(224, 242, 254, 0.92)';
    fitFontAndDrawCentered(
      ctx,
      note,
      POSTER_W / 2,
      1516,
      maxFooterTextW,
      22,
      16,
      500
    );
  } else {
    fitFontAndDrawCentered(
      ctx,
      brandLine,
      POSTER_W / 2,
      1485,
      maxFooterTextW,
      34,
      22,
      700
    );
  }
  ctx.restore();

  return canvas.toDataURL('image/jpeg', safeScale < 1 ? 0.85 : 0.92);
}

export function buildPosterFilename(fishId: string, dateKey: string): string {
  const safeId = fishId.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  return `innathe-meen-${safeId}-${dateKey}.jpg`;
}

export function resolveFishBestPhotoSrc(
  fish: FishItem,
  entry?: DailyFishEntry
): string | null {
  return (
    entry?.todayPosterDataUrl ||
    entry?.todayPhotoDataUrl ||
    fish.customActualPhotos[0]?.dataUrl ||
    fish.referenceImage ||
    null
  );
}

const preparedShareFileCache = new Map<string, File>();

export async function imageSrcToJpegFile(
  src: string,
  filename: string
): Promise<File | null> {
  const cacheKey = `${src}::${filename}`;
  const cached = preparedShareFileCache.get(cacheKey);
  if (cached) return cached;

  try {
    if (src.startsWith('data:image/jpeg')) {
      const blob = dataUrlToBlob(src);
      const file = new File([blob], filename, { type: 'image/jpeg' });
      if (preparedShareFileCache.size >= 60) {
        const firstKey = preparedShareFileCache.keys().next().value;
        if (firstKey) preparedShareFileCache.delete(firstKey);
      }
      preparedShareFileCache.set(cacheKey, file);
      return file;
    }

    // Fast path for already-compact same-origin JPEG assets (no slow canvas re-encode)
    if (!src.startsWith('data:') && /\.jpe?g(?:[?#]|$)/i.test(src)) {
      try {
        const res = await fetch(src, { credentials: 'same-origin' });
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0 && blob.size <= 1.5 * 1024 * 1024) {
            const jpegBlob =
              blob.type === 'image/jpeg'
                ? blob
                : new Blob([blob], { type: 'image/jpeg' });
            const file = new File([jpegBlob], filename, { type: 'image/jpeg' });
            if (preparedShareFileCache.size >= 60) {
              const firstKey = preparedShareFileCache.keys().next().value;
              if (firstKey) preparedShareFileCache.delete(firstKey);
            }
            preparedShareFileCache.set(cacheKey, file);
            return file;
          }
        }
      } catch {
        // Fall back to Image + canvas conversion
      }
    }

    const img = await loadImage(src);
    const maxDim = 1080;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.86)
    );
    if (!blob) return null;
    const file = new File([blob], filename, { type: 'image/jpeg' });
    if (preparedShareFileCache.size >= 60) {
      const firstKey = preparedShareFileCache.keys().next().value;
      if (firstKey) preparedShareFileCache.delete(firstKey);
    }
    preparedShareFileCache.set(cacheKey, file);
    return file;
  } catch {
    return null;
  }
}

export interface DailyMenuPosterOptions {
  fishList: FishItem[];
  dailyRecord: DailyRecord;
  settings: BusinessSettings;
  lang: Language;
  previewScale?: number;
}

export async function renderDailyMenuPosterToDataUrl({
  fishList,
  dailyRecord,
  settings,
  lang,
  previewScale = 1,
}: DailyMenuPosterOptions): Promise<string> {
  const safeScale = Math.max(0.25, Math.min(1, previewScale));
  const count = Math.max(1, fishList.length);
  const cols = count === 1 ? 1 : count <= 6 ? 2 : 3;
  const rows = Math.ceil(count / cols);

  const canvasW = 1200;
  const headerH = 210;
  const footerH = 132;
  const padX = 44;
  const gap = cols === 3 ? 22 : 28;
  const tileW = Math.floor((canvasW - padX * 2 - gap * (cols - 1)) / cols);
  const photoH = cols === 1 ? 760 : cols === 2 ? Math.round(tileW * 1.05) : Math.round(tileW * 1.05);
  const captionH = cols === 3 ? 112 : 122;
  const tileH = photoH + captionH;
  const bodyTop = headerH + 28;
  const canvasH = bodyTop + rows * tileH + (rows - 1) * gap + 32 + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(canvasW * safeScale);
  canvas.height = Math.round(canvasH * safeScale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  if (safeScale !== 1) {
    ctx.scale(safeScale, safeScale);
  }

  // Deep coastal gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  bgGrad.addColorStop(0, '#062447');
  bgGrad.addColorStop(0.5, '#08366b');
  bgGrad.addColorStop(1, '#041a35');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Header Banner
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(padX, 26, canvasW - padX * 2, headerH - 36, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Logo circle
  const logoSize = 124;
  const logoX = padX + 26;
  const logoY = 26 + (headerH - 36 - logoSize) / 2;
  try {
    const logoImg = await loadImage(BUSINESS_LOGO_PATH);
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(logoX, logoY, logoSize, logoSize);
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } catch {
    // Continue cleanly if logo decode fails
  }

  const textStartX = logoX + logoSize + 28;
  const maxHeadTextW = canvasW - padX - 28 - textStartX;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const titleLine =
    lang === 'en' ? settings.whatsappGroupNameEn : settings.whatsappGroupNameMl;
  ctx.fillStyle = '#facc15';
  let titleSize = 42;
  while (titleSize > 24) {
    ctx.font = `800 ${titleSize}px ${FONT_STACK}`;
    if (ctx.measureText(titleLine).width <= maxHeadTextW) break;
    titleSize -= 2;
  }
  ctx.font = `800 ${titleSize}px ${FONT_STACK}`;
  ctx.fillText(titleLine, textStartX, 78, maxHeadTextW);

  const subHeading =
    lang === 'en'
      ? `Today's Fresh Catch (${fishList.length})`
      : `ഇന്നത്തെ ഫ്രെഷ് മീനുകൾ (${fishList.length})`;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 28px ${FONT_STACK}`;
  ctx.fillText(subHeading, textStartX, 126, maxHeadTextW);

  const dateLocation = `${formatDisplayDate(dailyRecord.dateKey, lang)}  •  ${
    lang === 'en' ? settings.locationEn : settings.locationMl
  }`;
  ctx.fillStyle = '#bae6fd';
  ctx.font = `600 22px ${FONT_STACK}`;
  ctx.fillText(dateLocation, textStartX, 166, maxHeadTextW);
  ctx.restore();

  // Preload all fish images in parallel
  const loadedImages = await Promise.all(
    fishList.map(async (fish) => {
      const src = resolveFishBestPhotoSrc(fish, dailyRecord.entries[fish.id]);
      if (!src) return null;
      try {
        return await loadImage(src);
      } catch {
        return null;
      }
    })
  );

  // Draw Fish Tiles
  const unitMode: PosterLanguageMode = lang === 'en' ? 'en' : 'ml';
  for (let i = 0; i < fishList.length; i++) {
    const fish = fishList[i];
    const entry = dailyRecord.entries[fish.id];
    const img = loadedImages[i];

    const col = i % cols;
    const row = Math.floor(i / cols);

    // Center incomplete last row neatly
    const itemsInRow = row === rows - 1 ? fishList.length - row * cols : cols;
    const rowTotalW = itemsInRow * tileW + (itemsInRow - 1) * gap;
    const rowStartX = Math.round((canvasW - rowTotalW) / 2);

    const x = rowStartX + col * (tileW + gap);
    const y = bodyTop + row * (tileH + gap);

    // Tile Card Container
    ctx.save();
    ctx.fillStyle = '#0a1f3d';
    ctx.beginPath();
    ctx.roundRect(x, y, tileW, tileH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Photo Box
    const imgPad = 10;
    const imgBoxX = x + imgPad;
    const imgBoxY = y + imgPad;
    const imgBoxW = tileW - imgPad * 2;
    const imgBoxH = photoH - imgPad;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 16);
    ctx.clip();
    ctx.fillStyle = '#041226';
    ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);

    if (img) {
      const scale = Math.min(imgBoxW / img.width, imgBoxH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(
        img,
        imgBoxX + (imgBoxW - dw) / 2,
        imgBoxY + (imgBoxH - dh) / 2,
        dw,
        dh
      );
    }
    ctx.restore();

    // Caption area
    const capTop = y + photoH;
    const capMaxW = tileW - 24;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const priceStr =
      dailyRecord.includePrices && entry?.priceAmount?.trim()
        ? `₹${entry.priceAmount.trim()} ${formatPriceUnitLabel(entry.priceUnit, unitMode)}`
        : '';
    const noteStr = entry?.note?.trim() || '';
    const detailLine = [noteStr, priceStr].filter(Boolean).join(' • ');

    if (detailLine) {
      ctx.fillStyle = '#ffffff';
      fitFontAndDrawCentered(
        ctx,
        fish.nameMl,
        x + tileW / 2,
        capTop + (cols === 3 ? 34 : 38),
        capMaxW,
        cols === 3 ? 28 : 34,
        18,
        800
      );

      ctx.fillStyle = '#facc15';
      fitFontAndDrawCentered(
        ctx,
        detailLine,
        x + tileW / 2,
        capTop + (cols === 3 ? 80 : 86),
        capMaxW,
        cols === 3 ? 22 : 25,
        15,
        700
      );
    } else if (lang === 'en') {
      ctx.fillStyle = '#ffffff';
      fitFontAndDrawCentered(
        ctx,
        fish.nameMl,
        x + tileW / 2,
        capTop + (cols === 3 ? 34 : 38),
        capMaxW,
        cols === 3 ? 28 : 34,
        18,
        800
      );

      ctx.fillStyle = '#bae6fd';
      fitFontAndDrawCentered(
        ctx,
        fish.pronunciationLatin,
        x + tileW / 2,
        capTop + (cols === 3 ? 80 : 86),
        capMaxW,
        cols === 3 ? 20 : 23,
        14,
        600
      );
    } else {
      ctx.fillStyle = '#ffffff';
      fitFontAndDrawCentered(
        ctx,
        fish.nameMl,
        x + tileW / 2,
        capTop + captionH / 2,
        capMaxW,
        cols === 3 ? 30 : 36,
        20,
        800
      );
    }

    ctx.restore();
  }

  // Footer
  const footerY = canvasH - footerH + 10;
  ctx.save();
  ctx.fillStyle = 'rgba(250, 204, 21, 0.96)';
  ctx.beginPath();
  ctx.roundRect(padX, footerY, canvasW - padX * 2, footerH - 36, 24);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#082d59';
  const footerText =
    lang === 'en'
      ? `Call / WhatsApp: ${settings.phoneDisplay}  •  ${settings.businessNameEn}`
      : `വിളിക്കൂ / WhatsApp: ${settings.phoneDisplay}  •  ${settings.businessNameMl}`;
  fitFontAndDrawCentered(
    ctx,
    footerText,
    canvasW / 2,
    footerY + (footerH - 36) / 2,
    canvasW - padX * 2 - 48,
    30,
    18,
    800
  );
  ctx.restore();

  return canvas.toDataURL('image/jpeg', safeScale < 1 ? 0.82 : 0.9);
}
