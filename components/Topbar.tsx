"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";

export function Topbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <CompanySwitcher />

      <div className="flex items-center gap-3">
        <LanguageToggle />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
            </span>
            <span className="hidden max-w-[8rem] truncate sm:inline">
              {session?.user?.name ?? t("common.user")}
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t("nav.signOut")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
