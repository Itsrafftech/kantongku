"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Email atau kata sandi salah");
      return;
    }
    toast.success("Berhasil masuk");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Masuk ke akun Anda</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">atau</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="btn-secondary w-full"
      >
        Masuk dengan Google
      </button>

      <p className="mt-6 text-center text-sm text-gray-500">
        Belum punya akun?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
