import type { Locale } from "./i18n";
import type { CloudPersonality } from "./cloudData";

export type PosterPreset = "story" | "square";

/** Story: 1080×1920. Square: 1080×1080. Rendered at 2x internally, exported at 1x for crisp PNG. */
const PRESETS = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
} as const;

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

/** Draw soft cloud shapes for atmosphere. */
function drawCloudShapes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  const scale = Math.min(w, h) / 1080;
  const shapes = [
    { x: 0.15 * w, y: 0.18 * h, rw: 220 * scale, rh: 100 * scale },
    { x: 0.72 * w, y: 0.22 * h, rw: 180 * scale, rh: 80 * scale },
    { x: 0.5 * w, y: 0.75 * h, rw: 260 * scale, rh: 110 * scale },
    { x: 0.08 * w, y: 0.68 * h, rw: 140 * scale, rh: 70 * scale },
    { x: 0.82 * w, y: 0.7 * h, rw: 160 * scale, rh: 75 * scale },
  ];
  shapes.forEach(({ x, y, rw, rh }) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rw / 2, rh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** Subtle radial glow behind mascot. */
function drawMascotGlow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  accentHex: string
) {
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    radius
  );
  gradient.addColorStop(0, accentHex + "50");
  gradient.addColorStop(0.45, accentHex + "20");
  gradient.addColorStop(1, "transparent");
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 10000, 10000); /* cover full canvas regardless of size */
  ctx.restore();
}

/** Draw QR code onto a canvas and return that canvas. Uses qrcode library. */
async function drawQRToCanvas(
  shareUrl: string,
  sizePx: number,
  margin: number = 2
): Promise<HTMLCanvasElement> {
  const QRCode = (await import("qrcode")).default;
  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  await new Promise<void>((resolve, reject) => {
    QRCode.toCanvas(
      canvas,
      shareUrl,
      {
        margin,
        width: sizePx,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      },
      (err: Error | null) => (err ? reject(err) : resolve())
    );
  });
  return canvas;
}

export interface GenerateSharePosterOptions {
  preset: PosterPreset;
  cloud: CloudPersonality;
  shareUrl: string;
  origin: string;
  locale: Locale;
}

/**
 * Generate a cinematic share poster (story or square). High-quality PNG;
 * runs in browser. Returns PNG Blob for export; preview can add shimmer in UI.
 */
export async function generateSharePoster(
  options: GenerateSharePosterOptions
): Promise<Blob> {
  const { preset, cloud, shareUrl, origin, locale } = options;
  const { width: W, height: H } = PRESETS[preset];
  const scale = 2;
  const cw = W * scale;
  const ch = H * scale;

  const logoUrl = `${origin}/logo-white.svg`;
  const mascotUrl = `${origin}/brand/ip-count-down.svg`;
  const [logoImg, mascotImg] = await Promise.all([
    loadImage(logoUrl),
    loadImage(mascotUrl),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context not available");

  const s = (x: number) => x * scale;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, TOP_BLUE);
  bg.addColorStop(1, BOTTOM_BLUE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
  drawCloudShapes(ctx, cw, ch);

  // —— 1. Logo (small, top center) ——
  const logoMaxW = s(240);
  const logoMaxH = s(48);
  const logoAspect = logoImg.width / logoImg.height;
  let logoW = logoMaxW;
  let logoH = logoW / logoAspect;
  if (logoH > logoMaxH) {
    logoH = logoMaxH;
    logoW = logoH * logoAspect;
  }
  const logoX = (cw - logoW) / 2;
  const logoY = s(56);
  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);

  // —— 2. Central hero (mascot, contain-fit, centered) ——
  const isStory = preset === "story";
  const heroTop = isStory ? s(180) : s(140);
  const heroHeight = isStory ? s(520) : s(380);
  const heroCenterY = heroTop + heroHeight / 2;
  const heroCenterX = cw / 2;
  const mascotMaxW = s(520);
  const mascotMaxH = heroHeight;
  let mW = mascotImg.width;
  let mH = mascotImg.height;
  const mRatio = mW / mH;
  if (mW > mascotMaxW || mH > mascotMaxH) {
    if (mascotMaxW / mRatio <= mascotMaxH) {
      mW = mascotMaxW;
      mH = mW / mRatio;
    } else {
      mH = mascotMaxH;
      mW = mH * mRatio;
    }
  }
  const mascotX = heroCenterX - mW / 2;
  const mascotY = heroCenterY - mH / 2;
  const glowRadius = Math.max(mW, mH) * 0.65;
  drawMascotGlow(ctx, heroCenterX, heroCenterY, glowRadius, cloud.accentHex);
  ctx.drawImage(mascotImg, mascotX, mascotY, mW, mH);

  // —— 3. Identity text ——
  const iAmText = locale === "vi" ? "Tôi là" : "I am";
  const cloudName = locale === "vi" ? cloud.name : cloud.nameEn;
  const textCenterY = isStory ? s(780) : s(600);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `500 ${s(32)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(iAmText, cw / 2, textCenterY - s(36));
  ctx.restore();

  ctx.save();
  ctx.shadowColor = cloud.accentHex;
  ctx.shadowBlur = s(28);
  ctx.fillStyle = cloud.accentHex;
  ctx.font = `700 ${s(56)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cloudName, cw / 2, textCenterY + s(8));
  ctx.shadowBlur = 0;
  ctx.fillText(cloudName, cw / 2, textCenterY + s(8));
  ctx.restore();

  // —— 4. QR block (bottom center): rounded white card + QR + caption ——
  const qrLogicalSize = 200;
  const qrPx = qrLogicalSize * scale;
  const qrCanvas = await drawQRToCanvas(shareUrl, qrPx, 2);
  const cardPadding = s(28);
  const cardRadius = s(24);
  const captionGap = s(12);
  const captionText = locale === "vi" ? "Tìm mây của bạn" : "Find your cloud";
  const qrBlockW = qrPx + cardPadding * 2;
  const qrBlockH = qrPx + cardPadding * 2 + captionGap + s(22);
  const qrBlockX = (cw - qrBlockW) / 2;
  const qrBlockY = ch - qrBlockH - (isStory ? s(72) : s(56));

  // Soft shadow under card
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = s(24);
  ctx.shadowOffsetY = s(8);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrBlockX, qrBlockY, qrBlockW, qrBlockH, cardRadius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrBlockX, qrBlockY, qrBlockW, qrBlockH, cardRadius);
  ctx.fill();
  ctx.drawImage(
    qrCanvas,
    qrBlockX + cardPadding,
    qrBlockY + cardPadding,
    qrPx,
    qrPx
  );
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `500 ${s(20)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    captionText,
    cw / 2,
    qrBlockY + cardPadding + qrPx + captionGap + s(11)
  );
  ctx.restore();

  // Export at 1x (1080) for crisp, smaller file
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas 2d not available");
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(canvas, 0, 0, cw, ch, 0, 0, W, H);

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export PNG"))),
      "image/png",
      1
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
