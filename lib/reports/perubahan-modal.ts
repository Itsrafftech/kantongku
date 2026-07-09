import type { PrismaClient } from "@prisma/client";
import { getAllAccountBalances, type DateRange } from "@/lib/reports/ledger";
import { buildLabaRugi } from "@/lib/reports/laba-rugi";
import { buildNeraca } from "@/lib/reports/neraca";
import { PRIVE_CODE } from "@/lib/coa";

export interface PerubahanModalReport {
  range: DateRange;
  modalAwal: number;
  setoranModal: number;
  labaRugiPeriode: number;
  prive: number;
  modalAkhir: number;
}

/**
 * Reconciles equity as: Modal Awal + Setoran Modal + Laba (Rugi) Periode -
 * Prive = Modal Akhir. Modal Awal/Akhir are delegated to buildNeraca's
 * totalEkuitas (the same canonical, contra-account-aware calculation used by
 * the balance sheet), so this report always agrees with Neraca. Setoran
 * Modal is derived as the plug that makes the equation hold — it captures
 * new capital contributions (or any other non-Prive equity movement) during
 * the period that isn't P&L and isn't a withdrawal.
 */
export async function buildPerubahanModal(
  prisma: PrismaClient,
  companyId: string,
  range: DateRange,
): Promise<PerubahanModalReport> {
  const dayBeforeStart = new Date(range.start.getTime() - 1);

  const [neracaAwal, neracaAkhir, labaRugi, balances] = await Promise.all([
    buildNeraca(prisma, companyId, dayBeforeStart),
    buildNeraca(prisma, companyId, range.end),
    buildLabaRugi(prisma, companyId, range),
    getAllAccountBalances(prisma, companyId, range),
  ]);

  const modalAwal = neracaAwal.totalEkuitas;
  const modalAkhir = neracaAkhir.totalEkuitas;
  const labaRugiPeriode = labaRugi.labaRugiBersih;

  const priveBalance = [...balances.values()].find((b) => b.account.code === PRIVE_CODE);
  const prive = priveBalance ? priveBalance.closingBalance - priveBalance.openingBalance : 0;

  const setoranModal = modalAkhir - modalAwal - labaRugiPeriode + prive;

  return { range, modalAwal, setoranModal, labaRugiPeriode, prive, modalAkhir };
}
