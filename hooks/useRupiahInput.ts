"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { formatKeystroke, formatRupiah, parseRupiah } from "@/lib/utils/currency";

export interface UseRupiahInputResult {
  displayValue: string;
  numericValue: number;
  inputRef: RefObject<HTMLInputElement>;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  setValue: (raw: string) => void;
}

/** Controlled Rupiah amount input: dot-grouped display, cursor-stable while typing. */
export function useRupiahInput(initialValue?: number): UseRupiahInputResult {
  const [displayValue, setDisplayValue] = useState(() =>
    initialValue ? formatRupiah(String(initialValue)) : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [displayValue]);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const { formatted, caret } = formatKeystroke(e.target.value, e.target.selectionStart ?? e.target.value.length);
    pendingCaret.current = caret;
    setDisplayValue(formatted);
  }

  function setValue(raw: string) {
    setDisplayValue(formatRupiah(raw));
  }

  return {
    displayValue,
    numericValue: parseRupiah(displayValue),
    inputRef,
    onChange,
    setValue,
  };
}
