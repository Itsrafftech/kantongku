import type { PrismaClient } from "@prisma/client";
import { getAllAccountBalances, type DateRange } from "@/lib/reports/ledger";
import { getCashFlowBucket, type CashFlowBucket } from "@/lib/coa";

export interface CashFlowLine {
  entryId: string;
  date: Date;
  description: string;
  accountCode: string;
  accountName: string;
  amount: number; // positive = inflow, negative = outflow
}

export interface ArusKasReport {
  range: DateRange;
  kasAwal: number;
  kasAkhir: number;
  operasi: CashFlowLine[];
  totalOperasi: number;
  investasi: CashFlowLine[];
  totalInvestasi: number;
  pendanaan: CashFlowLine[];
  totalPendanaan: number;
  kenaikanBersihKas: number;
}

/**
 * Direct-method cash flow statement. For every entry that mixes a cash
 * account with non-cash accounts, each non-cash line's (credit - debit) is
 * its cash-flow contribution (by double-entry construction this equals the
 * paired cash movement), bucketed by the non-cash account's code prefix.
 * Entries where every line is a cash account (Kas<->Bank transfers) and
 * entries that touch no cash account at all (pure accrual entries) are
 * excluded entirely — neither represents a real cash-affecting activity.
 */
export async function buildArusKas(
  prisma: PrismaClient,
  companyId: string,
  range: DateRange,
): Promise<ArusKasReport> {
  const entries = await prisma.journalEntry.findMany({
    where: { companyId, date: { gte: range.start, lte: range.end } },
    include: { lines: { include: { account: true } } },
    orderBy: { date: "asc" },
  });

  const buckets: Record<CashFlowBucket, CashFlowLine[]> = {
    OPERASI: [],
    INVESTASI: [],
    PENDANAAN: [],
  };

  for (const entry of entries) {
    const cashLines = entry.lines.filter((l) => l.account.isCashAccount);
    const nonCashLines = entry.lines.filter((l) => !l.account.isCashAccount);

    if (cashLines.length === 0 || nonCashLines.length === 0) continue; // no cash movement, or pure cash transfer

    for (const line of nonCashLines) {
      const amount = line.credit.sub(line.debit).toNumber();
      if (amount === 0) continue;
      buckets[getCashFlowBucket(line.account.code)].push({
        entryId: entry.id,
        date: entry.date,
        description: entry.description,
        accountCode: line.account.code,
        accountName: line.account.name,
        amount,
      });
    }
  }

  function total(lines: CashFlowLine[]) {
    return lines.reduce((s, l) => s + l.amount, 0);
  }

  const totalOperasi = total(buckets.OPERASI);
  const totalInvestasi = total(buckets.INVESTASI);
  const totalPendanaan = total(buckets.PENDANAAN);
  const kenaikanBersihKas = totalOperasi + totalInvestasi + totalPendanaan;

  const balances = await getAllAccountBalances(prisma, companyId, range);
  let kasAwal = 0;
  let kasAkhir = 0;
  for (const balance of balances.values()) {
    if (!balance.account.isCashAccount) continue;
    kasAwal += balance.openingBalance;
    kasAkhir += balance.closingBalance;
  }

  if (Math.round(kenaikanBersihKas * 100) !== Math.round((kasAkhir - kasAwal) * 100)) {
    console.warn(
      `[arus-kas] reconciliation mismatch for company ${companyId}: computed net change ${kenaikanBersihKas} vs actual cash delta ${kasAkhir - kasAwal}`,
    );
  }

  return {
    range,
    kasAwal,
    kasAkhir,
    operasi: buckets.OPERASI,
    totalOperasi,
    investasi: buckets.INVESTASI,
    totalInvestasi,
    pendanaan: buckets.PENDANAAN,
    totalPendanaan,
    kenaikanBersihKas,
  };
}
