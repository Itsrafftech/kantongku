"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Wallet, Pencil, BarChart2, Rocket } from "lucide-react";
import clsx from "clsx";

interface Tip {
  color: "green" | "blue";
  text: string;
}

interface Slide {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tip?: Tip;
}

const SLIDES: Slide[] = [
  {
    Icon: Wallet,
    title: "Selamat datang di KantongKu",
    description:
      "Aplikasi pencatatan keuangan usaha yang mudah dipakai — tanpa perlu paham akuntansi.",
  },
  {
    Icon: Pencil,
    title: "Catat pemasukan dan pengeluaran",
    description:
      "Setiap ada uang masuk atau keluar, catat di sini. Pilih jenis, kategori, dan nominal — selesai.",
    tip: {
      color: "green",
      text: "Contoh: jual es teh Rp 50.000 — pilih Pemasukan, lalu Penjualan.",
    },
  },
  {
    Icon: BarChart2,
    title: "Laporan keuangan otomatis",
    description:
      "KantongKu otomatis menyusun Laporan Laba Rugi, Neraca, dan Arus Kas dari setiap transaksi.",
    tip: {
      color: "blue",
      text: "Laporan ini bisa dicetak dan diserahkan ke bank atau investor.",
    },
  },
  {
    Icon: Rocket,
    title: "Usahamu siap dicatat",
    description:
      "Mulai dengan mencatat transaksi pertamamu. Konsisten mencatat berarti keuangan usaha lebih sehat.",
  },
];

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface OnboardingModalProps {
  open: boolean;
  /** Skip link, ESC key, or the slide-4 "Lihat dashboard dulu" button. */
  onClose: () => void;
  /** Slide-4 "Mulai catat transaksi" primary button. */
  onStartTransaction: () => void;
}

export function OnboardingModal({ open, onClose, onStartTransaction }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setStep((s) => Math.min(s + 1, SLIDES.length - 1));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((s) => Math.max(s - 1, 0));
        return;
      }
      if (e.key === "Tab") {
        const container = dialogRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const slide = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-white p-8 outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-xs text-gray-400 hover:text-gray-600"
        >
          Lewati
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gray-100 bg-gray-50">
            <slide.Icon className="size-10 text-green-600" />
          </div>

          <h2 id="onboarding-title" className="mt-6 text-xl font-medium text-gray-900">
            {slide.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{slide.description}</p>

          {slide.tip && (
            <div
              className={clsx(
                "mt-4 w-full border-l-2 bg-gray-50 px-3 py-2 text-left text-sm text-gray-600",
                slide.tip.color === "green" ? "border-green-500" : "border-blue-400",
              )}
            >
              {slide.tip.text}
            </div>
          )}

          <div className="mt-6 flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={clsx(
                  "rounded-full transition-all duration-200 ease-in-out",
                  i === step ? "h-1.5 w-4 bg-green-600" : "h-1.5 w-1.5 bg-gray-200",
                )}
              />
            ))}
          </div>

          <div className="mt-8 flex w-full gap-3">
            {isLast ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Lihat dashboard dulu
                </button>
                <button
                  type="button"
                  onClick={onStartTransaction}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Mulai catat transaksi
                </button>
              </>
            ) : (
              <>
                {!isFirst && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(s - 1, 0))}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Kembali
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(s + 1, SLIDES.length - 1))}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Lanjut
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
