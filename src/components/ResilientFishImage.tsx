import React, { useEffect, useMemo, useState } from 'react';
import { Fish } from 'lucide-react';

interface ResilientFishImageProps {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  alt: string;
  fallbackLabel: string;
  className?: string;
  eager?: boolean;
  highPriority?: boolean;
}

function buildCandidateUrls(
  primary: string | null | undefined,
  fallback?: string | null
): string[] {
  const candidates: string[] = [];
  const pushUnique = (u: string | null | undefined) => {
    if (!u || typeof u !== 'string') return;
    if (!candidates.includes(u)) candidates.push(u);
  };

  const expandVariants = (url: string) => {
    pushUnique(url);
    if (
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      return;
    }
    const noQuery = url.split('?')[0].split('#')[0];
    pushUnique(noQuery);
    const assetsIdx = noQuery.indexOf('assets/');
    if (assetsIdx >= 0) {
      pushUnique(`/${noQuery.slice(assetsIdx)}`);
    }
  };

  if (primary) expandVariants(primary);
  if (fallback && fallback !== primary) expandVariants(fallback);
  return candidates;
}

export const ResilientFishImage: React.FC<ResilientFishImageProps> = ({
  src,
  fallbackSrc,
  alt,
  fallbackLabel,
  className = 'w-full h-full object-contain',
  eager = false,
  highPriority = false,
}) => {
  const candidates = useMemo(
    () => buildCandidateUrls(src, fallbackSrc),
    [src, fallbackSrc]
  );
  const candidatesKey = candidates.join('|');
  const [attemptIdx, setAttemptIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAttemptIdx(0);
    setLoaded(false);
  }, [candidatesKey]);

  const activeSrc = candidates[attemptIdx] || null;

  if (!activeSrc) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center text-[#43474f] dark:text-neutral-300">
        <Fish className="w-7 h-7 opacity-40" aria-hidden="true" />
        <span className="text-xs font-semibold leading-snug break-words">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-200/60 dark:bg-neutral-800/70 animate-pulse"
        />
      )}
      <img
        src={activeSrc}
        alt={alt}
        width={896}
        height={1200}
        className={`${className} relative z-[1]`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={highPriority ? 'high' : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setAttemptIdx((prev) => prev + 1);
        }}
      />
    </>
  );
};
