"use client";

import { formatRupiah } from "@/lib/format";

export interface JournalLineInput {
  accountId: string;
  debit: string;
  credit: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

export function emptyLine(): JournalLineInput {
  return { accountId: "", debit: "", credit: "" };
}

export function JournalLineRows({
  accounts,
  lines,
  onChange,
}: {
  accounts: Account[];
  lines: JournalLineInput[];
  onChange: (lines: JournalLineInput[]) => void;
}) {
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  function updateLine(index: number, patch: Partial<JournalLineInput>) {
    const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange(next);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_140px_140px_32px] gap-2 px-1 text-xs font-medium uppercase text-gray-400 sm:grid">
        <span>Akun</span>
        <span>Debit</span>
        <span>Kredit</span>
        <span />
      </div>

      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_140px_32px]">
          <select
            className="input-field"
            value={line.accountId}
            onChange={(e) => updateLine(index, { accountId: e.target.value })}
            required
          >
            <option value="">Pilih akun...</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input-field"
            placeholder="Debit"
            value={line.debit}
            onChange={(e) => updateLine(index, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className="input-field"
            placeholder="Kredit"
            value={line.credit}
            onChange={(e) => updateLine(index, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
          />
          <button
            type="button"
            onClick={() => removeLine(index)}
            disabled={lines.length <= 2}
            className="flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:opacity-30"
            aria-label="Hapus baris"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...lines, emptyLine()])}
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        + Tambah Baris
      </button>

      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
        <div className="flex gap-4">
          <span className="text-gray-500">
            Total Debit: <span className="font-medium text-gray-900">{formatRupiah(totalDebit)}</span>
          </span>
          <span className="text-gray-500">
            Total Kredit: <span className="font-medium text-gray-900">{formatRupiah(totalCredit)}</span>
          </span>
        </div>
        <span className={balanced ? "font-medium text-brand-600" : "font-medium text-red-500"}>
          {balanced ? "Seimbang" : "Belum Seimbang"}
        </span>
      </div>
    </div>
  );
}

export function isLinesBalanced(lines: JournalLineInput[]) {
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  return totalDebit === totalCredit && totalDebit > 0;
}
