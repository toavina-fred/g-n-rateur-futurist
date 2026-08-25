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
  if (type === "code128") return content.length === 9;
  return URL_REGEX.test(content.trim());
}

export function contentError(type: CodeType, content: string): string | null {
  if (type === "code128") {
    if (content.length === 0) return "Le contenu est requis (9 caractères exactement).";
    if (content.length < 9)
      return `Le contenu doit comporter exactement 9 caractères (${content.length}/9).`;
    return null;
  }
  if (content.trim().length === 0) return "Le contenu est requis (une URL valide).";
  if (!URL_REGEX.test(content.trim()))
    return "Format invalide : l'URL doit commencer par http:// ou https://";
  return null;
}

export function renderCode128(canvas: HTMLCanvasElement, s: CodeSettings) {
  JsBarcode(canvas, s.content, {
    format: "CODE128",
    width: Math.max(0.6, s.moduleWidth * PX_PER_MM),
    height: Math.max(1, s.moduleHeight * PX_PER_MM),
    displayValue: s.showText,
    background: s.bgColor,
    lineColor: s.barColor,
    font: s.fontFamily,
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
