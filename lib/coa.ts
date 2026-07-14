import type { AccountType, NormalBalance } from "@prisma/client";

export const RETAINED_EARNINGS_CODE = "303"; // Laba Ditahan
export const PRIVE_CODE = "302"; // Prive — owner withdrawals
export const MODAL_CODE = "301"; // Modal Pemilik — target of period closing (revenue/expense/prive close here)
export const IKHTISAR_LABA_RUGI_CODE = "399"; // Ikhtisar Laba Rugi — closing intermediary account
export const KAS_ACCOUNT_CODE = "101"; // Kas — default cash side for Mode Sederhana entries

/**
 * Converts an account's own-normal-balance-signed amount into the sign
 * convention of its section's dominant normal balance. Needed whenever a
 * report sums accounts of one type together (e.g. all EKUITAS accounts):
 * contra accounts (like Prive, a DEBIT-normal account inside the
 * credit-normal Ekuitas section) must be subtracted, not added — without
 * this flip, a naive sum double-counts the contra balance in the wrong
 * direction (e.g. Prive inflates Ekuitas instead of reducing it).
 */
export function canonicalAmount(
  account: { type: AccountType; normalBalance: NormalBalance },
  ownNormalBalanceAmount: number,
): number {
  const sectionNormal = defaultNormalBalanceForType(account.type);
  return account.normalBalance === sectionNormal ? ownNormalBalanceAmount : -ownNormalBalanceAmount;
}

export function defaultNormalBalanceForType(type: AccountType): NormalBalance {
  switch (type) {
    case "ASET":
    case "HPP":
    case "BEBAN":
      return "DEBIT";
    case "LIABILITAS":
    case "EKUITAS":
    case "PENDAPATAN":
      return "KREDIT";
  }
}

export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  "ASET",
  "LIABILITAS",
  "EKUITAS",
  "PENDAPATAN",
  "HPP",
  "BEBAN",
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASET: "Aset",
  LIABILITAS: "Liabilitas",
  EKUITAS: "Ekuitas",
  PENDAPATAN: "Pendapatan",
  HPP: "Harga Pokok Penjualan (HPP)",
  BEBAN: "Beban Operasional",
};

const ACCOUNT_TYPE_LABELS_EN: Record<AccountType, string> = {
  ASET: "Assets",
  LIABILITAS: "Liabilities",
  EKUITAS: "Equity",
  PENDAPATAN: "Revenue",
  HPP: "Cost of Goods Sold (COGS)",
  BEBAN: "Operating Expenses",
};

/** Display-only label for an account type. Never affects the stored enum value. */
export function getAccountTypeLabel(type: AccountType, lang: "id" | "en"): string {
  return lang === "en" ? ACCOUNT_TYPE_LABELS_EN[type] : ACCOUNT_TYPE_LABELS[type];
}

// Report-classification conventions (used by lib/reports builders):
export const OTHER_INCOME_CODES = ["403"]; // Pendapatan Lain-lain — outside Pendapatan Usaha
export const OTHER_EXPENSE_CODES = ["609", "610"]; // Beban Bunga Bank & Beban Lain-lain — outside Beban Operasional
export const FIXED_ASSET_CODE_THRESHOLD = "120"; // ASET code >= this is Aset Tetap, else Aset Lancar
export const LONG_TERM_LIABILITY_CODE_THRESHOLD = "210"; // LIABILITAS code >= this is Jangka Panjang

export function isFixedAssetCode(code: string): boolean {
  return code >= FIXED_ASSET_CODE_THRESHOLD;
}

export function isLongTermLiabilityCode(code: string): boolean {
  return code >= LONG_TERM_LIABILITY_CODE_THRESHOLD;
}

export type CashFlowBucket = "OPERASI" | "INVESTASI" | "PENDANAAN";

/**
 * Classifies a non-cash account into a cash-flow activity bucket. Only fixed
 * assets (Aset Tetap) count as Investasi — current assets like Piutang and
 * Persediaan move with the normal sales cycle and belong in Operasi, same as
 * SAK EMKM's operating-activity definition. Liabilitas/Ekuitas (loans,
 * capital, prive) are Pendanaan; everything else (Pendapatan/HPP/Beban) is
 * Operasi.
 */
export function getCashFlowBucket(code: string): CashFlowBucket {
  const prefix = code.trim()[0];
  if (prefix === "1") return isFixedAssetCode(code) ? "INVESTASI" : "OPERASI";
  if (prefix === "2" || prefix === "3") return "PENDANAAN";
  return "OPERASI";
}

export interface DefaultAccount {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isCashAccount?: boolean;
}

/** Default SAK EMKM-aligned chart of accounts for a new company. */
export const DEFAULT_COA: DefaultAccount[] = [
  // 1xx — Aset
  { code: "101", name: "Kas", type: "ASET", normalBalance: "DEBIT", isCashAccount: true },
  { code: "102", name: "Bank", type: "ASET", normalBalance: "DEBIT", isCashAccount: true },
  { code: "103", name: "Piutang Usaha", type: "ASET", normalBalance: "DEBIT" },
  { code: "104", name: "Persediaan Barang Dagang", type: "ASET", normalBalance: "DEBIT" },
  { code: "105", name: "Perlengkapan", type: "ASET", normalBalance: "DEBIT" },
  { code: "106", name: "Sewa Dibayar di Muka", type: "ASET", normalBalance: "DEBIT" },
  { code: "121", name: "Tanah", type: "ASET", normalBalance: "DEBIT" },
  { code: "122", name: "Bangunan", type: "ASET", normalBalance: "DEBIT" },
  { code: "123", name: "Peralatan", type: "ASET", normalBalance: "DEBIT" },
  { code: "124", name: "Kendaraan", type: "ASET", normalBalance: "DEBIT" },
  { code: "125", name: "Akumulasi Penyusutan Aset Tetap", type: "ASET", normalBalance: "KREDIT" },

  // 2xx — Liabilitas
  { code: "201", name: "Utang Usaha", type: "LIABILITAS", normalBalance: "KREDIT" },
  { code: "202", name: "Utang Bank", type: "LIABILITAS", normalBalance: "KREDIT" },
  { code: "203", name: "Utang Pajak", type: "LIABILITAS", normalBalance: "KREDIT" },

  // 3xx — Ekuitas
  { code: "301", name: "Modal Pemilik", type: "EKUITAS", normalBalance: "KREDIT" },
  { code: PRIVE_CODE, name: "Prive", type: "EKUITAS", normalBalance: "DEBIT" },
  { code: RETAINED_EARNINGS_CODE, name: "Laba Ditahan", type: "EKUITAS", normalBalance: "KREDIT" },
  { code: IKHTISAR_LABA_RUGI_CODE, name: "Ikhtisar Laba Rugi", type: "EKUITAS", normalBalance: "KREDIT" },

  // 4xx — Pendapatan
  { code: "401", name: "Penjualan", type: "PENDAPATAN", normalBalance: "KREDIT" },
  { code: "402", name: "Retur & Potongan Penjualan", type: "PENDAPATAN", normalBalance: "DEBIT" },
  { code: "403", name: "Pendapatan Lain-lain", type: "PENDAPATAN", normalBalance: "KREDIT" },
  { code: "404", name: "Pendapatan Jasa", type: "PENDAPATAN", normalBalance: "KREDIT" },

  // 5xx — HPP
  { code: "501", name: "Harga Pokok Penjualan", type: "HPP", normalBalance: "DEBIT" },

  // 6xx — Beban Operasional
  { code: "601", name: "Beban Gaji", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "602", name: "Beban Sewa", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "603", name: "Beban Listrik, Air & Telepon", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "604", name: "Beban Perlengkapan", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "605", name: "Beban Penyusutan", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "606", name: "Beban Transportasi", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "607", name: "Beban Pemasaran", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "608", name: "Beban Administrasi & Umum", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "609", name: "Beban Bunga Bank", type: "BEBAN", normalBalance: "DEBIT" },
  { code: "610", name: "Beban Lain-lain", type: "BEBAN", normalBalance: "DEBIT" },
];

export interface SimpleCategory {
  label: string;
  labelEn: string;
  code: string;
}

/** Mode Sederhana categories — Pemasukan side, each mapped to its credited account. */
export const SIMPLE_INCOME_CATEGORIES: SimpleCategory[] = [
  { label: "Penjualan", labelEn: "Sales", code: "401" },
  { label: "Pendapatan Jasa", labelEn: "Service Revenue", code: "404" },
  { label: "Pendapatan Lain", labelEn: "Other Income", code: "403" },
];

/** Mode Sederhana categories — Pengeluaran side, each mapped to its debited account. */
export const SIMPLE_EXPENSE_CATEGORIES: SimpleCategory[] = [
  { label: "Pembelian Bahan Baku", labelEn: "Raw Material Purchase", code: "501" },
  { label: "Gaji Karyawan", labelEn: "Employee Salary", code: "601" },
  { label: "Sewa", labelEn: "Rent", code: "602" },
  { label: "Listrik & Air", labelEn: "Utilities", code: "603" },
  { label: "Transportasi", labelEn: "Transportation", code: "606" },
  { label: "Pemasaran", labelEn: "Marketing", code: "607" },
  { label: "Beban Lain", labelEn: "Other Expense", code: "610" },
];

/** Display-only label for a Mode Sederhana category. Never affects the stored account code. */
export function getSimpleCategoryLabel(category: SimpleCategory, lang: "id" | "en"): string {
  return lang === "en" ? category.labelEn : category.label;
}

const DEFAULT_ACCOUNT_NAME_ID: Record<string, string> = Object.fromEntries(
  DEFAULT_COA.map((account) => [account.code, account.name]),
);

/**
 * English display names for the seeded default chart of accounts, keyed by
 * account code. Only used as a display substitution in EN mode — never
 * written to the database.
 */
const DEFAULT_ACCOUNT_NAME_EN: Record<string, string> = {
  "101": "Cash",
  "102": "Bank",
  "103": "Accounts Receivable",
  "104": "Merchandise Inventory",
  "105": "Supplies",
  "106": "Prepaid Rent",
  "121": "Land",
  "122": "Building",
  "123": "Equipment",
  "124": "Vehicles",
  "125": "Accumulated Depreciation - Fixed Assets",
  "201": "Accounts Payable",
  "202": "Bank Loan Payable",
  "203": "Tax Payable",
  "301": "Owner's Equity",
  [PRIVE_CODE]: "Owner's Withdrawal",
  [RETAINED_EARNINGS_CODE]: "Retained Earnings",
  [IKHTISAR_LABA_RUGI_CODE]: "Income Summary",
  "401": "Sales",
  "402": "Sales Returns & Allowances",
  "403": "Other Income",
  "404": "Service Revenue",
  "501": "Cost of Goods Sold",
  "601": "Salary Expense",
  "602": "Rent Expense",
  "603": "Utilities, Water & Phone Expense",
  "604": "Supplies Expense",
  "605": "Depreciation Expense",
  "606": "Transportation Expense",
  "607": "Marketing Expense",
  "608": "General & Administrative Expense",
  "609": "Bank Interest Expense",
  "610": "Other Expense",
};

/**
 * Display-only translation for an account name. Only substitutes the name
 * when it still matches the original seeded default for that code — a
 * user-renamed default account, or any user-created account, is always
 * shown exactly as typed. Never writes to the database.
 */
export function getDisplayAccountName(
  account: { code: string; name: string },
  lang: "id" | "en",
): string {
  if (lang === "id") return account.name;
  const original = DEFAULT_ACCOUNT_NAME_ID[account.code];
  const translated = DEFAULT_ACCOUNT_NAME_EN[account.code];
  if (original && translated && account.name === original) return translated;
  return account.name;
}
