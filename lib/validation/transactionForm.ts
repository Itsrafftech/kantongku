/** Shared inline-error copy for transaction forms (Mode Sederhana + Mode Jurnal). */

type Translate = (key: string) => string;

export function getDescriptionError(description: string, t: Translate): string | null {
  return description.trim() ? null : t("validation.descriptionRequired");
}

export function getDateError(date: string, t: Translate): string | null {
  return date ? null : t("validation.dateRequired");
}

export function getNominalError(amount: number, t: Translate): string | null {
  return amount > 0 ? null : t("validation.nominalPositive");
}
