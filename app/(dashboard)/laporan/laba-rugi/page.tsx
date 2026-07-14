"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { PeriodFilter, PRESETS, type DateRangeValue } from "@/components/PeriodFilter";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { ReportPrintHeader } from "@/components/ReportPrintHeader";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { InfoTooltip } from "@/components/ui/Tooltip";
import { formatDateID, formatRupiah } from "@/lib/format";
import { getDisplayAccountName } from "@/lib/coa";
import { useLanguage } from "@/components/LanguageProvider";

function Row({ label, amount, bold = false }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span>{formatRupiah(amount)}</span>
    </div>
  );
}

export default function LabaRugiPage() {
  const { t, lang } = useLanguage();
  const { activeCompanyId, activeCompany, isLoading: companyLoading } = useActiveCompany();
  const [range, setRange] = useState<DateRangeValue>(PRESETS.bulanan());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = trpc.report.labaRugi.useQuery(
    { companyId: activeCompanyId!, startDate: new Date(range.startDate), endDate: new Date(range.endDate) },
    { enabled: !!activeCompanyId },
  );

  const periodLabel = t("reports.periodLabel", {
    from: formatDateID(range.startDate),
    to: formatDateID(range.endDate),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t("reports.labaRugi.title")}</h1>
          <p className="text-sm text-gray-500">{t("reports.labaRugi.subtitle")}</p>
        </div>
        {report && <ExportPdfButton targetRef={printRef} fileName="laba-rugi" />}
      </div>

      <PeriodFilter value={range} onChange={setRange} />

      {isLoading || companyLoading ? (
        <TableSkeleton rows={8} />
      ) : report ? (
        <div ref={printRef} className="card mx-auto max-w-2xl bg-white">
          <ReportPrintHeader
            companyName={activeCompany?.name ?? ""}
            title={t("reports.labaRugi.title")}
            periodLabel={periodLabel}
          />

          <div className="space-y-4">
            <div>
              <h4 className="mb-1 text-sm font-semibold text-gray-500">{t("reports.labaRugi.revenueSection")}</h4>
              {report.pendapatanUsaha.map((item) => (
                <Row key={item.account.id} label={getDisplayAccountName(item.account, lang)} amount={item.amount} />
              ))}
              <Row label={t("reports.labaRugi.totalRevenue")} amount={report.totalPendapatanUsaha} bold />
            </div>

            <div>
              <h4 className="mb-1 flex items-center gap-1 text-sm font-semibold text-gray-500">
                {t("reports.labaRugi.cogsSection")}
                <InfoTooltip text={t("reports.labaRugi.cogsTooltip")} />
              </h4>
              {report.hpp.map((item) => (
                <Row key={item.account.id} label={getDisplayAccountName(item.account, lang)} amount={item.amount} />
              ))}
              <Row label={t("reports.labaRugi.totalCogs")} amount={report.totalHpp} bold />
            </div>

            <div className="border-t border-gray-200 pt-2">
              <Row label={t("reports.labaRugi.grossProfit")} amount={report.labaKotor} bold />
            </div>

            <div>
              <h4 className="mb-1 text-sm font-semibold text-gray-500">{t("reports.labaRugi.operatingExpenseSection")}</h4>
              {report.bebanOperasional.map((item) => (
                <Row key={item.account.id} label={getDisplayAccountName(item.account, lang)} amount={item.amount} />
              ))}
              <Row label={t("reports.labaRugi.totalOperatingExpense")} amount={report.totalBebanOperasional} bold />
            </div>

            <div className="border-t border-gray-200 pt-2">
              <Row label={t("reports.labaRugi.operatingIncome")} amount={report.labaRugiOperasional} bold />
            </div>

            {(report.pendapatanLain.length > 0 || report.bebanLain.length > 0) && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-gray-500">{t("reports.labaRugi.otherIncomeExpenseSection")}</h4>
                {report.pendapatanLain.map((item) => (
                  <Row key={item.account.id} label={getDisplayAccountName(item.account, lang)} amount={item.amount} />
                ))}
                {report.bebanLain.map((item) => (
                  <Row key={item.account.id} label={getDisplayAccountName(item.account, lang)} amount={-item.amount} />
                ))}
              </div>
            )}

            <div className="border-t-2 border-gray-300 pt-2">
              <Row
                label={report.labaRugiBersih >= 0 ? t("reports.labaRugi.netProfit") : t("reports.labaRugi.netLoss")}
                amount={report.labaRugiBersih}
                bold
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
