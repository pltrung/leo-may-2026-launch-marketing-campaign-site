"use client";

type CloudsEntranceStep = "background" | "holds" | "content";

/** Post-Explore hero uses the same background as the explore screen (persistent starfield from LandingFlow). No holds layer so the world is one continuous star world. Pick-your-cloud uses its own starfield — no holds. */
export default function BrandBackground({
  cloudsView,
  cloudsEntranceStep,
}: {
  cloudsView?: boolean;
  cloudsEntranceStep?: CloudsEntranceStep;
}) {
  return null;
}
