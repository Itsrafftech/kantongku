"use client";

import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageToggle />
        </div>
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-brand-600">{t("app.name")}</span>
          <p className="mt-1 text-sm text-gray-500">{t("app.tagline")}</p>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
