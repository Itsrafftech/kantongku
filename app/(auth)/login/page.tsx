"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { PlayCircle } from "lucide-react";

const DEMO_EMAIL = "demo@kantongku.id";
const DEMO_PASSWORD = "password123";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function doSignIn(signInEmail: string, signInPassword: string) {
    const result = await signIn("credentials", {
      email: signInEmail,
      password: signInPassword,
      redirect: false,
    });

    if (result?.error) {
      return false;
    }
    toast.success("Berhasil masuk");
    router.push("/dashboard");
    router.refresh();
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const ok = await doSignIn(email, password);
    setLoading(false);
    if (!ok) toast.error("Email atau kata sandi salah");
  }

  async function handleDemoLogin() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setDemoLoading(true);
    const ok = await doSignIn(DEMO_EMAIL, DEMO_PASSWORD);
    setDemoLoading(false);
    if (!ok) toast.error("Gagal masuk ke akun demo");
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
        <button type="submit" disabled={loading || demoLoading} className="btn-primary w-full">
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
        disabled={loading || demoLoading}
        className="btn-secondary w-full"
      >
        Masuk dengan Google
      </button>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={loading || demoLoading}
        className="btn-secondary mt-3 flex w-full items-center justify-center gap-2"
      >
        {demoLoading ? (
          <>
            <Spinner />
            Memproses...
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4" />
            Coba sebagai demo — tanpa daftar
          </>
        )}
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">
        Data demo bersifat publik dan dapat berubah sewaktu-waktu.
      </p>

      <p className="mt-6 text-center text-sm text-gray-500">
        Belum punya akun?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
