"use client";

import { useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes } from "react";
import { formatKeystroke } from "@/lib/utils/currency";

interface RupiahInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Current dot-formatted display value (e.g. "1.500.000"), owned by the parent. */
  value: string;
  /** Called with the reformatted dot-grouped string on every keystroke. */
  onChange: (formatted: string) => void;
}

/**
 * Drop-in replacement for `<input type="number">` that displays Indonesian
 * thousand separators as the user types, keeping the caret anchored to the
 * digit it was next to (not the raw character index) so it never jumps when
 * editing in the middle of the number. Used wherever a variable number of
 * amount fields are rendered in a loop (e.g. JournalLineRows), where the
 * `useRupiahInput` hook can't be called per-row.
 */
export function RupiahInput({ value, onChange, ...inputProps }: RupiahInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { formatted, caret } = formatKeystroke(e.target.value, e.target.selectionStart ?? e.target.value.length);
    pendingCaret.current = caret;
    onChange(formatted);
  }

  return (
    <input
      {...inputProps}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
    />
  );
}
