"use client";

import { formatDateID } from "@/lib/format";
import { useLanguage } from "@/components/LanguageProvider";

export function ReportPrintHeader({
  companyName,
  title,
  periodLabel,
}: {
  companyName: string;
  title: string;
  periodLabel: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="mb-4 border-b border-gray-200 pb-4 text-center">
      <h2 className="text-lg font-bold text-gray-900">{companyName}</h2>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      <p className="text-sm text-gray-500">{periodLabel}</p>
      <p className="text-xs text-gray-400">{t("pdf.printedOn")}: {formatDateID(new Date())}</p>
    </div>
  );
}
