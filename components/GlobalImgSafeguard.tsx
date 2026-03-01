"use client";

import { useEffect, useRef } from "react";

function isValidSrc(src: string | null | undefined): boolean {
  return typeof src === "string" && src.trim().length > 0;
}

function hideImgAndLog(img: HTMLImageElement, reason: string) {
  img.style.display = "none";
  try {
    console.warn("[GlobalImgSafeguard]", reason, img.src || "(no src)");
  } catch (_) {}
}

/**
 * Global safeguard: hide any img with invalid or empty src, and hide imgs that fail to load.
 * Prevents broken image icons (e.g. top-left after idle on mobile) from any source.
 */
export default function GlobalImgSafeguard() {
  const seenRef = useRef<WeakSet<HTMLImageElement>>(new WeakSet());

  useEffect(() => {
    const hideInvalid = () => {
      try {
        const imgs = document.querySelectorAll("img");
        imgs.forEach((img) => {
          if (!isValidSrc(img.getAttribute("src"))) {
            hideImgAndLog(img, "Hid img with invalid/empty src:");
          }
        });
      } catch (_) {}
    };

    const attachErrorHandler = (img: HTMLImageElement) => {
      if (seenRef.current.has(img)) return;
      seenRef.current.add(img);
      img.addEventListener(
        "error",
        () => hideImgAndLog(img, "Image load failed, hid element:"),
        { once: true }
      );
    };

    const processNodes = () => {
      hideInvalid();
      try {
        document.querySelectorAll("img").forEach(attachErrorHandler);
      } catch (_) {}
    };

    processNodes();

    const observer = new MutationObserver(processNodes);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
