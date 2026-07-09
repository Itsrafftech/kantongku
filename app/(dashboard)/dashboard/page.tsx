"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { Modal } from "@/components/Modal";
import { CardSkeleton, TableSkeleton } from "@/components/LoadingSkeleton";
import {
  JournalLineRows,
  emptyLine,
  isLinesBalanced,
  type JournalLineInput,
} from "@/components/JournalLineRows";
import { formatDateID, formatRupiah, toInputDate } from "@/lib/format";
import {
  KAS_ACCOUNT_CODE,
  SIMPLE_INCOME_CATEGORIES,
  SIMPLE_EXPENSE_CATEGORIES,
} from "@/lib/coa";

type TxMode = "sederhana" | "jurnal";
type Jenis = "PEMASUKAN" | "PENGELUARAN";
const TX_MODE_STORAGE_KEY = "kantongku:quickTxMode";

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-brand-600" : "text-gray-900"}`}>
        {formatRupiah(value)}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { activeCompanyId, isLoading: companyLoading } = useActiveCompany();
  const utils = trpc.useContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setModeState] = useState<TxMode>("sederhana");
  const [date, setDate] = useState(toInputDate(new Date()));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLineInput[]>([emptyLine(), emptyLine()]);
  const [jenis, setJenis] = useState<Jenis>("PEMASUKAN");
  const [kategori, setKategori] = useState(SIMPLE_INCOME_CATEGORIES[0].code);
  const [nominal, setNominal] = useState("");

  // Remember last used mode for the rest of this browser session.
  useEffect(() => {
    const stored = sessionStorage.getItem(TX_MODE_STORAGE_KEY);
    if (stored === "sederhana" || stored === "jurnal") setModeState(stored);
  }, []);

  function setMode(next: TxMode) {
    setModeState(next);
    sessionStorage.setItem(TX_MODE_STORAGE_KEY, next);
  }

  function handleJenisChange(next: Jenis) {
    setJenis(next);
    setKategori((next === "PEMASUKAN" ? SIMPLE_INCOME_CATEGORIES : SIMPLE_EXPENSE_CATEGORIES)[0].code);
  }

  const { data, isLoading } = trpc.dashboard.summary.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );
  const { data: accounts } = trpc.account.list.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );

  function resetForm() {
    setDescription("");
    setLines([emptyLine(), emptyLine()]);
    setNominal("");
    setJenis("PEMASUKAN");
    setKategori(SIMPLE_INCOME_CATEGORIES[0].code);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  const createEntry = trpc.journal.create.useMutation({
    onSuccess: () => {
      toast.success("Transaksi berhasil disimpan");
      utils.dashboard.summary.invalidate();
      setModalOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message || "Gagal menyimpan transaksi"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;

    if (mode === "jurnal") {
      if (!isLinesBalanced(lines)) {
        toast.error("Total debit dan kredit harus seimbang");
        return;
      }
      createEntry.mutate({
        companyId: activeCompanyId,
        date: new Date(date),
        description,
        lines: lines
          .filter((l) => l.accountId)
          .map((l) => ({
            accountId: l.accountId,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
          })),
      });
      return;
    }

    // Mode Sederhana: build the double-entry journal automatically.
    const amount = parseFloat(nominal) || 0;
    if (amount <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    const kasAccount = accounts?.find((a) => a.code === KAS_ACCOUNT_CODE);
    const categoryAccount = accounts?.find((a) => a.code === kategori);
    if (!kasAccount || !categoryAccount) {
      toast.error("Akun untuk kategori ini belum tersedia. Tambahkan di Daftar Akun.");
      return;
    }

    createEntry.mutate({
      companyId: activeCompanyId,
      date: new Date(date),
      description,
      lines:
        jenis === "PEMASUKAN"
          ? [
              { accountId: kasAccount.id, debit: amount, credit: 0 },
              { accountId: categoryAccount.id, debit: 0, credit: amount },
            ]
          : [
              { accountId: categoryAccount.id, debit: amount, credit: 0 },
              { accountId: kasAccount.id, debit: 0, credit: amount },
            ],
    });
  }

  const loading = companyLoading || isLoading;
  const simpleCategories = jenis === "PEMASUKAN" ? SIMPLE_INCOME_CATEGORIES : SIMPLE_EXPENSE_CATEGORIES;
  const submitDisabled =
    createEntry.isLoading ||
    (mode === "jurnal" ? !isLinesBalanced(lines) : !nominal || parseFloat(nominal) <= 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Ringkasan keuangan usaha Anda</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          + Tambah Transaksi
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Aset" value={data.totalAset} />
          <StatCard label="Total Utang" value={data.totalUtang} />
          <StatCard label="Modal" value={data.modal} />
          <StatCard label="Laba Bersih Bulan Ini" value={data.labaBersihBulanIni} accent />
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Pendapatan vs Beban</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.revenueVsExpense}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                <Legend />
                <Line type="monotone" dataKey="pendapatan" name="Pendapatan" stroke="#16a34a" strokeWidth={2} />
                <Line type="monotone" dataKey="beban" name="Beban" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Arus Kas Bulanan</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.cashFlowMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                <Bar dataKey="kasBersih" name="Kas Bersih" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="card !p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">5 Transaksi Terakhir</h2>
          <Link href="/jurnal" className="text-xs font-medium text-brand-600 hover:underline">
            Lihat Semua
          </Link>
        </div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : !data || data.latestEntries.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">Belum ada transaksi.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {data.latestEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                    {formatDateID(entry.date)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">{entry.description}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-900">
                    {formatRupiah(entry.lines.reduce((s, l) => s + Number(l.debit), 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title="Tambah Transaksi Cepat">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("sederhana")}
              className={clsx(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition",
                mode === "sederhana" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500",
              )}
            >
              Mode Sederhana
            </button>
            <button
              type="button"
              onClick={() => setMode("jurnal")}
              className={clsx(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition",
                mode === "jurnal" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500",
              )}
            >
              Mode Jurnal
            </button>
          </div>

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
            <label className="label-field">Deskripsi</label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Penjualan tunai"
            />
          </div>

          {mode === "sederhana" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Jenis Transaksi</label>
                  <select
                    className="input-field"
                    value={jenis}
                    onChange={(e) => handleJenisChange(e.target.value as Jenis)}
                  >
                    <option value="PEMASUKAN">Pemasukan</option>
                    <option value="PENGELUARAN">Pengeluaran</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Kategori</label>
                  <select
                    className="input-field"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                  >
                    {simpleCategories.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-field">Nominal (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  required
                  placeholder="500000"
                />
              </div>
            </>
          ) : (
            <JournalLineRows accounts={accounts ?? []} lines={lines} onChange={setLines} />
          )}

          <button type="submit" disabled={submitDisabled} className="btn-primary w-full">
            {createEntry.isLoading ? "Menyimpan..." : "Simpan Transaksi"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
