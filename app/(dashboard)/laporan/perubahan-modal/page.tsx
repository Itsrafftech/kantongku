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
import { useLanguage } from "@/components/LanguageProvider";
import type { ReactNode } from "react";

function Row({ label, amount, bold = false }: { label: ReactNode; amount: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span>{formatRupiah(amount)}</span>
    </div>
  );
}

export default function PerubahanModalPage() {
  const { t } = useLanguage();
  const { activeCompanyId, activeCompany, isLoading: companyLoading } = useActiveCompany();
  const [range, setRange] = useState<DateRangeValue>(PRESETS.tahunan());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = trpc.report.perubahanModal.useQuery(
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
          <h1 className="text-xl font-semibold text-gray-900">{t("reports.perubahanModal.title")}</h1>
          <p className="text-sm text-gray-500">{t("reports.perubahanModal.subtitle")}</p>
        </div>
        {report && <ExportPdfButton targetRef={printRef} fileName="perubahan-modal" />}
      </div>

      <PeriodFilter value={range} onChange={setRange} />

      {isLoading || companyLoading ? (
        <TableSkeleton rows={5} />
      ) : report ? (
        <div ref={printRef} className="card mx-auto max-w-xl bg-white">
          <ReportPrintHeader
            companyName={activeCompany?.name ?? ""}
            title={t("reports.perubahanModal.title")}
            periodLabel={periodLabel}
          />

          <div className="space-y-1">
            <Row label={t("reports.perubahanModal.beginningEquity")} amount={report.modalAwal} />
            {report.setoranModal !== 0 && (
              <Row label={t("reports.perubahanModal.capitalContribution")} amount={report.setoranModal} />
            )}
            <Row
              label={
                report.labaRugiPeriode >= 0
                  ? t("reports.perubahanModal.currentPeriodProfit")
                  : t("reports.perubahanModal.currentPeriodLoss")
              }
              amount={report.labaRugiPeriode}
            />
            <Row
              label={
                <span className="inline-flex items-center gap-1">
                  {t("reports.perubahanModal.priveLabel")}
                  <InfoTooltip text={t("reports.perubahanModal.priveTooltip")} />
                </span>
              }
              amount={-report.prive}
            />
            <div className="border-t-2 border-gray-300 pt-2">
              <Row label={t("reports.perubahanModal.endingEquity")} amount={report.modalAkhir} bold />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
