import { router, companyProcedure } from "@/server/trpc";
import { buildNeraca } from "@/lib/reports/neraca";
import { buildLabaRugi } from "@/lib/reports/laba-rugi";
import { buildArusKas } from "@/lib/reports/arus-kas";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function monthRange(monthsAgo: number, from: Date) {
  const year = from.getFullYear();
  const month = from.getMonth() - monthsAgo;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end, label: `${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}` };
}

export const dashboardRouter = router({
  summary: companyProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [neraca, labaRugiBulanIni, latestEntries] = await Promise.all([
      buildNeraca(ctx.prisma, ctx.company.id, now),
      buildLabaRugi(ctx.prisma, ctx.company.id, { start: startOfMonth, end: now }),
      ctx.prisma.journalEntry.findMany({
        where: { companyId: ctx.company.id },
        include: { lines: { include: { account: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
    ]);

    const months = Array.from({ length: 6 }, (_, i) => monthRange(5 - i, now));

    const revenueVsExpense = await Promise.all(
      months.map(async ({ start, end, label }) => {
        const labaRugi = await buildLabaRugi(ctx.prisma, ctx.company.id, { start, end });
        return {
          bulan: label,
          pendapatan: labaRugi.totalPendapatanUsaha + labaRugi.totalPendapatanLain,
          beban: labaRugi.totalHpp + labaRugi.totalBebanOperasional + labaRugi.totalBebanLain,
        };
      }),
    );

    const cashFlowMonthly = await Promise.all(
      months.map(async ({ start, end, label }) => {
        const arusKas = await buildArusKas(ctx.prisma, ctx.company.id, { start, end });
        return { bulan: label, kasBersih: arusKas.kenaikanBersihKas };
      }),
    );

    return {
      totalAset: neraca.totalAset,
      totalUtang: neraca.totalLiabilitas,
      modal: neraca.totalEkuitas,
      labaBersihBulanIni: labaRugiBulanIni.labaRugiBersih,
      revenueVsExpense,
      cashFlowMonthly,
      latestEntries,
    };
  }),
});
