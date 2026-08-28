import type { CodeSettings, CodeType } from "./codegen";

/**
 * Instantané en mémoire du formulaire (perdu au rafraîchissement, volontairement) :
 * permet de conserver les réglages en naviguant entre "/" et "/import" sans
 * les faire transiter par l'URL ni les stocker sur disque.
 */
export type FormSnapshot = Omit<CodeSettings, "moduleWidth"> & {
  totalWidthByType: Record<CodeType, number>;
};

let snapshot: FormSnapshot | undefined;

export function setFormSnapshot(next: FormSnapshot): void {
  snapshot = next;
}

export function getFormSnapshot(): FormSnapshot | undefined {
  return snapshot;
}
