"use client";

/** Holds overlay only. Background comes from html/body (#0B0B0F) — no layered background here. */
export default function BrandBackground() {
  return (
    <>
      <div
        className="fixed inset-0 -z-10 opacity-70 overflow-hidden pointer-events-none animate-holds-layer"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/holds.svg"
          alt=""
          className="w-full h-full object-cover"
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </div>
    </>
  );
}
