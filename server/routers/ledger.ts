import { z } from "zod";
import { router, companyProcedure } from "@/server/trpc";
import { getAccountLedger } from "@/lib/reports/ledger";

export const ledgerRouter = router({
  get: companyProcedure
    .input(
      z.object({
        accountId: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }),
    )
    .query(({ ctx, input }) => {
      return getAccountLedger(ctx.prisma, ctx.company.id, input.accountId, {
        start: input.startDate,
        end: input.endDate,
      });
    }),
});
