"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const register = trpc.auth.register.useMutation({
    onSuccess: async (_data, variables) => {
      const result = await signIn("credentials", {
        email: variables.email,
        password: variables.password,
        redirect: false,
      });
      if (result?.error) {
        toast.success("Akun berhasil dibuat, silakan masuk");
        router.push("/login");
        return;
      }
      toast.success("Akun berhasil dibuat");
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Gagal mendaftar");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    register.mutate({ name, email, password, companyName });
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Buat akun baru</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-field" htmlFor="name">Nama Lengkap</label>
          <input
            id="name"
            required
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Anda"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="companyName">Nama Usaha</label>
          <input
            id="companyName"
            required
            className="input-field"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Toko Maju Jaya"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@usaha.com"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="password">Kata Sandi</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
          />
        </div>
        <button type="submit" disabled={register.isLoading} className="btn-primary w-full">
          {register.isLoading ? "Memproses..." : "Daftar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
