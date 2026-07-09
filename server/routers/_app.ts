import { router } from "@/server/trpc";
import { authRouter } from "@/server/routers/auth";
import { companyRouter } from "@/server/routers/company";
import { accountRouter } from "@/server/routers/account";
import { journalRouter } from "@/server/routers/journal";
import { ledgerRouter } from "@/server/routers/ledger";
import { reportRouter } from "@/server/routers/report";
import { periodRouter } from "@/server/routers/period";
import { dashboardRouter } from "@/server/routers/dashboard";

export const appRouter = router({
  auth: authRouter,
  company: companyRouter,
  account: accountRouter,
  journal: journalRouter,
  ledger: ledgerRouter,
  report: reportRouter,
  period: periodRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
