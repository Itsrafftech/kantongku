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

    const [neraca, labaRugiBulanIni, latestEntries, monthEntries] = await Promise.all([
      buildNeraca(ctx.prisma, ctx.company.id, now),
      buildLabaRugi(ctx.prisma, ctx.company.id, { start: startOfMonth, end: now }),
      ctx.prisma.journalEntry.findMany({
        where: { companyId: ctx.company.id },
        include: { lines: { include: { account: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      ctx.prisma.journalEntry.findMany({
        where: { companyId: ctx.company.id, date: { gte: startOfMonth, lte: now } },
        select: { lines: { select: { debit: true, credit: true } } },
      }),
    ]);

    // Biggest expense category this month — SAK EMKM already separates
    // operational vs. other expenses, so "biggest" spans both buckets.
    const expenseItems = [...labaRugiBulanIni.bebanOperasional, ...labaRugiBulanIni.bebanLain];
    const topExpenseItem = expenseItems.reduce<(typeof expenseItems)[number] | null>(
      (max, item) => (!max || item.amount > max.amount ? item : max),
      null,
    );
    const topExpense = topExpenseItem
      ? { name: topExpenseItem.account.name, amount: topExpenseItem.amount }
      : null;

    // Safety display only — journal.create already rejects unbalanced entries
    // server-side, so this should always be 0 in practice.
    const incompleteTransactionCount = monthEntries.filter((entry) => {
      const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);
      return Math.round(totalDebit * 100) !== Math.round(totalCredit * 100);
    }).length;

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
      topExpense,
      incompleteTransactionCount,
      revenueVsExpense,
      cashFlowMonthly,
      latestEntries,
    };
  }),
});
