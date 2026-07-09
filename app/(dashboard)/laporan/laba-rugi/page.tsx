"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { PeriodFilter, PRESETS, type DateRangeValue } from "@/components/PeriodFilter";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { ReportPrintHeader } from "@/components/ReportPrintHeader";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { formatDateID, formatRupiah } from "@/lib/format";

function Row({ label, amount, bold = false }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span>{formatRupiah(amount)}</span>
    </div>
  );
}

export default function LabaRugiPage() {
  const { activeCompanyId, activeCompany, isLoading: companyLoading } = useActiveCompany();
  const [range, setRange] = useState<DateRangeValue>(PRESETS.bulanan());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = trpc.report.labaRugi.useQuery(
    { companyId: activeCompanyId!, startDate: new Date(range.startDate), endDate: new Date(range.endDate) },
    { enabled: !!activeCompanyId },
  );

  const periodLabel = `Periode ${formatDateID(range.startDate)} - ${formatDateID(range.endDate)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Laporan Laba Rugi</h1>
          <p className="text-sm text-gray-500">Pendapatan, beban, dan laba/rugi periode berjalan</p>
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
            title="Laporan Laba Rugi"
            periodLabel={periodLabel}
          />

          <div className="space-y-4">
            <div>
              <h4 className="mb-1 text-sm font-semibold text-gray-500">Pendapatan Usaha</h4>
              {report.pendapatanUsaha.map((item) => (
                <Row key={item.account.id} label={item.account.name} amount={item.amount} />
              ))}
              <Row label="Total Pendapatan Usaha" amount={report.totalPendapatanUsaha} bold />
            </div>

            <div>
              <h4 className="mb-1 text-sm font-semibold text-gray-500">Harga Pokok Penjualan</h4>
              {report.hpp.map((item) => (
                <Row key={item.account.id} label={item.account.name} amount={item.amount} />
              ))}
              <Row label="Total HPP" amount={report.totalHpp} bold />
            </div>

            <div className="border-t border-gray-200 pt-2">
              <Row label="Laba Kotor" amount={report.labaKotor} bold />
            </div>

            <div>
              <h4 className="mb-1 text-sm font-semibold text-gray-500">Beban Operasional</h4>
              {report.bebanOperasional.map((item) => (
                <Row key={item.account.id} label={item.account.name} amount={item.amount} />
              ))}
              <Row label="Total Beban Operasional" amount={report.totalBebanOperasional} bold />
            </div>

            <div className="border-t border-gray-200 pt-2">
              <Row label="Laba (Rugi) Operasional" amount={report.labaRugiOperasional} bold />
            </div>

            {(report.pendapatanLain.length > 0 || report.bebanLain.length > 0) && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-gray-500">Pendapatan (Beban) Lain</h4>
                {report.pendapatanLain.map((item) => (
                  <Row key={item.account.id} label={item.account.name} amount={item.amount} />
                ))}
                {report.bebanLain.map((item) => (
                  <Row key={item.account.id} label={item.account.name} amount={-item.amount} />
                ))}
              </div>
            )}

            <div className="border-t-2 border-gray-300 pt-2">
              <Row
                label={report.labaRugiBersih >= 0 ? "Laba Bersih" : "Rugi Bersih"}
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
