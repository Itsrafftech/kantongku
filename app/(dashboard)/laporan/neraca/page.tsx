"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { ReportPrintHeader } from "@/components/ReportPrintHeader";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { formatDateID, formatRupiah, toInputDate } from "@/lib/format";

function Row({ label, amount, bold = false }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span>{formatRupiah(amount)}</span>
    </div>
  );
}

export default function NeracaPage() {
  const { activeCompanyId, activeCompany, isLoading: companyLoading } = useActiveCompany();
  const [asOfDate, setAsOfDate] = useState(toInputDate(new Date()));
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = trpc.report.neraca.useQuery(
    { companyId: activeCompanyId!, asOfDate: new Date(asOfDate) },
    { enabled: !!activeCompanyId },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Neraca</h1>
          <p className="text-sm text-gray-500">Posisi keuangan pada suatu tanggal</p>
        </div>
        {report && <ExportPdfButton targetRef={printRef} fileName="neraca" />}
      </div>

      <div className="card flex items-end gap-3">
        <div>
          <label className="label-field">Per Tanggal</label>
          <input
            type="date"
            className="input-field"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
        </div>
      </div>

      {isLoading || companyLoading ? (
        <TableSkeleton rows={8} />
      ) : report ? (
        <div ref={printRef} className="card mx-auto max-w-3xl bg-white">
          <ReportPrintHeader
            companyName={activeCompany?.name ?? ""}
            title="Neraca"
            periodLabel={`Per Tanggal ${formatDateID(report.asOfDate)}`}
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-500">ASET</h4>
              <div>
                <h5 className="mb-1 text-xs font-medium uppercase text-gray-400">Aset Lancar</h5>
                {report.asetLancar.map((item) => (
                  <Row key={item.account.id} label={item.account.name} amount={item.amount} />
                ))}
                <Row label="Total Aset Lancar" amount={report.totalAsetLancar} bold />
              </div>
              <div>
                <h5 className="mb-1 text-xs font-medium uppercase text-gray-400">Aset Tetap</h5>
                {report.asetTetap.map((item) => (
                  <Row key={item.account.id} label={item.account.name} amount={item.amount} />
                ))}
                <Row label="Total Aset Tetap" amount={report.totalAsetTetap} bold />
              </div>
              <div className="border-t-2 border-gray-300 pt-2">
                <Row label="Total Aset" amount={report.totalAset} bold />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-500">LIABILITAS & EKUITAS</h4>
              <div>
                <h5 className="mb-1 text-xs font-medium uppercase text-gray-400">
                  Liabilitas Jangka Pendek
                </h5>
                {report.liabilitasJangkaPendek.map((item) => (
                  <Row key={item.account.id} label={item.account.name} amount={item.amount} />
                ))}
                <Row label="Total Liabilitas Jangka Pendek" amount={report.totalLiabilitasJangkaPendek} bold />
              </div>
              <div>
                <h5 className="mb-1 text-xs font-medium uppercase text-gray-400">
                  Liabilitas Jangka Panjang
                </h5>
                {report.liabilitasJangkaPanjang.map((item) => (
                  <Row key={item.account.id} label={item.account.name} amount={item.amount} />
                ))}
                <Row label="Total Liabilitas Jangka Panjang" amount={report.totalLiabilitasJangkaPanjang} bold />
              </div>
              <Row label="Total Liabilitas" amount={report.totalLiabilitas} bold />

              <div>
                <h5 className="mb-1 text-xs font-medium uppercase text-gray-400">Ekuitas</h5>
                {report.ekuitas.map((item) => (
                  <Row key={item.account.id} label={item.account.name} amount={item.amount} />
                ))}
                <Row label="Laba (Rugi) Tahun Berjalan" amount={report.labaTahunBerjalan} />
                <Row label="Total Ekuitas" amount={report.totalEkuitas} bold />
              </div>

              <div className="border-t-2 border-gray-300 pt-2">
                <Row label="Total Liabilitas & Ekuitas" amount={report.totalLiabilitasDanEkuitas} bold />
              </div>
            </div>
          </div>

          {!report.isBalanced && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
              Peringatan: Total Aset tidak sama dengan Total Liabilitas + Ekuitas
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
