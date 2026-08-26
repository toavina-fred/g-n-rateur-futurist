import type { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

/** Facteur de suréchantillonnage : pixels de canvas par millimètre. */
export const PX_PER_MM = 12;

export const PT_TO_MM = 0.352_777_8;

/**
 * Répartition (mm) mesurée sur un code-barres de référence produit par
 * Barcody : marges latérales autour des barres, marge au-dessus des barres,
 * espace entre les barres et le texte, et marge sous le texte.
 */
const CODE128_MARGIN_SIDE_MM = 3.5;
const CODE128_MARGIN_TOP_MM = 1.69;
const CODE128_TEXT_GAP_MM = 0.17;
const CODE128_MARGIN_BOTTOM_MM = 0.51;

export type CodeType = "code128" | "qrcode";

export type CodeSettings = {
  type: CodeType;
  content: string;
  moduleWidth: number; // mm
  totalWidth: number; // mm
  moduleHeight: number; // mm
  barColor: string;
  bgColor: string;
  showText: boolean;
  fontFamily: string;
  fontSize: number; // pt
  letterSpacing: number; // mm, espacement entre les caractères du texte affiché
};

export const URL_REGEX = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

export function isContentValid(type: CodeType, content: string): boolean {
  if (type === "code128") return content.length >= 9;
  return URL_REGEX.test(content.trim());
}

export function contentError(type: CodeType, content: string): string | null {
  if (type === "code128") {
    if (content.length === 0) return "Le contenu est requis (9 caractères minimum).";
    if (content.length < 9)
      return `Le contenu doit comporter 9 caractères minimum (${content.length}/9).`;
    return null;
  }
  if (content.trim().length === 0) return "Le contenu est requis (une URL valide).";
  if (!URL_REGEX.test(content.trim()))
    return "Format invalide : l'URL doit commencer par http:// ou https://";
  return null;
}

/**
 * jsPDF n'embarque que 3 polices natives utilisables ici (helvetica, times,
 * courier) : on associe chaque police du sélecteur à son équivalent natif le
 * plus proche, pour que l'aperçu (canvas) et l'export PDF affichent
 * exactement la même police au lieu de diverger.
 */
function classifyFontFamily(fontFamily: string): "courier" | "times" | "helvetica" {
  const normalized = fontFamily.toLowerCase();
  if (normalized.includes("courier")) return "courier";
  if (normalized.includes("times")) return "times";
  return "helvetica";
}

function mapFontFamilyToPdfFont(fontFamily: string): { family: string; style: string } {
  return { family: classifyFontFamily(fontFamily), style: "normal" };
}

function mapFontFamilyToCssStack(fontFamily: string): string {
  switch (classifyFontFamily(fontFamily)) {
    case "courier":
      return "'Courier New', Courier, monospace";
    case "times":
      return "'Times New Roman', Times, serif";
    default:
      return "Helvetica, Arial, sans-serif";
  }
}

/**
 * Le nombre de modules d'un Code 128 dépend de l'encodage du contenu : on
 * mesure d'abord la largeur "naturelle" pour 1 module de large, puis on en
 * déduit la largeur de module (mm) qui fera correspondre exactement le rendu
 * à `totalWidth` (la largeur code-barres demandée par l'utilisateur).
 */
function computeCode128ModuleWidthMm(s: CodeSettings): number {
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(probe, s.content, {
    format: "CODE128",
    width: 1,
    height: 1,
    displayValue: false,
    margin: 0,
  });
  const naturalWidth = parseFloat(probe.getAttribute("width") ?? "0");
  if (!Number.isFinite(naturalWidth) || naturalWidth <= 0) return s.moduleWidth;
  return s.totalWidth / naturalWidth;
}

/**
 * Dessine `text` centré sur `centerX`, en insérant `spacingPx` entre chaque
 * caractère. `ctx.letterSpacing` n'est pas fiable/disponible sur tous les
 * moteurs (et n'a pas d'équivalent dans jsPDF) : on mesure et positionne donc
 * chaque caractère manuellement, pour un rendu identique aperçu/PDF.
 */
function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  spacingPx: number,
) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, w) => a + w, 0) + spacingPx * Math.max(0, chars.length - 1);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let x = centerX - totalWidth / 2;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += (widths[i] ?? 0) + spacingPx;
  });
  ctx.textAlign = prevAlign;
}

export function renderCode128(canvas: HTMLCanvasElement, s: CodeSettings) {
  const moduleWidthMm = computeCode128ModuleWidthMm(s);
  const barsCanvas = document.createElement("canvas");
  JsBarcode(barsCanvas, s.content, {
    format: "CODE128",
    width: Math.max(0.6, moduleWidthMm * PX_PER_MM),
    height: Math.max(1, s.moduleHeight * PX_PER_MM),
    displayValue: false,
    lineColor: s.barColor,
    margin: 0,
  });

  const sideMarginPx = CODE128_MARGIN_SIDE_MM * PX_PER_MM;
  const topMarginPx = CODE128_MARGIN_TOP_MM * PX_PER_MM;
  const gapPx = CODE128_TEXT_GAP_MM * PX_PER_MM;
  const bottomMarginPx = CODE128_MARGIN_BOTTOM_MM * PX_PER_MM;
  const fontSizePx = Math.max(1, s.fontSize * PT_TO_MM * PX_PER_MM);
  const textSpacePx = s.showText ? gapPx + fontSizePx + bottomMarginPx : bottomMarginPx;

  canvas.width = barsCanvas.width + 2 * sideMarginPx;
  canvas.height = topMarginPx + barsCanvas.height + textSpacePx;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = s.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(barsCanvas, sideMarginPx, topMarginPx);

  if (!s.showText) return;

  const spacingPx = s.letterSpacing * PX_PER_MM;
  ctx.font = `${fontSizePx}px ${mapFontFamilyToCssStack(s.fontFamily)}`;
  ctx.fillStyle = s.barColor;
  ctx.textBaseline = "top";
  drawSpacedText(
    ctx,
    s.content,
    canvas.width / 2,
    topMarginPx + barsCanvas.height + gapPx,
    spacingPx,
  );
}

export async function renderQrCode(canvas: HTMLCanvasElement, s: CodeSettings) {
  const { cell } = computeQrLayout(s);
  await QRCode.toCanvas(canvas, s.content.trim(), {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: Math.max(1, Math.round(cell * PX_PER_MM)),
    color: { dark: s.barColor, light: s.bgColor },
  });
  // qrcode force des dimensions inline : on les rend au format millimétrique.
  canvas.style.width = `${s.totalWidth}mm`;
  canvas.style.height = "auto";
}

function buildCode128Svg(
  s: CodeSettings,
): { svg: SVGSVGElement; barsWidth: number; width: number; height: number } {
  const moduleWidthMm = computeCode128ModuleWidthMm(s);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, s.content, {
    format: "CODE128",
    width: moduleWidthMm,
    height: s.moduleHeight,
    displayValue: false,
    margin: 0,
    lineColor: s.barColor,
  });

  const barsWidth = parseFloat(svg.getAttribute("width") ?? "0");
  let totalHeight = CODE128_MARGIN_TOP_MM + s.moduleHeight;
  totalHeight += s.showText
    ? CODE128_TEXT_GAP_MM + s.fontSize * PT_TO_MM + CODE128_MARGIN_BOTTOM_MM
    : CODE128_MARGIN_BOTTOM_MM;

  return { svg, barsWidth, width: barsWidth + 2 * CODE128_MARGIN_SIDE_MM, height: totalHeight };
}

/** Dimensions (mm) qu'occupera le Code 128 une fois rendu, sans dessiner. */
export function measureCode128(s: CodeSettings): { width: number; height: number } {
  const { width, height } = buildCode128Svg(s);
  return { width, height };
}

/**
 * Dessine le Code 128 directement en vecteur dans le PDF (au lieu d'une image
 * raster) pour un rendu net à toute résolution d'impression/zoom.
 */
export function drawCode128ToPdf(
  doc: jsPDF,
  x: number,
  y: number,
  s: CodeSettings,
): { width: number; height: number } {
  const { svg, barsWidth, width: totalWidth } = buildCode128Svg(s);
  const barsX = x + CODE128_MARGIN_SIDE_MM;
  const barsY = y + CODE128_MARGIN_TOP_MM;

  doc.setFillColor(s.barColor);
  svg.querySelectorAll("g > rect").forEach((rect) => {
    const rx = parseFloat(rect.getAttribute("x") ?? "0");
    const ry = parseFloat(rect.getAttribute("y") ?? "0");
    const rw = parseFloat(rect.getAttribute("width") ?? "0");
    const rh = parseFloat(rect.getAttribute("height") ?? "0");
    doc.rect(barsX + rx, barsY + ry, rw, rh, "F");
  });

  let totalHeight = CODE128_MARGIN_TOP_MM + s.moduleHeight;
  if (s.showText) {
    const textHeight = s.fontSize * PT_TO_MM;
    const pdfFont = mapFontFamilyToPdfFont(s.fontFamily);
    doc.setFont(pdfFont.family, pdfFont.style);
    doc.setFontSize(s.fontSize);
    doc.setTextColor(s.barColor);

    const chars = [...s.content];
    const widths = chars.map((c) => doc.getTextWidth(c));
    const totalTextWidth =
      widths.reduce((a, w) => a + w, 0) + s.letterSpacing * Math.max(0, chars.length - 1);
    const textY = barsY + s.moduleHeight + CODE128_TEXT_GAP_MM + textHeight;
    let charX = barsX + barsWidth / 2 - totalTextWidth / 2;
    chars.forEach((c, i) => {
      doc.text(c, charX, textY);
      charX += (widths[i] ?? 0) + s.letterSpacing;
    });

    totalHeight += CODE128_TEXT_GAP_MM + textHeight + CODE128_MARGIN_BOTTOM_MM;
  } else {
    totalHeight += CODE128_MARGIN_BOTTOM_MM;
  }

  return { width: totalWidth, height: totalHeight };
}

function computeQrLayout(s: CodeSettings) {
  const qr = QRCode.create(s.content.trim(), { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const quietZone = 2;
  const cell = s.totalWidth / (size + quietZone * 2);
  return { qr, size, quietZone, cell, totalSize: (size + quietZone * 2) * cell };
}

/** Dimensions (mm) qu'occupera le QR code une fois rendu, sans dessiner. */
export function measureQrCode(s: CodeSettings): { width: number; height: number } {
  const { totalSize } = computeQrLayout(s);
  return { width: totalSize, height: totalSize };
}

/**
 * Dessine le QR code directement en vecteur (rectangles par module) dans le
 * PDF, pour un rendu net à toute résolution d'impression/zoom.
 */
export function drawQrCodeToPdf(
  doc: jsPDF,
  x: number,
  y: number,
  s: CodeSettings,
): { width: number; height: number } {
  const { qr, size, quietZone, cell, totalSize } = computeQrLayout(s);

  doc.setFillColor(s.bgColor);
  doc.rect(x, y, totalSize, totalSize, "F");
  doc.setFillColor(s.barColor);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) {
        doc.rect(x + (col + quietZone) * cell, y + (row + quietZone) * cell, cell, cell, "F");
      }
    }
  }

  return { width: totalSize, height: totalSize };
}
