import type { Language } from '../types';

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateKey: string, lang: Language): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const dateObj = new Date(y, m - 1, d);
  try {
    return new Intl.DateTimeFormat(lang === 'ml' ? 'ml-IN' : 'en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(dateObj);
  } catch {
    return dateKey;
  }
}

export function triggerHaptic(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  } catch {
    // Ignore unsupported vibration errors
  }
}

export function speakPronunciation(text: string): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const enInVoice =
      voices.find((v) => v.lang.toLowerCase() === 'en-in') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (enInVoice) {
      utterance.voice = enInVoice;
      utterance.lang = enInVoice.lang;
    } else {
      utterance.lang = 'en-IN';
    }
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Gracefully fail without UI error if speechSynthesis is unavailable
  }
}

export async function fileToOptimizedDataUrl(
  file: File,
  maxDimension = 1600,
  quality = 0.9
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Invalid image result'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        if (width <= maxDimension && height <= maxDimension) {
          resolve(result);
          return;
        }
        const scale = Math.min(maxDimension / width, maxDimension / height);
        const targetW = Math.round(width * scale);
        const targetH = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+);/.exec(meta);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
