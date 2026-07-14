"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/components/LanguageProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
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
        toast.success(t("auth.registerSuccessLoginRequired"));
        router.push("/login");
        return;
      }
      toast.success(t("auth.registerSuccess"));
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || t("auth.registerError"));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    register.mutate({ name, email, password, companyName });
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">{t("auth.registerTitle")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-field" htmlFor="name">{t("auth.fullName")}</label>
          <input
            id="name"
            required
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("auth.namePlaceholder")}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="companyName">{t("auth.businessName")}</label>
          <input
            id="companyName"
            required
            className="input-field"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={t("auth.businessNamePlaceholder")}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="email">{t("auth.email")}</label>
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
          <label className="label-field" htmlFor="password">{t("auth.password")}</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordMinPlaceholder")}
          />
        </div>
        <button type="submit" disabled={register.isLoading} className="btn-primary w-full">
          {register.isLoading ? t("common.processing") : t("auth.register")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {t("auth.loginHere")}
        </Link>
      </p>
    </div>
  );
}
