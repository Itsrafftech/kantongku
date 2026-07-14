"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function PeriodStatusBadge({ isClosed }: { isClosed: boolean }) {
  const { t } = useLanguage();
  return isClosed ? (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      {t("settings.periodClosed")}
    </span>
  ) : (
    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
      {t("settings.periodOpen")}
    </span>
  );
}
