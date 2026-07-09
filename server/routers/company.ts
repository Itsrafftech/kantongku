import { z } from "zod";
import { router, protectedProcedure, companyProcedure } from "@/server/trpc";
import { DEFAULT_COA } from "@/lib/coa";

export const companyRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.company.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
        address: z.string().optional(),
        phone: z.string().optional(),
        npwp: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { ...input, userId: ctx.session.user.id },
        });
        await tx.account.createMany({
          data: DEFAULT_COA.map((account) => ({ ...account, companyId: company.id })),
        });
        return company;
      });
    }),

  update: companyProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        npwp: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId, ...data } = input;
      return ctx.prisma.company.update({ where: { id: companyId }, data });
    }),
});
