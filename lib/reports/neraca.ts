import type { Account, PrismaClient } from "@prisma/client";
import { getAllAccountBalances } from "@/lib/reports/ledger";
import { buildLabaRugi } from "@/lib/reports/laba-rugi";
import { isFixedAssetCode, isLongTermLiabilityCode, canonicalAmount } from "@/lib/coa";

export interface LineItem {
  account: Account;
  amount: number;
}

export interface NeracaReport {
  asOfDate: Date;
  asetLancar: LineItem[];
  totalAsetLancar: number;
  asetTetap: LineItem[];
  totalAsetTetap: number;
  totalAset: number;
  liabilitasJangkaPendek: LineItem[];
  totalLiabilitasJangkaPendek: number;
  liabilitasJangkaPanjang: LineItem[];
  totalLiabilitasJangkaPanjang: number;
  totalLiabilitas: number;
  ekuitas: LineItem[];
  labaTahunBerjalan: number;
  totalEkuitas: number;
  totalLiabilitasDanEkuitas: number;
  isBalanced: boolean;
}

const EPOCH = new Date(0);

export async function buildNeraca(
  prisma: PrismaClient,
  companyId: string,
  asOfDate: Date,
): Promise<NeracaReport> {
  const balances = await getAllAccountBalances(prisma, companyId, { start: EPOCH, end: asOfDate });
  const list = [...balances.values()].map((b) => ({
    account: b.account,
    amount: canonicalAmount(b.account, b.closingBalance),
  }));

  function items(predicate: (a: Account) => boolean): LineItem[] {
    return list.filter((b) => predicate(b.account)).filter((item) => item.amount !== 0);
  }
  function sum(items: LineItem[]) {
    return items.reduce((s, i) => s + i.amount, 0);
  }

  const asetLancar = items((a) => a.type === "ASET" && !isFixedAssetCode(a.code));
  const asetTetap = items((a) => a.type === "ASET" && isFixedAssetCode(a.code));
  const liabilitasJangkaPendek = items(
    (a) => a.type === "LIABILITAS" && !isLongTermLiabilityCode(a.code),
  );
  const liabilitasJangkaPanjang = items(
    (a) => a.type === "LIABILITAS" && isLongTermLiabilityCode(a.code),
  );
  const ekuitas = items((a) => a.type === "EKUITAS");

  const yearStart = new Date(asOfDate.getFullYear(), 0, 1);
  const labaRugi = await buildLabaRugi(prisma, companyId, { start: yearStart, end: asOfDate });
  const labaTahunBerjalan = labaRugi.labaRugiBersih;

  const totalAsetLancar = sum(asetLancar);
  const totalAsetTetap = sum(asetTetap);
  const totalAset = totalAsetLancar + totalAsetTetap;
  const totalLiabilitasJangkaPendek = sum(liabilitasJangkaPendek);
  const totalLiabilitasJangkaPanjang = sum(liabilitasJangkaPanjang);
  const totalLiabilitas = totalLiabilitasJangkaPendek + totalLiabilitasJangkaPanjang;
  const totalEkuitas = sum(ekuitas) + labaTahunBerjalan;
  const totalLiabilitasDanEkuitas = totalLiabilitas + totalEkuitas;

  return {
    asOfDate,
    asetLancar,
    totalAsetLancar,
    asetTetap,
    totalAsetTetap,
    totalAset,
    liabilitasJangkaPendek,
    totalLiabilitasJangkaPendek,
    liabilitasJangkaPanjang,
    totalLiabilitasJangkaPanjang,
    totalLiabilitas,
    ekuitas,
    labaTahunBerjalan,
    totalEkuitas,
    totalLiabilitasDanEkuitas,
    isBalanced: Math.round(totalAset * 100) === Math.round(totalLiabilitasDanEkuitas * 100),
  };
}
