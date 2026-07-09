"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";

const STORAGE_KEY = "kantongku:activeCompanyId";

type Company = RouterOutputs["company"]["list"][number];

interface ActiveCompanyContextValue {
  activeCompanyId: string | null;
  activeCompany: Company | null;
  companies: Company[];
  setActiveCompanyId: (id: string) => void;
  isLoading: boolean;
}

const ActiveCompanyContext = createContext<ActiveCompanyContextValue | null>(null);

export function ActiveCompanyProvider({ children }: { children: React.ReactNode }) {
  const { data: companies, isLoading } = trpc.company.list.useQuery();
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!companies || companies.length === 0) return;

    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const valid = stored && companies.some((c) => c.id === stored);
    setActiveCompanyIdState(valid ? stored : companies[0].id);
  }, [companies]);

  function setActiveCompanyId(id: string) {
    setActiveCompanyIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }

  const activeCompany = useMemo(
    () => companies?.find((c) => c.id === activeCompanyId) ?? null,
    [companies, activeCompanyId],
  );

  return (
    <ActiveCompanyContext.Provider
      value={{
        activeCompanyId,
        activeCompany,
        companies: companies ?? [],
        setActiveCompanyId,
        isLoading,
      }}
    >
      {children}
    </ActiveCompanyContext.Provider>
  );
}

export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext);
  if (!ctx) throw new Error("useActiveCompany must be used within ActiveCompanyProvider");
  return ctx;
}
