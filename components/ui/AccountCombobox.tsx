"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type FocusEvent } from "react";
import type { AccountType } from "@prisma/client";
import clsx from "clsx";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ORDER } from "@/lib/coa";

export interface AccountComboboxOption {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

function optionLabel(account: AccountComboboxOption) {
  return `${account.code} - ${account.name}`;
}

/**
 * Searchable account picker: filters by code or name, groups results by
 * account type, and supports arrow-key/Enter/Escape navigation. Drop-in
 * replacement for a native <select> of accounts, built without an external
 * combobox library (none installed in this project).
 */
export function AccountCombobox({
  accounts,
  value,
  onChange,
  placeholder = "Pilih akun...",
  className,
  required = false,
  disabled = false,
}: {
  accounts: AccountComboboxOption[];
  value: string;
  onChange: (accountId: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const listboxId = useId();

  const selected = accounts.find((a) => a.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  const groups = useMemo(() => {
    return ACCOUNT_TYPE_ORDER.map((type) => ({
      type,
      items: filtered.filter((a) => a.type === type),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const flatOptions = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const active = flatOptions[activeIndex];
    if (active) optionRefs.current.get(active.id)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, flatOptions]);

  function openDropdown() {
    setQuery("");
    setOpen(true);
  }

  function selectAccount(account: AccountComboboxOption) {
    onChange(account.id);
    setQuery("");
    setOpen(false);
  }

  function handleContainerBlur(e: FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQuery("");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const active = flatOptions[activeIndex];
      if (active) selectAccount(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      e.currentTarget.blur();
    }
  }

  const displayValue = open ? query : selected ? optionLabel(selected) : "";

  return (
    <div ref={containerRef} onBlur={handleContainerBlur} className="relative">
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={open ? flatOptions[activeIndex]?.id : undefined}
        disabled={disabled}
        className={clsx(className, disabled && "cursor-not-allowed opacity-60")}
        value={displayValue}
        placeholder={placeholder}
        onFocus={openDropdown}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full min-w-[220px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {flatOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Akun tidak ditemukan</p>
          ) : (
            groups.map((group) => (
              <div key={group.type} role="group" aria-label={ACCOUNT_TYPE_LABELS[group.type]}>
                <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase text-gray-400">
                  {ACCOUNT_TYPE_LABELS[group.type]}
                </p>
                {group.items.map((account) => {
                  const flatIndex = flatOptions.indexOf(account);
                  const active = flatIndex === activeIndex;
                  return (
                    <button
                      key={account.id}
                      id={account.id}
                      type="button"
                      role="option"
                      aria-selected={account.id === value}
                      ref={(el) => {
                        if (el) optionRefs.current.set(account.id, el);
                        else optionRefs.current.delete(account.id);
                      }}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      onClick={() => selectAccount(account)}
                      className={clsx(
                        "block w-full truncate px-3 py-1.5 text-left text-sm",
                        active ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50",
                        account.id === value && "font-medium",
                      )}
                    >
                      {optionLabel(account)}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
