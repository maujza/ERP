"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

const FALLBACK_IMAGE_SRC = "/file.svg";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  fallbackSrc?: string;
};

function normalizeImageSrc(src: string | null | undefined, fallbackSrc: string) {
  const value = src?.trim();
  return value ? value : fallbackSrc;
}

export function SafeImage({ src, fallbackSrc = FALLBACK_IMAGE_SRC, alt, ...props }: SafeImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(() => normalizeImageSrc(src, fallbackSrc));

  useEffect(() => {
    setResolvedSrc(normalizeImageSrc(src, fallbackSrc));
  }, [src, fallbackSrc]);

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={() => {
        if (resolvedSrc !== fallbackSrc) {
          setResolvedSrc(fallbackSrc);
        }
      }}
    />
  );
}

