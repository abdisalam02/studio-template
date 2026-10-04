'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface EditorialImageProps {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  aspectRatio?: string;
}

export function EditorialImage({
  src,
  alt,
  fallbackSrc = '/img/defaults/studio-interior.svg',
  className = '',
  fill = false,
  width,
  height,
  priority = false,
  aspectRatio,
}: EditorialImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const activeSrc = hasError || !src ? fallbackSrc : src;

  // Fast, already-cached images can finish loading before React attaches the
  // onLoad handler, so the load event never fires and the image would stay at
  // opacity-0 forever. Reconcile against the DOM node after mount too.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setIsLoading(false);
    }
  }, [activeSrc]);

  return (
    <div
      className={`relative overflow-hidden bg-[#ece8e1] ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-200/70 animate-pulse pointer-events-none" />
      )}
      <Image
        ref={imgRef}
        src={activeSrc}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width || 800}
        height={fill ? undefined : height || 600}
        priority={priority}
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}
