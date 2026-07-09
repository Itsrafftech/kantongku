import { Prisma, type Account, type PrismaClient } from "@prisma/client";

const { Decimal } = Prisma;

export interface DateRange {
  start: Date;
  end: Date;
}

/** Signed movement for a single line, respecting the account's normal balance side. */
function signedAmount(account: Pick<Account, "normalBalance">, debit: Prisma.Decimal, credit: Prisma.Decimal) {
  return account.normalBalance === "DEBIT" ? debit.sub(credit) : credit.sub(debit);
}

export interface AccountBalance {
  account: Account;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
}

/**
 * Bulk balance computation for every account in a company: balance carried in
 * from before `range.start`, debit/credit movement within the range, and the
 * resulting closing balance as of `range.end`. Used by all report builders so
 * they share one pass over JournalLine instead of N+1 per-account queries.
 */
export async function getAllAccountBalances(
  prisma: PrismaClient,
  companyId: string,
  range: DateRange,
): Promise<Map<string, AccountBalance>> {
  const accounts = await prisma.account.findMany({ where: { companyId }, orderBy: { code: "asc" } });

  const [openingLines, periodLines] = await Promise.all([
    prisma.journalLine.findMany({
      where: { journalEntry: { companyId, date: { lt: range.start } } },
      select: { accountId: true, debit: true, credit: true },
    }),
    prisma.journalLine.findMany({
      where: { journalEntry: { companyId, date: { gte: range.start, lte: range.end } } },
      select: { accountId: true, debit: true, credit: true },
    }),
  ]);

  const result = new Map<string, AccountBalance>();

  for (const account of accounts) {
    let opening = new Decimal(0);
    for (const line of openingLines) {
      if (line.accountId !== account.id) continue;
      opening = opening.add(signedAmount(account, line.debit, line.credit));
    }

    let periodDebit = new Decimal(0);
    let periodCredit = new Decimal(0);
    for (const line of periodLines) {
      if (line.accountId !== account.id) continue;
      periodDebit = periodDebit.add(line.debit);
      periodCredit = periodCredit.add(line.credit);
    }

    const periodNet = signedAmount(account, periodDebit, periodCredit);
    const closing = opening.add(periodNet);

    result.set(account.id, {
      account,
      openingBalance: opening.toNumber(),
      periodDebit: periodDebit.toNumber(),
      periodCredit: periodCredit.toNumber(),
      closingBalance: closing.toNumber(),
    });
  }

  return result;
}

export interface LedgerMovement {
  id: string;
  date: Date;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface AccountLedger {
  account: Account;
  openingBalance: number;
  movements: LedgerMovement[];
  closingBalance: number;
}

/** Per-account chronological ledger (Buku Besar) with a running balance. */
export async function getAccountLedger(
  prisma: PrismaClient,
  companyId: string,
  accountId: string,
  range: DateRange,
): Promise<AccountLedger> {
  const account = await prisma.account.findFirstOrThrow({ where: { id: accountId, companyId } });

  const openingLines = await prisma.journalLine.findMany({
    where: { accountId, journalEntry: { companyId, date: { lt: range.start } } },
    select: { debit: true, credit: true },
  });
  let opening = new Decimal(0);
  for (const line of openingLines) {
    opening = opening.add(signedAmount(account, line.debit, line.credit));
  }

  const periodLines = await prisma.journalLine.findMany({
    where: { accountId, journalEntry: { companyId, date: { gte: range.start, lte: range.end } } },
    include: { journalEntry: true },
    orderBy: [{ journalEntry: { date: "asc" } }, { journalEntry: { createdAt: "asc" } }],
  });

  let running = opening;
  const movements: LedgerMovement[] = periodLines.map((line) => {
    running = running.add(signedAmount(account, line.debit, line.credit));
    return {
      id: line.id,
      date: line.journalEntry.date,
      description: line.journalEntry.description,
      reference: line.journalEntry.reference,
      debit: line.debit.toNumber(),
      credit: line.credit.toNumber(),
      balance: running.toNumber(),
    };
  });

  return {
    account,
    openingBalance: opening.toNumber(),
    movements,
    closingBalance: running.toNumber(),
  };
}
