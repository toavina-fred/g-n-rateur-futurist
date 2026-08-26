import type { CodeSettings, CodeType } from "./codegen";

export type StoredSettings = Omit<CodeSettings, "content">;

function storageKey(type: CodeType): string {
  return `codeflux:settings:${type}`;
}

/** Sauvegarde les réglages courants d'un type de code pour les réutiliser (ex. lors d'un import). */
export function saveSettings(type: CodeType, settings: StoredSettings): void {
  try {
    localStorage.setItem(storageKey(type), JSON.stringify(settings));
  } catch {
    /* stockage indisponible, on ignore */
  }
}

/** Récupère les derniers réglages sauvegardés pour un type de code, ou null si absents. */
export function loadSettings(type: CodeType): StoredSettings | null {
  try {
    const raw = localStorage.getItem(storageKey(type));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    if (parsed.type !== type) return null;
    return parsed as StoredSettings;
  } catch {
    return null;
  }
}
