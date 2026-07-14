"use client";

import { useState, type RefObject } from "react";
import toast from "react-hot-toast";
import { formatDateID } from "@/lib/format";
import { useLanguage } from "@/components/LanguageProvider";

export function ExportPdfButton({
  targetRef,
  fileName,
}: {
  targetRef: RefObject<HTMLElement>;
  fileName: string;
}) {
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!targetRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(targetRef.current, { scale: 2, backgroundColor: "#ffffff" });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const footerHeight = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2 - footerHeight;

      const imgWidthMm = usableWidth;
      const pxPerMm = canvas.width / imgWidthMm;
      const pageHeightPx = usableHeight * pxPerMm;

      let renderedHeightPx = 0;
      let page = 0;

      while (renderedHeightPx < canvas.height) {
        if (page > 0) pdf.addPage();

        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvas,
            0,
            renderedHeightPx,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx,
          );
        }
        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceHeightMm = sliceHeightPx / pxPerMm;
        pdf.addImage(sliceData, "PNG", margin, margin, imgWidthMm, sliceHeightMm);

        pdf.setFontSize(8);
        pdf.setTextColor(140);
        pdf.text(
          t("pdf.footer", { date: formatDateID(new Date()) }),
          pageWidth / 2,
          pageHeight - 6,
          { align: "center" },
        );

        renderedHeightPx += sliceHeightPx;
        page += 1;
      }

      pdf.save(`${fileName}.pdf`);
    } catch {
      toast.error(t("pdf.exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <button type="button" onClick={handleExport} disabled={exporting} className="btn-secondary">
      {exporting ? t("pdf.exporting") : t("pdf.exportPdf")}
    </button>
  );
}
