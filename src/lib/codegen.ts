import type { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

/** Facteur de suréchantillonnage : pixels de canvas par millimètre. */
export const PX_PER_MM = 12;

export const PT_TO_MM = 0.352_777_8;

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

export function renderCode128(canvas: HTMLCanvasElement, s: CodeSettings) {
  JsBarcode(canvas, s.content, {
    format: "CODE128",
    width: Math.max(0.6, s.moduleWidth * PX_PER_MM),
    height: Math.max(1, s.moduleHeight * PX_PER_MM),
    displayValue: s.showText,
    background: s.bgColor,
    lineColor: s.barColor,
    font: mapFontFamilyToCssStack(s.fontFamily),
    fontSize: Math.max(1, s.fontSize * PT_TO_MM * PX_PER_MM),
    textMargin: 1 * PX_PER_MM * 0.3,
    margin: Math.round(0.5 * PX_PER_MM),
  });
}

export async function renderQrCode(canvas: HTMLCanvasElement, s: CodeSettings) {
  await QRCode.toCanvas(canvas, s.content.trim(), {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: Math.max(1, Math.round(s.moduleWidth * PX_PER_MM)),
    color: { dark: s.barColor, light: s.bgColor },
  });
  // qrcode force des dimensions inline : on les rend au format millimétrique.
  canvas.style.width = `${s.totalWidth}mm`;
  canvas.style.height = "auto";
}

function buildCode128Svg(s: CodeSettings): { svg: SVGSVGElement; width: number; height: number } {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, s.content, {
    format: "CODE128",
    width: s.moduleWidth,
    height: s.moduleHeight,
    displayValue: false,
    margin: 0,
    lineColor: s.barColor,
  });

  const barsWidth = parseFloat(svg.getAttribute("width") ?? "0");
  let totalHeight = s.moduleHeight;
  if (s.showText) totalHeight += 1 + s.fontSize * PT_TO_MM;

  return { svg, width: barsWidth, height: totalHeight };
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
  const { svg, width: barsWidth } = buildCode128Svg(s);

  doc.setFillColor(s.barColor);
  svg.querySelectorAll("g > rect").forEach((rect) => {
    const rx = parseFloat(rect.getAttribute("x") ?? "0");
    const ry = parseFloat(rect.getAttribute("y") ?? "0");
    const rw = parseFloat(rect.getAttribute("width") ?? "0");
    const rh = parseFloat(rect.getAttribute("height") ?? "0");
    doc.rect(x + rx, y + ry, rw, rh, "F");
  });

  let totalHeight = s.moduleHeight;
  if (s.showText) {
    const textMargin = 1;
    const textHeight = s.fontSize * PT_TO_MM;
    const pdfFont = mapFontFamilyToPdfFont(s.fontFamily);
    doc.setFont(pdfFont.family, pdfFont.style);
    doc.setFontSize(s.fontSize);
    doc.setTextColor(s.barColor);
    doc.text(s.content, x + barsWidth / 2, y + s.moduleHeight + textMargin + textHeight, {
      align: "center",
    });
    totalHeight += textMargin + textHeight;
  }

  return { width: barsWidth, height: totalHeight };
}

function computeQrLayout(s: CodeSettings) {
  const qr = QRCode.create(s.content.trim(), { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const quietZone = 2;
  const cell = s.moduleWidth;
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
