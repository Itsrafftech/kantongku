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
import type { CashFlowLine } from "@/lib/reports/arus-kas";

function Row({ label, amount, bold = false }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span>{formatRupiah(amount)}</span>
    </div>
  );
}

function ActivitySection({ title, lines, total }: { title: string; lines: CashFlowLine[]; total: number }) {
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-gray-500">{title}</h4>
      {lines.length === 0 ? (
        <p className="py-1 text-sm text-gray-400">Tidak ada aktivitas</p>
      ) : (
        lines.map((line, i) => (
          <Row key={`${line.entryId}-${i}`} label={`${line.description} (${line.accountName})`} amount={line.amount} />
        ))
      )}
      <Row label={`Kas Bersih dari ${title}`} amount={total} bold />
    </div>
  );
}

export default function ArusKasPage() {
  const { activeCompanyId, activeCompany, isLoading: companyLoading } = useActiveCompany();
  const [range, setRange] = useState<DateRangeValue>(PRESETS.bulanan());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = trpc.report.arusKas.useQuery(
    { companyId: activeCompanyId!, startDate: new Date(range.startDate), endDate: new Date(range.endDate) },
    { enabled: !!activeCompanyId },
  );

  const periodLabel = `Periode ${formatDateID(range.startDate)} - ${formatDateID(range.endDate)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1 text-xl font-semibold text-gray-900">
            Laporan Arus Kas
            <InfoTooltip text="Arus Kas menunjukkan pergerakan uang masuk dan keluar dari kas/bank usaha." />
          </h1>
          <p className="text-sm text-gray-500">Aktivitas operasi, investasi, dan pendanaan</p>
        </div>
        {report && <ExportPdfButton targetRef={printRef} fileName="arus-kas" />}
      </div>

      <PeriodFilter value={range} onChange={setRange} />

      {isLoading || companyLoading ? (
        <TableSkeleton rows={8} />
      ) : report &&
        report.operasi.length === 0 &&
        report.investasi.length === 0 &&
        report.pendanaan.length === 0 ? (
        <div className="card text-center text-sm text-gray-500">
          Belum ada transaksi kas pada periode ini. Transaksi akan muncul jika akun Kas atau Bank digunakan.
        </div>
      ) : report ? (
        <div ref={printRef} className="card mx-auto max-w-2xl bg-white">
          <ReportPrintHeader
            companyName={activeCompany?.name ?? ""}
            title="Laporan Arus Kas"
            periodLabel={periodLabel}
          />

          <div className="space-y-4">
            <ActivitySection title="Aktivitas Operasi" lines={report.operasi} total={report.totalOperasi} />
            <ActivitySection title="Aktivitas Investasi" lines={report.investasi} total={report.totalInvestasi} />
            <ActivitySection title="Aktivitas Pendanaan" lines={report.pendanaan} total={report.totalPendanaan} />

            <div className="border-t-2 border-gray-300 pt-2">
              <Row label="Kenaikan (Penurunan) Kas Bersih" amount={report.kenaikanBersihKas} bold />
              <Row label="Kas dan Setara Kas Awal Periode" amount={report.kasAwal} />
              <Row label="Kas dan Setara Kas Akhir Periode" amount={report.kasAkhir} bold />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
