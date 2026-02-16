import type { Locale } from "./i18n";
import type { CloudPersonality } from "./cloudData";

const SIZE = 1080;
const TOP_BLUE = "#1D4ED8";
const BOTTOM_BLUE = "#2563EB";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Draw soft cloud shapes (ellipses) for atmosphere. */
function drawCloudShapes(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  const shapes = [
    { x: 0.15 * SIZE, y: 0.18 * SIZE, w: 220, h: 100 },
    { x: 0.72 * SIZE, y: 0.22 * SIZE, w: 180, h: 80 },
    { x: 0.5 * SIZE, y: 0.75 * SIZE, w: 260, h: 110 },
    { x: 0.08 * SIZE, y: 0.68 * SIZE, w: 140, h: 70 },
    { x: 0.82 * SIZE, y: 0.7 * SIZE, w: 160, h: 75 },
  ];
  shapes.forEach(({ x, y, w, h }) => {
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** Draw soft floating particles. */
function drawParticles(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  const particles = [
    { x: 0.12 * SIZE, y: 0.4 * SIZE, r: 4 },
    { x: 0.88 * SIZE, y: 0.35 * SIZE, r: 3 },
    { x: 0.2 * SIZE, y: 0.82 * SIZE, r: 5 },
    { x: 0.78 * SIZE, y: 0.78 * SIZE, r: 3 },
    { x: 0.5 * SIZE, y: 0.28 * SIZE, r: 2 },
  ];
  particles.forEach(({ x, y, r }) => {
    ctx.globalAlpha = 0.25 + Math.sin(x + y) * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** Draw radial glow behind mascot. */
function drawMascotGlow(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, accentHex: string) {
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
  gradient.addColorStop(0, accentHex + "40");
  gradient.addColorStop(0.5, accentHex + "18");
  gradient.addColorStop(1, "transparent");
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();
}

export interface GenerateCardOptions {
  locale: Locale;
  cloud: CloudPersonality;
  /** Base URL for assets (e.g. window.location.origin). */
  origin: string;
}

/**
 * Generate a 1080×1080 PNG identity card image. Uses canvas; run in browser.
 * Resolves with PNG Blob for sharing or download.
 */
export async function generateCloudIdentityCard(options: GenerateCardOptions): Promise<Blob> {
  const { locale, cloud, origin } = options;
  const logoUrl = `${origin}/logo-white.svg`;
  const mascotUrl = `${origin}/brand/ip-count-down.svg`;

  const [logoImg, mascotImg] = await Promise.all([loadImage(logoUrl), loadImage(mascotUrl)]);

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context not available");

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, SIZE);
  bg.addColorStop(0, TOP_BLUE);
  bg.addColorStop(1, BOTTOM_BLUE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle cloud shapes
  drawCloudShapes(ctx);

  // Top: logo
  const logoW = 280;
  const logoH = 56;
  const logoX = (SIZE - logoW) / 2;
  const logoY = 72;
  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);

  // Location line
  const locationText = locale === "vi" ? "Sài Gòn 2026" : "Saigon 2026";
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "500 28px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(locationText, SIZE / 2, 168);
  ctx.restore();

  // Center: mascot with glow
  const mascotW = 320;
  const mascotH = 280;
  const mascotX = (SIZE - mascotW) / 2;
  const mascotY = 260;
  drawMascotGlow(ctx, SIZE / 2, mascotY + mascotH / 2, cloud.accentHex);
  ctx.drawImage(mascotImg, mascotX, mascotY, mascotW, mascotH);

  // "I am" / "Tôi là"
  const iAmText = locale === "vi" ? "Tôi là" : "I am";
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "500 36px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(iAmText, SIZE / 2, 600);
  ctx.restore();

  // Cloud name with glow
  const cloudName = locale === "vi" ? cloud.name : cloud.nameEn;
  ctx.save();
  ctx.shadowColor = cloud.accentHex;
  ctx.shadowBlur = 32;
  ctx.fillStyle = cloud.accentHex;
  ctx.font = "700 64px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cloudName, SIZE / 2, 670);
  ctx.shadowBlur = 0;
  ctx.fillText(cloudName, SIZE / 2, 670);
  ctx.restore();

  // Soft particles
  drawParticles(ctx);

  // Bottom: CTA line
  const ctaText = locale === "vi" ? "Bạn là mây nào?" : "Find your cloud";
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "500 30px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, SIZE / 2, 920);
  ctx.restore();

  // leo-may.com
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("leo-may.com", SIZE / 2, 970);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export PNG"))),
      "image/png",
      1
    );
  });
}
