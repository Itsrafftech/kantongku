"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { PeriodManager } from "@/components/PeriodManager";

function CompanyForm() {
  const { activeCompany, isLoading } = useActiveCompany();
  const utils = trpc.useContext();
  const [form, setForm] = useState({ name: "", address: "", phone: "", npwp: "" });

  useEffect(() => {
    if (activeCompany) {
      setForm({
        name: activeCompany.name ?? "",
        address: activeCompany.address ?? "",
        phone: activeCompany.phone ?? "",
        npwp: activeCompany.npwp ?? "",
      });
    }
  }, [activeCompany]);

  const update = trpc.company.update.useMutation({
    onSuccess: () => {
      toast.success("Data perusahaan diperbarui");
      utils.company.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "Gagal memperbarui"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeCompany) return;
    update.mutate({ companyId: activeCompany.id, ...form });
  }

  if (isLoading) return <CardSkeleton />;
  if (!activeCompany) return null;

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Profil Perusahaan</h2>
      <div>
        <label className="label-field">Nama Perusahaan</label>
        <input
          className="input-field"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="label-field">Alamat</label>
        <input
          className="input-field"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field">Telepon</label>
          <input
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className="label-field">NPWP</label>
          <input
            className="input-field"
            value={form.npwp}
            onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))}
          />
        </div>
      </div>
      <button type="submit" disabled={update.isLoading} className="btn-primary">
        {update.isLoading ? "Menyimpan..." : "Simpan Perubahan"}
      </button>
    </form>
  );
}

function AddCompanyForm() {
  const { setActiveCompanyId } = useActiveCompany();
  const utils = trpc.useContext();
  const [form, setForm] = useState({ name: "", address: "", phone: "", npwp: "" });

  const create = trpc.company.create.useMutation({
    onSuccess: async (company) => {
      toast.success("Perusahaan baru berhasil dibuat");
      await utils.company.list.invalidate();
      setActiveCompanyId(company.id);
      setForm({ name: "", address: "", phone: "", npwp: "" });
    },
    onError: (error) => toast.error(error.message || "Gagal membuat perusahaan"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Tambah Perusahaan Baru</h2>
      <p className="text-sm text-gray-500">
        Perusahaan baru akan otomatis memiliki daftar akun standar SAK EMKM.
      </p>
      <div>
        <label className="label-field">Nama Perusahaan</label>
        <input
          className="input-field"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          placeholder="Toko Berkah Jaya"
        />
      </div>
      <div>
        <label className="label-field">Alamat</label>
        <input
          className="input-field"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field">Telepon</label>
          <input
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className="label-field">NPWP</label>
          <input
            className="input-field"
            value={form.npwp}
            onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))}
          />
        </div>
      </div>
      <button type="submit" disabled={create.isLoading} className="btn-secondary">
        {create.isLoading ? "Membuat..." : "Buat Perusahaan"}
      </button>
    </form>
  );
}

export default function PengaturanPage() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500">Kelola perusahaan dan akun Anda</p>
      </div>

      <div className="card space-y-1">
        <h2 className="text-base font-semibold text-gray-900">Akun Pengguna</h2>
        <p className="text-sm text-gray-600">{session?.user?.name}</p>
        <p className="text-sm text-gray-500">{session?.user?.email}</p>
      </div>

      <CompanyForm />
      <PeriodManager />
      <AddCompanyForm />
    </div>
  );
}
