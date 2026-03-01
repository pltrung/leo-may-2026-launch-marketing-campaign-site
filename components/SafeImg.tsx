"use client";

import React, { useState, useCallback } from "react";

/** Returns true if value is a non-empty string suitable for img src. */
export function isValidImgSrc(src: unknown): src is string {
  return typeof src === "string" && src.trim().length > 0;
}

type SafeImgProps = React.ImgHTMLAttributes<HTMLImageElement>;

/**
 * Renders an img only when src is valid. Logs and hides on load error to prevent broken image icon.
 * Use for hero and any section where invalid/failed src must not show a broken icon.
 */
export default function SafeImg({ src, onError, ...props }: SafeImgProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const el = e.currentTarget;
      if (el?.src) {
        try {
          console.warn("[SafeImg] Image failed to load:", el.src);
        } catch (_) {}
      }
      setLoadFailed(true);
      onError?.(e);
    },
    [onError]
  );

  if (!isValidImgSrc(src)) {
    return null;
  }

  if (loadFailed) {
    return null;
  }

  return (
    <img
      {...props}
      src={src}
      onError={handleError}
    />
  );
}
