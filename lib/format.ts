const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value);
}

export function formatDateID(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Long-form date (e.g. "14 Juli 2026" / "14 July 2026"). Defaults to id-ID for unmigrated callers. */
export function formatDateLongID(value: Date | string, lang: "id" | "en" = "id"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Formats a Date to yyyy-MM-dd for <input type="date"> values. */
export function toInputDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}
