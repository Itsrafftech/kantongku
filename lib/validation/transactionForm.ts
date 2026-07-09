/** Shared inline-error copy for transaction forms (Mode Sederhana + Mode Jurnal). */

export function getDescriptionError(description: string): string | null {
  return description.trim() ? null : "Isi deskripsi transaksi";
}

export function getDateError(date: string): string | null {
  return date ? null : "Isi tanggal transaksi";
}

export function getNominalError(amount: number): string | null {
  return amount > 0 ? null : "Nominal harus lebih dari 0";
}
