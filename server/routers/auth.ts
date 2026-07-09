import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "@/server/trpc";
import { hashPassword } from "@/lib/password";
import { DEFAULT_COA } from "@/lib/coa";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nama minimal 2 karakter"),
        email: z.string().email("Email tidak valid"),
        password: z.string().min(6, "Kata sandi minimal 6 karakter"),
        companyName: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();

      const existing = await ctx.prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email sudah terdaftar" });
      }

      const hashed = await hashPassword(input.password);

      const user = await ctx.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: { name: input.name, email, password: hashed },
        });

        const company = await tx.company.create({
          data: { name: input.companyName, userId: createdUser.id },
        });

        await tx.account.createMany({
          data: DEFAULT_COA.map((account) => ({ ...account, companyId: company.id, isDefault: true })),
        });

        return createdUser;
      });

      return { id: user.id, email: user.email };
    }),
});
