import { z } from "zod";
import { router, companyProcedure } from "@/server/trpc";
import { buildLabaRugi } from "@/lib/reports/laba-rugi";
import { buildNeraca } from "@/lib/reports/neraca";
import { buildArusKas } from "@/lib/reports/arus-kas";
import { buildPerubahanModal } from "@/lib/reports/perubahan-modal";

const rangeInput = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const reportRouter = router({
  labaRugi: companyProcedure
    .input(rangeInput)
    .query(({ ctx, input }) =>
      buildLabaRugi(ctx.prisma, ctx.company.id, { start: input.startDate, end: input.endDate }),
    ),

  neraca: companyProcedure
    .input(z.object({ asOfDate: z.coerce.date() }))
    .query(({ ctx, input }) => buildNeraca(ctx.prisma, ctx.company.id, input.asOfDate)),

  arusKas: companyProcedure
    .input(rangeInput)
    .query(({ ctx, input }) =>
      buildArusKas(ctx.prisma, ctx.company.id, { start: input.startDate, end: input.endDate }),
    ),

  perubahanModal: companyProcedure
    .input(rangeInput)
    .query(({ ctx, input }) =>
      buildPerubahanModal(ctx.prisma, ctx.company.id, {
        start: input.startDate,
        end: input.endDate,
      }),
    ),
});
