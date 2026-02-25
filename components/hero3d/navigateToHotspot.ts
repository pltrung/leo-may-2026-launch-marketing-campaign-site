/**
 * Navigate to hotspot.href: scroll to section by id or use router.
 * Supports "/#arena" or "#arena" → document.getElementById("arena")?.scrollIntoView({ behavior: "smooth" })
 */

export function navigateToHotspotHref(href: string): void {
  const hash = href.includes("#") ? href.split("#")[1] : null;
  if (hash) {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
  if (typeof window !== "undefined") {
    window.location.href = href;
  }
}
