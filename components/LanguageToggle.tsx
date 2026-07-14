"use client";

import clsx from "clsx";
import { useLanguage, type Language } from "@/components/LanguageProvider";

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  function option(value: Language) {
    return (
      <button
        type="button"
        onClick={() => setLang(value)}
        aria-pressed={lang === value}
        className={clsx(
          "rounded-full px-2.5 py-1 text-xs font-semibold transition",
          lang === value ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700",
        )}
      >
        {t(`language.${value}`)}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("language.toggleLabel")}
      className="flex items-center gap-0.5 rounded-full bg-gray-100 p-0.5"
    >
      {option("id")}
      {option("en")}
    </div>
  );
}
