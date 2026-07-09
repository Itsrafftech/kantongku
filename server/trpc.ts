import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createTRPCContext() {
  const session = await getServerSession(authOptions);
  return { session, prisma };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Structural company-ownership guard: every company-scoped router builds on
 * this instead of a manually-called ownership check, so scoping bypasses
 * (IDOR) require actively bypassing this builder rather than forgetting a call.
 */
export const companyProcedure = protectedProcedure
  .input(z.object({ companyId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const company = await ctx.prisma.company.findFirst({
      where: { id: input.companyId, userId: ctx.session.user.id },
    });
    if (!company) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Perusahaan tidak ditemukan" });
    }
    return next({ ctx: { ...ctx, company } });
  });
