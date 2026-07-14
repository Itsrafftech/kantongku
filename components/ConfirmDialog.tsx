"use client";

import { Modal } from "@/components/Modal";
import { useLanguage } from "@/components/LanguageProvider";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Generic destructive-action confirmation dialog (delete journal entries, accounts, etc). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-gray-600">{body}</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          {cancelLabel ?? t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t("common.deleting") : (confirmLabel ?? t("common.confirmDelete"))}
        </button>
      </div>
    </Modal>
  );
}
