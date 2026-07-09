"use client";

import { useMemo, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import {
  JournalLineRows,
  emptyLine,
  getLinesBalanceError,
  type JournalLineInput,
} from "@/components/JournalLineRows";
import { formatDateID, formatRupiah, toInputDate } from "@/lib/format";
import { parseRupiah } from "@/lib/utils/currency";
import { getDescriptionError, getDateError } from "@/lib/validation/transactionForm";

type JournalEntry = RouterOutputs["journal"]["list"][number];

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function endOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

function isEntryBalanced(entry: JournalEntry) {
  const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);
  return Math.round(totalDebit * 100) === Math.round(totalCredit * 100);
}

export default function JurnalPage() {
  const { activeCompanyId, isLoading: companyLoading } = useActiveCompany();
  const utils = trpc.useContext();

  const [range, setRange] = useState({
    startDate: toInputDate(startOfMonth()),
    endDate: toInputDate(endOfMonth()),
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState(toInputDate(new Date()));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<JournalLineInput[]>([emptyLine(), emptyLine()]);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);

  const { data: accounts } = trpc.account.list.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );

  const { data: entries, isLoading } = trpc.journal.list.useQuery(
    {
      companyId: activeCompanyId!,
      startDate: new Date(range.startDate),
      endDate: new Date(range.endDate),
    },
    { enabled: !!activeCompanyId },
  );

  const createEntry = trpc.journal.create.useMutation({
    onSuccess: () => {
      toast.success("Jurnal berhasil disimpan");
      utils.journal.list.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message || "Gagal menyimpan jurnal"),
  });

  const deleteEntry = trpc.journal.delete.useMutation({
    onSuccess: () => {
      toast.success("Jurnal berhasil dihapus");
      utils.journal.list.invalidate();
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(error.message || "Gagal menghapus jurnal"),
  });

  function closeModal() {
    setModalOpen(false);
    setDate(toInputDate(new Date()));
    setDescription("");
    setReference("");
    setLines([emptyLine(), emptyLine()]);
  }

  const formErrors = useMemo(() => {
    const errors: string[] = [];
    const descError = getDescriptionError(description);
    if (descError) errors.push(descError);
    const dateError = getDateError(date);
    if (dateError) errors.push(dateError);
    const linesError = getLinesBalanceError(lines);
    if (linesError) errors.push(linesError);
    return errors;
  }, [description, date, lines]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || formErrors.length > 0) return;
    createEntry.mutate({
      companyId: activeCompanyId,
      date: new Date(date),
      description,
      reference: reference || undefined,
      lines: lines
        .filter((l) => l.accountId)
        .map((l) => ({
          accountId: l.accountId,
          debit: parseRupiah(l.debit),
          credit: parseRupiah(l.credit),
        })),
    });
  }

  function confirmDelete() {
    if (!activeCompanyId || !deleteTarget) return;
    deleteEntry.mutate({ companyId: activeCompanyId, entryId: deleteTarget.id });
  }

  function entryTotal(entry: JournalEntry) {
    return entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Jurnal Umum</h1>
          <p className="text-sm text-gray-500">Pencatatan transaksi double-entry</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          + Tambah Jurnal
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 card">
        <div>
          <label className="label-field">Dari Tanggal</label>
          <input
            type="date"
            className="input-field"
            value={range.startDate}
            onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
          />
        </div>
        <div>
          <label className="label-field">Sampai Tanggal</label>
          <input
            type="date"
            className="input-field"
            value={range.endDate}
            onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
          />
        </div>
      </div>

      {isLoading || companyLoading ? (
        <TableSkeleton rows={6} />
      ) : !entries || entries.length === 0 ? (
        <div className="card text-center text-sm text-gray-500">
          Belum ada transaksi. Klik Tambah Jurnal untuk mulai mencatat.
        </div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Deskripsi</th>
                <th className="px-4 py-2.5 font-medium">Referensi</th>
                <th className="px-4 py-2.5 font-medium text-right">Jumlah</th>
                <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const balanced = isEntryBalanced(entry);
                return (
                  <tr key={entry.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">
                      {formatDateID(entry.date)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{entry.description}</span>
                        {balanced ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            Seimbang
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            Tidak seimbang
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-gray-400">
                        {entry.lines.map((line) => (
                          <div key={line.id}>
                            {line.account.code} {line.account.name} —{" "}
                            {Number(line.debit) > 0
                              ? `Debit ${formatRupiah(Number(line.debit))}`
                              : `Kredit ${formatRupiah(Number(line.credit))}`}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{entry.reference || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-900">
                      {formatRupiah(entryTotal(entry))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {entry.isSystemGenerated ? (
                        <span className="text-xs text-gray-400">Jurnal Penutup</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(entry)}
                          className="text-red-500 hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title="Tambah Jurnal">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">Tanggal</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label-field">No. Referensi (opsional)</label>
              <input
                className="input-field"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="INV-001"
              />
            </div>
          </div>
          <div>
            <label className="label-field">Deskripsi</label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Penjualan tunai"
            />
          </div>
          <JournalLineRows accounts={accounts ?? []} lines={lines} onChange={setLines} />

          {formErrors.length > 0 && (
            <div className="space-y-1">
              {formErrors.map((error) => (
                <p key={error} className="text-sm text-red-500">
                  {error}
                </p>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={createEntry.isLoading || formErrors.length > 0}
            className="btn-primary w-full"
          >
            {createEntry.isLoading ? "Menyimpan..." : "Simpan Jurnal"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus jurnal?"
        body={
          deleteTarget
            ? `Tindakan ini tidak bisa dibatalkan. "${deleteTarget.description}" akan dihapus permanen.`
            : ""
        }
        loading={deleteEntry.isLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
