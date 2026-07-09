"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { PeriodFilter, PRESETS, type DateRangeValue } from "@/components/PeriodFilter";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { formatDateID, formatRupiah } from "@/lib/format";

export default function BukuBesarPage() {
  const { activeCompanyId, isLoading: companyLoading } = useActiveCompany();
  const [range, setRange] = useState<DateRangeValue>(PRESETS.bulanan());
  const [accountId, setAccountId] = useState("");

  const { data: accounts } = trpc.account.list.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );

  const { data: ledger, isLoading } = trpc.ledger.get.useQuery(
    {
      companyId: activeCompanyId!,
      accountId,
      startDate: new Date(range.startDate),
      endDate: new Date(range.endDate),
    },
    { enabled: !!activeCompanyId && !!accountId },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Buku Besar</h1>
        <p className="text-sm text-gray-500">Mutasi transaksi per akun</p>
      </div>

      <div className="card">
        <label className="label-field">Pilih Akun</label>
        <select
          className="input-field max-w-sm"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={companyLoading}
        >
          <option value="">Pilih akun...</option>
          {accounts?.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>
      </div>

      <PeriodFilter value={range} onChange={setRange} />

      {!accountId ? (
        <div className="card text-center text-sm text-gray-500">
          Pilih akun untuk melihat buku besar.
        </div>
      ) : isLoading ? (
        <TableSkeleton rows={6} />
      ) : ledger ? (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Keterangan</th>
                <th className="px-4 py-2.5 font-medium">Ref</th>
                <th className="px-4 py-2.5 font-medium text-right">Debit</th>
                <th className="px-4 py-2.5 font-medium text-right">Kredit</th>
                <th className="px-4 py-2.5 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 bg-gray-50/60">
                <td className="px-4 py-2.5 text-gray-500" colSpan={5}>
                  Saldo Awal
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  {formatRupiah(ledger.openingBalance)}
                </td>
              </tr>
              {ledger.movements.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-gray-400" colSpan={6}>
                    Tidak ada mutasi pada periode ini.
                  </td>
                </tr>
              ) : (
                ledger.movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-gray-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">
                      {formatDateID(movement.date)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900">{movement.description}</td>
                    <td className="px-4 py-2.5 text-gray-500">{movement.reference || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-gray-700">
                      {movement.debit > 0 ? formatRupiah(movement.debit) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-gray-700">
                      {movement.credit > 0 ? formatRupiah(movement.credit) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-900">
                      {formatRupiah(movement.balance)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-gray-50/60">
                <td className="px-4 py-2.5 text-gray-500" colSpan={5}>
                  Saldo Akhir
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                  {formatRupiah(ledger.closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
