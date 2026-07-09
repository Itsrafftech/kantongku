"use client";

import { useState } from "react";
import { Info } from "lucide-react";

/**
 * Lightweight info tooltip for explaining accounting jargon inline.
 * @radix-ui/react-tooltip isn't installed, so this is a small self-contained
 * hover/focus/click popover instead of pulling in a new dependency.
 */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center text-gray-400 hover:text-gray-600"
        aria-label="Penjelasan istilah"
      >
        <Info size={14} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-normal leading-relaxed text-white shadow-lg"
        >
          {text}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
        </span>
      )}
    </span>
  );
}
