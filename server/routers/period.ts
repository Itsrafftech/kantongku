import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Account } from "@prisma/client";
import { router, companyProcedure } from "@/server/trpc";
import { getAllAccountBalances } from "@/lib/reports/ledger";
import { RETAINED_EARNINGS_CODE } from "@/lib/coa";

interface ClosingLine {
  accountId: string;
  debit: number;
  credit: number;
}

/** Zero-line for one P&L account: opposite side of its normal balance, magnitude = |periodNet|. */
function zeroingLine(account: Account, periodNet: number): ClosingLine | null {
  if (periodNet === 0) return null;
  const creditsToZero = (account.normalBalance === "DEBIT" && periodNet > 0) ||
    (account.normalBalance === "KREDIT" && periodNet < 0);
  const amount = Math.abs(periodNet);
  return creditsToZero
    ? { accountId: account.id, debit: 0, credit: amount }
    : { accountId: account.id, debit: amount, credit: 0 };
}

export const periodRouter = router({
  list: companyProcedure.query(({ ctx }) => {
    return ctx.prisma.period.findMany({
      where: { companyId: ctx.company.id },
      orderBy: { startDate: "desc" },
    });
  }),

  create: companyProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nama periode wajib diisi"),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (input.endDate < input.startDate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tanggal akhir harus setelah tanggal mulai" });
      }
      return ctx.prisma.period.create({
        data: { ...input, companyId: ctx.company.id },
      });
    }),

  close: companyProcedure
    .input(z.object({ periodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const period = await ctx.prisma.period.findFirst({
        where: { id: input.periodId, companyId: ctx.company.id },
      });
      if (!period) throw new TRPCError({ code: "NOT_FOUND", message: "Periode tidak ditemukan" });
      if (period.isClosed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Periode ini sudah ditutup" });
      }

      const retainedEarnings = await ctx.prisma.account.findFirst({
        where: { companyId: ctx.company.id, code: RETAINED_EARNINGS_CODE },
      });
      if (!retainedEarnings) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Akun Laba Ditahan (kode ${RETAINED_EARNINGS_CODE}) tidak ditemukan. Buat akun ini terlebih dahulu di Daftar Akun.`,
        });
      }

      const balances = await getAllAccountBalances(ctx.prisma, ctx.company.id, {
        start: period.startDate,
        end: period.endDate,
      });

      const lines: ClosingLine[] = [];
      let netIncome = 0;

      for (const balance of balances.values()) {
        const { account } = balance;
        if (!["PENDAPATAN", "HPP", "BEBAN"].includes(account.type)) continue;
        const periodNet = balance.closingBalance - balance.openingBalance;
        const line = zeroingLine(account, periodNet);
        if (line) lines.push(line);
        netIncome += account.type === "PENDAPATAN" ? periodNet : -periodNet;
      }

      const rounded = Math.round(netIncome * 100) / 100;
      if (rounded !== 0) {
        lines.push(
          rounded > 0
            ? { accountId: retainedEarnings.id, debit: 0, credit: rounded }
            : { accountId: retainedEarnings.id, debit: -rounded, credit: 0 },
        );
      }

      return ctx.prisma.$transaction(async (tx) => {
        if (lines.length >= 2) {
          await tx.journalEntry.create({
            data: {
              date: period.endDate,
              description: `Jurnal Penutup — ${period.name}`,
              reference: "CLOSING",
              isSystemGenerated: true,
              companyId: ctx.company.id,
              lines: { create: lines },
            },
          });
        }

        return tx.period.update({ where: { id: period.id }, data: { isClosed: true } });
      });
    }),
});
