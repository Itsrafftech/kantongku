"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { ReportPrintHeader } from "@/components/ReportPrintHeader";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { PeriodStatusBadge } from "@/components/PeriodStatusBadge";
import { formatDateID, formatRupiah } from "@/lib/format";

export default function NeracaSaldoPenutupanPage() {
  const { activeCompanyId, activeCompany, isLoading: companyLoading } = useActiveCompany();
  const [periodId, setPeriodId] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: periods } = trpc.period.list.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );
  const closedPeriods = (periods ?? []).filter((p) => p.isClosed);

  const { data: report, isLoading } = trpc.report.neracaSaldoPenutupan.useQuery(
    { companyId: activeCompanyId!, periodId },
    { enabled: !!activeCompanyId && !!periodId },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Neraca Saldo Setelah Penutupan</h1>
          <p className="text-sm text-gray-500">Saldo akun riil setelah jurnal penutup diterapkan</p>
        </div>
        {report && <ExportPdfButton targetRef={printRef} fileName="neraca-saldo-penutupan" />}
      </div>

      <div className="card">
        <label className="label-field">Pilih Periode (yang sudah ditutup)</label>
        <select
          className="input-field max-w-sm"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          disabled={companyLoading}
        >
          <option value="">Pilih periode...</option>
          {closedPeriods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name} ({formatDateID(period.startDate)} - {formatDateID(period.endDate)})
            </option>
          ))}
        </select>
      </div>

      {!periodId ? (
        <div className="card text-center text-sm text-gray-500">
          {closedPeriods.length === 0
            ? "Belum ada periode yang ditutup. Tutup periode terlebih dahulu di halaman Pengaturan."
            : "Pilih periode untuk melihat neraca saldo setelah penutupan."}
        </div>
      ) : isLoading || companyLoading ? (
        <TableSkeleton rows={8} />
      ) : report ? (
        <div ref={printRef} className="card mx-auto max-w-2xl bg-white">
          <ReportPrintHeader
            companyName={activeCompany?.name ?? ""}
            title="Neraca Saldo Setelah Penutupan"
            periodLabel={`Per Tanggal ${formatDateID(report.asOfDate)} — ${report.periodName}`}
          />

          <div className="mb-2 flex justify-end">
            <PeriodStatusBadge isClosed={report.periodIsClosed} />
          </div>

          {report.lines.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              Tidak ada saldo akun riil pada periode ini.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                  <th className="py-2 font-medium">Kode Akun</th>
                  <th className="py-2 font-medium">Nama Akun</th>
                  <th className="py-2 font-medium text-right">Debit</th>
                  <th className="py-2 font-medium text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map((line) => (
                  <tr key={line.account.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 font-mono text-gray-700">{line.account.code}</td>
                    <td className="py-1.5 text-gray-900">{line.account.name}</td>
                    <td className="py-1.5 text-right text-gray-700">
                      {line.debit > 0 ? formatRupiah(line.debit) : "-"}
                    </td>
                    <td className="py-1.5 text-right text-gray-700">
                      {line.credit > 0 ? formatRupiah(line.credit) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-semibold text-gray-900">
                  <td className="py-2" colSpan={2}>
                    Total
                  </td>
                  <td className="py-2 text-right">{formatRupiah(report.totalDebit)}</td>
                  <td className="py-2 text-right">{formatRupiah(report.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {!report.isBalanced && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
              Peringatan: Total Debit tidak sama dengan Total Kredit
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
