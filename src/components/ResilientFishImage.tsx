import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Fish } from 'lucide-react';
import { getPublicAssetCandidates } from '../data/seedCatalog';

interface ResilientFishImageProps {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  alt: string;
  fallbackLabel: string;
  className?: string;
  eager?: boolean;
  highPriority?: boolean;
}

export const ResilientFishImage: React.FC<ResilientFishImageProps> = ({
  src,
  fallbackSrc,
  alt,
  fallbackLabel,
  className = 'w-full h-full object-contain',
  eager = true,
  highPriority = false,
}) => {
  const candidates = useMemo(
    () => getPublicAssetCandidates(src, fallbackSrc),
    [src, fallbackSrc]
  );
  const candidatesKey = candidates.join('|');

  const imgRef = useRef<HTMLImageElement | null>(null);
  const prevKeyRef = useRef(candidatesKey);

  const [attemptIdx, setAttemptIdx] = useState(0);
  const [retryCycle, setRetryCycle] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Reset attempt state only when the resolved source list actually changes
  useEffect(() => {
    if (prevKeyRef.current !== candidatesKey) {
      prevKeyRef.current = candidatesKey;
      setAttemptIdx(0);
      setRetryCycle(0);
      setLoaded(false);
    }
  }, [candidatesKey]);

  const activeSrc = candidates[attemptIdx] || null;

  // Guard against cached / synchronous SW image load completing before React attaches handlers
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [activeSrc, retryCycle]);

  // Automatic recovery when mobile connectivity flickers or returns
  useEffect(() => {
    if (activeSrc || candidates.length === 0) return;

    const retryNow = () => {
      setAttemptIdx(0);
      setLoaded(false);
      setRetryCycle((c) => c + 1);
    };

    window.addEventListener('online', retryNow);
    let timer: number | undefined;
    if (retryCycle < 2) {
      timer = window.setTimeout(retryNow, retryCycle === 0 ? 1500 : 4000);
    }

    return () => {
      window.removeEventListener('online', retryNow);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [activeSrc, candidates.length, retryCycle]);

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

  const resolvedPriority: 'high' | 'low' | 'auto' = highPriority
    ? 'high'
    : eager
      ? 'auto'
      : 'low';

  return (
    <>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-200/60 dark:bg-neutral-800/70 animate-pulse"
        />
      )}
      <img
        ref={imgRef}
        key={`${activeSrc}::${retryCycle}`}
        src={activeSrc}
        alt={alt}
        width={896}
        height={1200}
        className={`${className} relative z-[1]`}
        loading="eager"
        decoding="async"
        fetchPriority={resolvedPriority}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setAttemptIdx((prev) => prev + 1);
        }}
      />
    </>
  );
};
