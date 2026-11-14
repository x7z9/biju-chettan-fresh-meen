import type {
  BusinessSettings,
  FishItem,
  PosterBackground,
  PosterLanguageMode,
  PriceUnit,
} from '../types';

export interface PosterRenderOptions {
  fish: FishItem;
  photoSrc: string;
  background: PosterBackground;
  posterLanguage: PosterLanguageMode;
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

  // 2. Photo Frame (strictly bounded between header and badge/footer)
  const img = await loadImage(photoSrc);
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

  let heading = settings.posterHeadingMl;
  if (posterLanguage === 'en') heading = settings.posterHeadingEn;
  if (posterLanguage === 'bilingual') {
    heading = `${settings.posterHeadingMl} · ${settings.posterHeadingEn}`;
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
