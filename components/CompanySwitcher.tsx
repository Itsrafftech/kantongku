"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";

export function CompanySwitcher() {
  const { companies, activeCompany, setActiveCompanyId, isLoading } = useActiveCompany();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return <div className="h-9 w-40 animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="max-w-[10rem] truncate">
          {activeCompany?.name ?? "Pilih Perusahaan"}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {companies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  setActiveCompanyId(company.id);
                  setOpen(false);
                }}
                className={clsx(
                  "block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-50",
                  company.id === activeCompany?.id
                    ? "font-medium text-brand-700"
                    : "text-gray-700",
                )}
              >
                {company.name}
              </button>
            ))}
            <div className="my-1 border-t border-gray-100" />
            <Link
              href="/pengaturan"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-brand-600 hover:bg-gray-50"
            >
              + Tambah Perusahaan
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
