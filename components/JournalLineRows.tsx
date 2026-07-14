"use client";

import type { AccountType } from "@prisma/client";
import { formatRupiah } from "@/lib/format";
import { parseRupiah } from "@/lib/utils/currency";
import { RupiahInput } from "@/components/RupiahInput";
import { InfoTooltip } from "@/components/ui/Tooltip";
import { AccountCombobox } from "@/components/ui/AccountCombobox";
import { useLanguage } from "@/components/LanguageProvider";

export interface JournalLineInput {
  accountId: string;
  debit: string;
  credit: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
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
  const { t } = useLanguage();
  const totalDebit = lines.reduce((sum, l) => sum + parseRupiah(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + parseRupiah(l.credit), 0);
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
      <p className="rounded bg-blue-50 p-2 text-xs text-blue-800">
        {t("journal.modeJurnalHelper")}
      </p>

      <div className="hidden grid-cols-[1fr_140px_140px_32px] gap-2 px-1 text-xs font-medium uppercase text-gray-400 sm:grid">
        <span>{t("common.account")}</span>
        <span>{t("common.debit")}</span>
        <span className="inline-flex items-center gap-1">
          {t("common.credit")}
          <InfoTooltip text={t("journal.debitCreditTooltip")} />
        </span>
        <span />
      </div>

      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_140px_32px]">
          <AccountCombobox
            className="input-field"
            accounts={accounts}
            value={line.accountId}
            onChange={(accountId) => updateLine(index, { accountId })}
            required
          />
          <RupiahInput
            className="input-field"
            placeholder={t("common.debit")}
            value={line.debit}
            onChange={(formatted) => updateLine(index, { debit: formatted, credit: formatted ? "" : line.credit })}
          />
          <RupiahInput
            className="input-field"
            placeholder={t("common.credit")}
            value={line.credit}
            onChange={(formatted) => updateLine(index, { credit: formatted, debit: formatted ? "" : line.debit })}
          />
          <button
            type="button"
            onClick={() => removeLine(index)}
            disabled={lines.length <= 2}
            className="flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:opacity-30"
            aria-label={t("common.removeRow")}
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
        + {t("common.addRow")}
      </button>

      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
        <div className="flex gap-4">
          <span className="text-gray-500">
            {t("journal.totalDebit")}: <span className="font-medium text-gray-900">{formatRupiah(totalDebit)}</span>
          </span>
          <span className="text-gray-500">
            {t("journal.totalCredit")}: <span className="font-medium text-gray-900">{formatRupiah(totalCredit)}</span>
          </span>
        </div>
        <span className={balanced ? "font-medium text-brand-600" : "font-medium text-red-500"}>
          {balanced ? t("common.balanced") : t("common.notBalanced")}
        </span>
      </div>
    </div>
  );
}

export function isLinesBalanced(lines: JournalLineInput[]) {
  const totalDebit = lines.reduce((sum, l) => sum + parseRupiah(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + parseRupiah(l.credit), 0);
  return totalDebit === totalCredit && totalDebit > 0;
}

/** Inline-error version of isLinesBalanced, for surfacing why the form can't be submitted. */
export function getLinesBalanceError(lines: JournalLineInput[], t: (key: string) => string): string | null {
  const totalDebit = lines.reduce((sum, l) => sum + parseRupiah(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + parseRupiah(l.credit), 0);
  if (totalDebit !== totalCredit) {
    return t("validation.linesMustBalance");
  }
  if (totalDebit <= 0) {
    return t("validation.nominalPositive");
  }
  return null;
}
