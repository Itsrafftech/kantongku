import type { Account } from "@prisma/client";
import { getAllAccountBalances, type PrismaClientOrTx } from "@/lib/reports/ledger";

export interface TrialBalanceLine {
  account: Account;
  debit: number;
  credit: number;
}

export interface PostClosingTrialBalanceReport {
  asOfDate: Date;
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

const EPOCH = new Date(0);

/**
 * Neraca Saldo Setelah Penutupan — trial balance as of a (closed) period's
 * end date, restricted to real accounts (Aset/Liabilitas/Ekuitas). Nominal
 * accounts (Pendapatan/HPP/Beban/Prive) are deliberately excluded: if the
 * period was closed correctly they're already zeroed, so omitting them
 * doesn't unbalance the report — it's the whole point of a post-closing
 * trial balance.
 */
export async function buildPostClosingTrialBalance(
  prisma: PrismaClientOrTx,
  companyId: string,
  asOfDate: Date,
): Promise<PostClosingTrialBalanceReport> {
  const balances = await getAllAccountBalances(prisma, companyId, { start: EPOCH, end: asOfDate });

  const lines: TrialBalanceLine[] = [];
  for (const balance of balances.values()) {
    const { account, closingBalance } = balance;
    if (account.type !== "ASET" && account.type !== "LIABILITAS" && account.type !== "EKUITAS") continue;

    const rounded = Math.round(closingBalance * 100) / 100;
    if (rounded === 0) continue;

    // closingBalance is already signed relative to the account's own normal
    // balance — a positive value sits on that normal side; a negative value
    // (e.g. an overdrawn contra position) sits on the opposite side instead.
    const onNormalSide = rounded > 0;
    const amount = Math.abs(rounded);
    if (account.normalBalance === "DEBIT") {
      lines.push(onNormalSide ? { account, debit: amount, credit: 0 } : { account, debit: 0, credit: amount });
    } else {
      lines.push(onNormalSide ? { account, debit: 0, credit: amount } : { account, debit: amount, credit: 0 });
    }
  }

  lines.sort((a, b) => a.account.code.localeCompare(b.account.code));

  const totalDebit = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
  const totalCredit = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100;

  return {
    asOfDate,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: totalDebit === totalCredit,
  };
}
