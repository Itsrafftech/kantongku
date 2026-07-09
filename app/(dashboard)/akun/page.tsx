"use client";

import { useMemo, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { Modal } from "@/components/Modal";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { defaultNormalBalanceForType } from "@/lib/coa";

type Account = RouterOutputs["account"]["list"][number];
type AccountType = Account["type"];

const TYPE_ORDER: AccountType[] = ["ASET", "LIABILITAS", "EKUITAS", "PENDAPATAN", "HPP", "BEBAN"];
const TYPE_LABELS: Record<AccountType, string> = {
  ASET: "Aset",
  LIABILITAS: "Liabilitas",
  EKUITAS: "Ekuitas",
  PENDAPATAN: "Pendapatan",
  HPP: "Harga Pokok Penjualan (HPP)",
  BEBAN: "Beban Operasional",
};

const emptyForm = {
  code: "",
  name: "",
  type: "ASET" as AccountType,
  normalBalance: "DEBIT" as "DEBIT" | "KREDIT",
  isCashAccount: false,
};

export default function AkunPage() {
  const { activeCompanyId, isLoading: companyLoading } = useActiveCompany();
  const utils = trpc.useContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: accounts, isLoading } = trpc.account.list.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );

  const grouped = useMemo(() => {
    const map = new Map<AccountType, Account[]>();
    for (const type of TYPE_ORDER) map.set(type, []);
    for (const account of accounts ?? []) {
      map.get(account.type)?.push(account);
    }
    return map;
  }, [accounts]);

  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => {
      toast.success("Akun berhasil ditambahkan");
      utils.account.list.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message || "Gagal menambahkan akun"),
  });

  const updateAccount = trpc.account.update.useMutation({
    onSuccess: () => {
      toast.success("Akun berhasil diperbarui");
      utils.account.list.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message || "Gagal memperbarui akun"),
  });

  const deleteAccount = trpc.account.delete.useMutation({
    onSuccess: () => {
      toast.success("Akun berhasil dihapus");
      utils.account.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "Gagal menghapus akun"),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: account.normalBalance,
      isCashAccount: account.isCashAccount,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;

    if (editing) {
      updateAccount.mutate({ companyId: activeCompanyId, accountId: editing.id, ...form });
    } else {
      createAccount.mutate({ companyId: activeCompanyId, ...form });
    }
  }

  function handleDelete(account: Account) {
    if (!activeCompanyId) return;
    if (!confirm(`Hapus akun "${account.code} - ${account.name}"?`)) return;
    deleteAccount.mutate({ companyId: activeCompanyId, accountId: account.id });
  }

  const saving = createAccount.isLoading || updateAccount.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Daftar Akun</h1>
          <p className="text-sm text-gray-500">Chart of Accounts sesuai SAK EMKM</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          + Tambah Akun
        </button>
      </div>

      {isLoading || companyLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-6">
          {TYPE_ORDER.map((type) => {
            const items = grouped.get(type) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={type} className="card overflow-hidden !p-0">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <h2 className="text-sm font-semibold text-gray-700">
                    {TYPE_LABELS[type]}
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                      <th className="px-4 py-2 font-medium">Kode</th>
                      <th className="px-4 py-2 font-medium">Nama Akun</th>
                      <th className="px-4 py-2 font-medium">Saldo Normal</th>
                      <th className="px-4 py-2 font-medium"></th>
                      <th className="px-4 py-2 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((account) => (
                      <tr key={account.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2.5 font-mono text-gray-700">{account.code}</td>
                        <td className="px-4 py-2.5 text-gray-900">{account.name}</td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {account.normalBalance === "DEBIT" ? "Debit" : "Kredit"}
                        </td>
                        <td className="px-4 py-2.5">
                          {account.isCashAccount && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                              Kas/Bank
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(account)}
                            className="mr-3 text-brand-600 hover:underline"
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(account)}
                            className="text-red-500 hover:underline"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Ubah Akun" : "Tambah Akun"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Kode Akun</label>
              <input
                className="input-field"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                required
                placeholder="611"
              />
            </div>
            <div>
              <label className="label-field">Tipe</label>
              <select
                className="input-field"
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value as AccountType;
                  setForm((f) => ({ ...f, type, normalBalance: defaultNormalBalanceForType(type) }));
                }}
              >
                {TYPE_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Nama Akun</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Beban Internet"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Saldo Normal</label>
              <select
                className="input-field"
                value={form.normalBalance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, normalBalance: e.target.value as "DEBIT" | "KREDIT" }))
                }
              >
                <option value="DEBIT">Debit</option>
                <option value="KREDIT">Kredit</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isCashAccount}
                  onChange={(e) => setForm((f) => ({ ...f, isCashAccount: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                />
                Akun Kas/Bank
              </label>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
