"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PeriodStatusBadge } from "@/components/PeriodStatusBadge";
import { formatDateID, toInputDate } from "@/lib/format";

type Period = RouterOutputs["period"]["list"][number];

export function PeriodManager() {
  const { activeCompanyId, isLoading: companyLoading } = useActiveCompany();
  const utils = trpc.useContext();
  const [form, setForm] = useState({
    name: "",
    startDate: toInputDate(new Date(new Date().getFullYear(), 0, 1)),
    endDate: toInputDate(new Date(new Date().getFullYear(), 11, 31)),
  });
  const [closingTarget, setClosingTarget] = useState<Period | null>(null);

  const { data: periods, isLoading } = trpc.period.list.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );

  const createPeriod = trpc.period.create.useMutation({
    onSuccess: () => {
      toast.success("Periode berhasil dibuat");
      utils.period.list.invalidate();
      setForm((f) => ({ ...f, name: "" }));
    },
    onError: (error) => toast.error(error.message || "Gagal membuat periode"),
  });

  const closePeriod = trpc.period.close.useMutation({
    onSuccess: () => {
      toast.success("Periode berhasil ditutup, jurnal penutup telah dibuat");
      utils.period.list.invalidate();
      utils.journal.list.invalidate();
      utils.account.list.invalidate();
      setClosingTarget(null);
    },
    onError: (error) => toast.error(error.message || "Gagal menutup periode"),
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    createPeriod.mutate({
      companyId: activeCompanyId,
      name: form.name,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
    });
  }

  function confirmClose() {
    if (!activeCompanyId || !closingTarget) return;
    closePeriod.mutate({ companyId: activeCompanyId, periodId: closingTarget.id });
  }

  if (companyLoading || isLoading) return <CardSkeleton />;

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Periode Akuntansi</h2>
        <p className="text-sm text-gray-500">Kelola periode dan tutup periode akhir tahun buku</p>
      </div>

      {periods && periods.length > 0 && (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {periods.map((period) => (
            <div key={period.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{period.name}</p>
                <p className="text-xs text-gray-500">
                  {formatDateID(period.startDate)} - {formatDateID(period.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <PeriodStatusBadge isClosed={period.isClosed} />
                {!period.isClosed && (
                  <button
                    type="button"
                    onClick={() => setClosingTarget(period)}
                    disabled={closePeriod.isLoading}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Tutup Periode
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs font-medium uppercase text-gray-400">Buat Periode Baru</p>
        <div>
          <label className="label-field">Nama Periode</label>
          <input
            className="input-field"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Tahun 2026"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Mulai</label>
            <input
              type="date"
              className="input-field"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label-field">Selesai</label>
            <input
              type="date"
              className="input-field"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>
        <button type="submit" disabled={createPeriod.isLoading} className="btn-secondary">
          {createPeriod.isLoading ? "Membuat..." : "Buat Periode"}
        </button>
      </form>

      <ConfirmDialog
        open={!!closingTarget}
        title={`Tutup periode ${closingTarget?.name ?? ""}?`}
        body="Setelah ditutup, akun Pendapatan, Beban, HPP, dan Prive akan direset ke nol dan saldonya dipindahkan ke Modal. Transaksi baru tidak bisa dicatat pada periode ini. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, tutup periode"
        loading={closePeriod.isLoading}
        onConfirm={confirmClose}
        onCancel={() => setClosingTarget(null)}
      />
    </div>
  );
}
