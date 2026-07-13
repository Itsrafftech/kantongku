import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Account } from "@prisma/client";
import { router, companyProcedure } from "@/server/trpc";
import { getAllAccountBalances, type PrismaClientOrTx } from "@/lib/reports/ledger";
import {
  canonicalAmount,
  defaultNormalBalanceForType,
  IKHTISAR_LABA_RUGI_CODE,
  MODAL_CODE,
  PRIVE_CODE,
} from "@/lib/coa";

interface ClosingLine {
  accountId: string;
  debit: number;
  credit: number;
}

/** Zero-line for one account: opposite side of its normal balance, magnitude = |periodNet|. */
function zeroingLine(account: Account, periodNet: number): ClosingLine | null {
  const rounded = Math.round(periodNet * 100) / 100;
  if (rounded === 0) return null;
  const creditsToZero =
    (account.normalBalance === "DEBIT" && rounded > 0) || (account.normalBalance === "KREDIT" && rounded < 0);
  const amount = Math.abs(rounded);
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

      const modal = await ctx.prisma.account.findFirst({
        where: { companyId: ctx.company.id, code: MODAL_CODE },
      });
      if (!modal) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Akun Modal (kode ${MODAL_CODE}) tidak ditemukan. Buat akun ini terlebih dahulu di Daftar Akun.`,
        });
      }
      const prive = await ctx.prisma.account.findFirst({
        where: { companyId: ctx.company.id, code: PRIVE_CODE },
      });

      // Balances are read-only, so computing them ahead of the write
      // transaction is safe — this mirrors how every other report builder
      // in this app is used (Buku Besar, Neraca, etc. all read outside any
      // transaction), and avoids needing to thread the transaction client
      // through the balance query for a value that can't change underneath us.
      const balances = await getAllAccountBalances(ctx.prisma, ctx.company.id, {
        start: period.startDate,
        end: period.endDate,
      });

      const pendapatanLines: ClosingLine[] = [];
      let totalPendapatan = 0; // canonical, credit-positive
      const bebanLines: ClosingLine[] = [];
      let totalBeban = 0; // canonical, debit-positive

      for (const balance of balances.values()) {
        const { account } = balance;
        const periodNet = balance.closingBalance - balance.openingBalance;

        if (account.type === "PENDAPATAN") {
          const line = zeroingLine(account, periodNet);
          if (line) pendapatanLines.push(line);
          totalPendapatan += canonicalAmount(account, periodNet);
        } else if (account.type === "HPP" || account.type === "BEBAN") {
          const line = zeroingLine(account, periodNet);
          if (line) bebanLines.push(line);
          totalBeban += canonicalAmount(account, periodNet);
        }
      }

      totalPendapatan = Math.round(totalPendapatan * 100) / 100;
      totalBeban = Math.round(totalBeban * 100) / 100;
      const netIncome = Math.round((totalPendapatan - totalBeban) * 100) / 100;

      const priveBalance = prive ? balances.get(prive.id) : undefined;
      const privePeriodNet = priveBalance
        ? Math.round((priveBalance.closingBalance - priveBalance.openingBalance) * 100) / 100
        : 0;

      const description = `Jurnal Penutup - ${period.name}`;
      const entries: ClosingLine[][] = [];

      // Entry 1: close revenue to Ikhtisar Laba Rugi.
      if (pendapatanLines.length > 0 && totalPendapatan !== 0) {
        entries.push([
          ...pendapatanLines,
          totalPendapatan > 0
            ? { accountId: "__IKHTISAR__", debit: 0, credit: totalPendapatan }
            : { accountId: "__IKHTISAR__", debit: -totalPendapatan, credit: 0 },
        ]);
      }

      // Entry 2: close HPP + Beban to Ikhtisar Laba Rugi.
      if (bebanLines.length > 0 && totalBeban !== 0) {
        entries.push([
          ...bebanLines,
          totalBeban > 0
            ? { accountId: "__IKHTISAR__", debit: totalBeban, credit: 0 }
            : { accountId: "__IKHTISAR__", debit: 0, credit: -totalBeban },
        ]);
      }

      // Entry 3: close Ikhtisar Laba Rugi to Modal.
      if (netIncome !== 0) {
        entries.push(
          netIncome > 0
            ? [
                { accountId: "__IKHTISAR__", debit: netIncome, credit: 0 },
                { accountId: modal.id, debit: 0, credit: netIncome },
              ]
            : [
                { accountId: modal.id, debit: -netIncome, credit: 0 },
                { accountId: "__IKHTISAR__", debit: 0, credit: -netIncome },
              ],
        );
      }

      // Entry 4: close Prive to Modal.
      if (prive && privePeriodNet !== 0) {
        entries.push(
          privePeriodNet > 0
            ? [
                { accountId: modal.id, debit: privePeriodNet, credit: 0 },
                { accountId: prive.id, debit: 0, credit: privePeriodNet },
              ]
            : [
                { accountId: prive.id, debit: -privePeriodNet, credit: 0 },
                { accountId: modal.id, debit: 0, credit: -privePeriodNet },
              ],
        );
      }

      const needsIkhtisar = entries.some((lines) => lines.some((l) => l.accountId === "__IKHTISAR__"));

      // Resolving the Ikhtisar Laba Rugi account is also read-mostly (only
      // writes on first-ever closing per company), so it's done ahead of the
      // write transaction too — this keeps the transaction itself down to
      // just the journal entry inserts + the period update.
      let ikhtisarId: string | null = null;
      if (needsIkhtisar) {
        const existing = await ctx.prisma.account.findFirst({
          where: { companyId: ctx.company.id, code: IKHTISAR_LABA_RUGI_CODE },
        });
        const ikhtisar =
          existing ??
          (await ctx.prisma.account.create({
            data: {
              code: IKHTISAR_LABA_RUGI_CODE,
              name: "Ikhtisar Laba Rugi",
              type: "EKUITAS",
              normalBalance: defaultNormalBalanceForType("EKUITAS"),
              isDefault: true,
              companyId: ctx.company.id,
            },
          }));
        ikhtisarId = ikhtisar.id;
      }

      return ctx.prisma.$transaction(
        async (tx: PrismaClientOrTx) => {
          await Promise.all(
            entries.map((lines) => {
              const resolvedLines = lines.map((line) =>
                line.accountId === "__IKHTISAR__" ? { ...line, accountId: ikhtisarId! } : line,
              );
              return tx.journalEntry.create({
                data: {
                  date: period.endDate,
                  description,
                  reference: "CLOSING",
                  isSystemGenerated: true,
                  companyId: ctx.company.id,
                  lines: { create: resolvedLines },
                },
              });
            }),
          );

          return tx.period.update({ where: { id: period.id }, data: { isClosed: true } });
        },
        { timeout: 20000, maxWait: 10000 },
      );
    }),
});
