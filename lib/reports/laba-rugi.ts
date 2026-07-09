import type { Account, PrismaClient } from "@prisma/client";
import { getAllAccountBalances, type DateRange } from "@/lib/reports/ledger";
import { OTHER_EXPENSE_CODES, OTHER_INCOME_CODES, canonicalAmount } from "@/lib/coa";

export interface LineItem {
  account: Account;
  amount: number;
}

export interface LabaRugiReport {
  range: DateRange;
  pendapatanUsaha: LineItem[];
  totalPendapatanUsaha: number;
  hpp: LineItem[];
  totalHpp: number;
  labaKotor: number;
  bebanOperasional: LineItem[];
  totalBebanOperasional: number;
  labaRugiOperasional: number;
  pendapatanLain: LineItem[];
  totalPendapatanLain: number;
  bebanLain: LineItem[];
  totalBebanLain: number;
  labaRugiBersih: number;
}

function periodNet(balance: { openingBalance: number; closingBalance: number }) {
  return balance.closingBalance - balance.openingBalance;
}

export async function buildLabaRugi(
  prisma: PrismaClient,
  companyId: string,
  range: DateRange,
): Promise<LabaRugiReport> {
  const balances = getAllAccountBalances(prisma, companyId, range);
  const list = [...(await balances).values()];

  function items(predicate: (a: Account) => boolean): LineItem[] {
    return list
      .filter((b) => predicate(b.account))
      .map((b) => ({ account: b.account, amount: canonicalAmount(b.account, periodNet(b)) }))
      .filter((item) => item.amount !== 0);
  }

  function sum(items: LineItem[]) {
    return items.reduce((s, i) => s + i.amount, 0);
  }

  const pendapatanUsaha = items(
    (a) => a.type === "PENDAPATAN" && !OTHER_INCOME_CODES.includes(a.code),
  );
  const hpp = items((a) => a.type === "HPP");
  const bebanOperasional = items(
    (a) => a.type === "BEBAN" && !OTHER_EXPENSE_CODES.includes(a.code),
  );
  const pendapatanLain = items(
    (a) => a.type === "PENDAPATAN" && OTHER_INCOME_CODES.includes(a.code),
  );
  const bebanLain = items((a) => a.type === "BEBAN" && OTHER_EXPENSE_CODES.includes(a.code));

  const totalPendapatanUsaha = sum(pendapatanUsaha);
  const totalHpp = sum(hpp);
  const labaKotor = totalPendapatanUsaha - totalHpp;
  const totalBebanOperasional = sum(bebanOperasional);
  const labaRugiOperasional = labaKotor - totalBebanOperasional;
  const totalPendapatanLain = sum(pendapatanLain);
  const totalBebanLain = sum(bebanLain);
  const labaRugiBersih = labaRugiOperasional + totalPendapatanLain - totalBebanLain;

  return {
    range,
    pendapatanUsaha,
    totalPendapatanUsaha,
    hpp,
    totalHpp,
    labaKotor,
    bebanOperasional,
    totalBebanOperasional,
    labaRugiOperasional,
    pendapatanLain,
    totalPendapatanLain,
    bebanLain,
    totalBebanLain,
    labaRugiBersih,
  };
}
