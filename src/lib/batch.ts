import {
  drawCode128ToPdf,
  drawQrCodeToPdf,
  isContentValid,
  measureCode128,
  measureQrCode,
  URL_REGEX,
  type CodeSettings,
  type CodeType,
} from "./codegen";

export const CODE128_PRESET: Omit<CodeSettings, "content"> = {
  type: "code128",
  moduleWidth: 0.347,
  totalWidth: 35,
  moduleHeight: 4,
  barColor: "#000000",
  bgColor: "#FFFFFF",
  showText: true,
  fontFamily: "Helvetica Neue",
  fontSize: 7,
  letterSpacing: 1.37,
};

export const QRCODE_PRESET: Omit<CodeSettings, "content"> = {
  type: "qrcode",
  moduleWidth: 0.952,
  totalWidth: 20,
  moduleHeight: 4,
  barColor: "#000000",
  bgColor: "#FFFFFF",
  showText: false,
  fontFamily: "Helvetica Neue",
  fontSize: 7,
  letterSpacing: 0,
};

export const FORMAT_ERROR = "Format non reconnu : ni URL ni 9 caractères minimum";

/** Détecte le type de code à générer pour une valeur donnée. */
export function detectType(raw: string): CodeType | null {
  const value = raw.trim();
  if (URL_REGEX.test(value)) return "qrcode";
  if (value.length >= 9) return "code128";
  return null;
}

/** Transforme un contenu en nom de fichier sûr. */
export function safeFileName(raw: string): string {
  const base = raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base.length > 0 ? base : "code";
}

/** Réglages de style transmis depuis le formulaire manuel vers l'import par lot. */
export type StyleOverrides = Partial<
  Pick<
    CodeSettings,
    | "barColor"
    | "bgColor"
    | "showText"
    | "fontFamily"
    | "fontSize"
    | "letterSpacing"
    | "moduleHeight"
    | "totalWidth"
  >
>;

/** Génère un PDF (Blob) pour un contenu et un type détecté. */
export async function generatePdfBlob(
  content: string,
  type: CodeType,
  styleOverrides?: StyleOverrides,
): Promise<Blob> {
  const preset = type === "code128" ? CODE128_PRESET : QRCODE_PRESET;
  const totalWidth = styleOverrides?.totalWidth ?? preset.totalWidth;
  const moduleWidth = (preset.moduleWidth / preset.totalWidth) * totalWidth;
  const settings: CodeSettings = {
    ...preset,
    ...styleOverrides,
    moduleWidth,
    totalWidth,
    content: content.trim(),
  };
  if (!isContentValid(type, settings.content)) throw new Error(FORMAT_ERROR);

  const { default: jsPDF } = await import("jspdf");
  const measure = type === "code128" ? measureCode128(settings) : measureQrCode(settings);
  const margin = 1;
  const doc = new jsPDF({
    unit: "mm",
    orientation: "landscape",
    format: [measure.width + margin * 2, measure.height + margin * 2],
  });
  if (type === "code128") drawCode128ToPdf(doc, margin, margin, settings);
  else drawQrCodeToPdf(doc, margin, margin, settings);
  return doc.output("blob");
}

export type ParsedRow = { content: string; type: CodeType | null };

/** Lit un fichier Excel et extrait la colonne "Contenu". */
export async function parseExcel(file: File): Promise<ParsedRow[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error("Le fichier Excel ne contient aucune feuille.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (rows.length === 0) throw new Error("Le fichier importé est vide.");

  const header = Object.keys(rows[0] ?? {});
  const column = header.find((key) => key.trim().toLowerCase() === "contenu");
  if (!column)
    throw new Error(
      `Colonne « Contenu » introuvable. Colonnes détectées : ${header.join(", ") || "aucune"}.`,
    );

  return rows
    .map((row) => String(row[column] ?? "").trim())
    .filter((content) => content.length > 0)
    .map((content) => ({ content, type: detectType(content) }));
}
