"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { useLanguage } from "@/components/LanguageProvider";

const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/jurnal", labelKey: "nav.generalJournal" },
  { href: "/buku-besar", labelKey: "nav.generalLedger" },
  {
    labelKey: "nav.reports",
    children: [
      { href: "/laporan/laba-rugi", labelKey: "nav.incomeStatement" },
      { href: "/laporan/neraca", labelKey: "nav.balanceSheet" },
      { href: "/laporan/arus-kas", labelKey: "nav.cashFlow" },
      { href: "/laporan/perubahan-modal", labelKey: "nav.changesInEquity" },
      { href: "/laporan/neraca-saldo-penutupan", labelKey: "nav.postClosingTrialBalance" },
    ],
  },
  { href: "/akun", labelKey: "nav.chartOfAccounts" },
  { href: "/pengaturan", labelKey: "nav.settings" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={clsx(
        "block rounded-lg px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      {label}
    </Link>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const laporanActive = pathname.startsWith("/laporan");

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 px-2">
        <span className="text-xl font-bold text-brand-600">{t("app.name")}</span>
      </div>
      {NAV_ITEMS.map((item) =>
        item.children ? (
          <div key={item.labelKey}>
            <div
              className={clsx(
                "rounded-lg px-3 py-2 text-sm font-medium",
                laporanActive ? "text-brand-700" : "text-gray-500",
              )}
            >
              {t(item.labelKey)}
            </div>
            <div className="ml-2 flex flex-col gap-1 border-l border-gray-200 pl-2">
              {item.children.map((child) => (
                <NavLink key={child.href} href={child.href} label={t(child.labelKey)} />
              ))}
            </div>
          </div>
        ) : (
          <NavLink key={item.href} href={item.href} label={t(item.labelKey)} />
        ),
      )}
    </nav>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:block">
        <SidebarContent />
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-30 rounded-full bg-brand-600 p-3 text-white shadow-lg md:hidden"
        aria-label={t("nav.openMenu")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl" onClick={() => setMobileOpen(false)}>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
