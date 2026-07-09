"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { Modal } from "@/components/Modal";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import {
  JournalLineRows,
  emptyLine,
  isLinesBalanced,
  type JournalLineInput,
} from "@/components/JournalLineRows";
import { formatDateID, formatRupiah, toInputDate } from "@/lib/format";
import { parseRupiah } from "@/lib/utils/currency";

type JournalEntry = RouterOutputs["journal"]["list"][number];

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function endOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    if (!isLinesBalanced(lines)) {
      toast.error("Total debit dan kredit harus seimbang");
      return;
    }
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

  function handleDelete(entry: JournalEntry) {
    if (!activeCompanyId) return;
    if (!confirm("Hapus jurnal ini?")) return;
    deleteEntry.mutate({ companyId: activeCompanyId, entryId: entry.id });
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
          Belum ada transaksi pada periode ini.
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
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-50 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">
                    {formatDateID(entry.date)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">
                    {entry.description}
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
                        onClick={() => handleDelete(entry)}
                        className="text-red-500 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
          <button
            type="submit"
            disabled={createEntry.isLoading || !isLinesBalanced(lines)}
            className="btn-primary w-full"
          >
            {createEntry.isLoading ? "Menyimpan..." : "Simpan Jurnal"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
