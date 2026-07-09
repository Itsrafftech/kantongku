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
  const { activeCompanyId, activeCompany, isLoading: companyLoading } = useActiveCompany();
  const [range, setRange] = useState<DateRangeValue>(PRESETS.tahunan());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = trpc.report.perubahanModal.useQuery(
    { companyId: activeCompanyId!, startDate: new Date(range.startDate), endDate: new Date(range.endDate) },
    { enabled: !!activeCompanyId },
  );

  const periodLabel = `Periode ${formatDateID(range.startDate)} - ${formatDateID(range.endDate)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Laporan Perubahan Modal</h1>
          <p className="text-sm text-gray-500">Perubahan ekuitas pemilik selama periode</p>
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
            title="Laporan Perubahan Modal"
            periodLabel={periodLabel}
          />

          <div className="space-y-1">
            <Row label="Modal Awal" amount={report.modalAwal} />
            {report.setoranModal !== 0 && (
              <Row label="Setoran Modal" amount={report.setoranModal} />
            )}
            <Row
              label={report.labaRugiPeriode >= 0 ? "Laba Periode Berjalan" : "Rugi Periode Berjalan"}
              amount={report.labaRugiPeriode}
            />
            <Row
              label={
                <span className="inline-flex items-center gap-1">
                  Prive (Penarikan Modal)
                  <InfoTooltip text="Prive adalah uang usaha yang ditarik pemilik untuk kebutuhan pribadi." />
                </span>
              }
              amount={-report.prive}
            />
            <div className="border-t-2 border-gray-300 pt-2">
              <Row label="Modal Akhir" amount={report.modalAkhir} bold />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
