import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, companyProcedure } from "@/server/trpc";

const amountSchema = z
  .number()
  .min(0, "Jumlah tidak boleh negatif")
  .refine((v) => Number(v.toFixed(2)) === v, "Maksimal 2 angka desimal");

const lineSchema = z
  .object({
    accountId: z.string().min(1, "Akun wajib dipilih"),
    debit: amountSchema,
    credit: amountSchema,
  })
  .refine((line) => (line.debit > 0) !== (line.credit > 0), {
    message: "Setiap baris harus mengisi debit ATAU kredit, tidak keduanya",
  });

function toCents(amount: number) {
  return Math.round(amount * 100);
}

async function assertDateNotInClosedPeriod(
  prisma: import("@prisma/client").PrismaClient,
  companyId: string,
  date: Date,
) {
  const closedPeriod = await prisma.period.findFirst({
    where: { companyId, isClosed: true, startDate: { lte: date }, endDate: { gte: date } },
  });
  if (closedPeriod) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tidak bisa mencatat transaksi pada periode yang sudah ditutup.",
    });
  }
}

export const journalRouter = router({
  list: companyProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.journalEntry.findMany({
        where: {
          companyId: ctx.company.id,
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        include: { lines: { include: { account: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
    }),

  create: companyProcedure
    .input(
      z.object({
        date: z.coerce.date(),
        description: z.string().min(1, "Deskripsi wajib diisi"),
        reference: z.string().optional(),
        lines: z.array(lineSchema).min(2, "Minimal 2 baris jurnal"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const totalDebit = input.lines.reduce((sum, l) => sum + toCents(l.debit), 0);
      const totalCredit = input.lines.reduce((sum, l) => sum + toCents(l.credit), 0);
      if (totalDebit !== totalCredit || totalDebit === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Total debit dan kredit harus sama dan lebih besar dari nol",
        });
      }

      const accounts = await ctx.prisma.account.findMany({
        where: { companyId: ctx.company.id, id: { in: input.lines.map((l) => l.accountId) } },
      });
      if (accounts.length !== new Set(input.lines.map((l) => l.accountId)).size) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Akun tidak valid" });
      }

      await assertDateNotInClosedPeriod(ctx.prisma, ctx.company.id, input.date);

      return ctx.prisma.journalEntry.create({
        data: {
          date: input.date,
          description: input.description,
          reference: input.reference,
          companyId: ctx.company.id,
          lines: {
            create: input.lines.map((line) => ({
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });
    }),

  delete: companyProcedure
    .input(z.object({ entryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.journalEntry.findFirst({
        where: { id: input.entryId, companyId: ctx.company.id },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" });
      if (entry.isSystemGenerated) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Jurnal penutup dibuat otomatis dan tidak dapat dihapus",
        });
      }
      await assertDateNotInClosedPeriod(ctx.prisma, ctx.company.id, entry.date);

      await ctx.prisma.journalEntry.delete({ where: { id: input.entryId } });
      return { success: true };
    }),
});
