import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { router, companyProcedure } from "@/server/trpc";
import { defaultNormalBalanceForType } from "@/lib/coa";

const accountTypeSchema = z.enum(["ASET", "LIABILITAS", "EKUITAS", "PENDAPATAN", "HPP", "BEBAN"]);
const normalBalanceSchema = z.enum(["DEBIT", "KREDIT"]);

export const accountRouter = router({
  list: companyProcedure.query(({ ctx }) => {
    return ctx.prisma.account.findMany({
      where: { companyId: ctx.company.id },
      orderBy: { code: "asc" },
    });
  }),

  create: companyProcedure
    .input(
      z.object({
        code: z.string().min(1, "Kode akun wajib diisi"),
        name: z.string().min(1, "Nama akun wajib diisi"),
        type: accountTypeSchema,
        normalBalance: normalBalanceSchema.optional(),
        isCashAccount: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.account.create({
          data: {
            code: input.code,
            name: input.name,
            type: input.type,
            normalBalance: input.normalBalance ?? defaultNormalBalanceForType(input.type),
            isCashAccount: input.isCashAccount ?? false,
            companyId: ctx.company.id,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new TRPCError({ code: "CONFLICT", message: "Kode akun sudah digunakan" });
        }
        throw error;
      }
    }),

  update: companyProcedure
    .input(
      z.object({
        accountId: z.string(),
        code: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        type: accountTypeSchema.optional(),
        normalBalance: normalBalanceSchema.optional(),
        isCashAccount: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountId, companyId, ...data } = input;
      const account = await ctx.prisma.account.findFirst({
        where: { id: accountId, companyId: ctx.company.id },
      });
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Akun tidak ditemukan" });

      try {
        return await ctx.prisma.account.update({ where: { id: accountId }, data });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new TRPCError({ code: "CONFLICT", message: "Kode akun sudah digunakan" });
        }
        throw error;
      }
    }),

  delete: companyProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findFirst({
        where: { id: input.accountId, companyId: ctx.company.id },
        include: { _count: { select: { journalLines: true } } },
      });
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Akun tidak ditemukan" });
      if (account.isDefault) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Akun default tidak dapat dihapus" });
      }
      if (account._count.journalLines > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Akun tidak dapat dihapus karena sudah memiliki transaksi jurnal",
        });
      }

      await ctx.prisma.account.delete({ where: { id: input.accountId } });
      return { success: true };
    }),
});
