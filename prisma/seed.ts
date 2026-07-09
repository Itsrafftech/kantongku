import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_COA } from "../lib/coa";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

interface Line {
  code: string;
  debit?: number;
  credit?: number;
}

async function main() {
  const email = "demo@kantongku.id";
  const password = await bcrypt.hash("password123", 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists, skipping seed. Delete the user first to reseed.");
    return;
  }

  const user = await prisma.user.create({
    data: { name: "Demo User", email, password },
  });

  const company = await prisma.company.create({
    data: {
      name: "Toko Maju Jaya",
      userId: user.id,
      address: "Jl. Merdeka No. 45, Bandung",
      phone: "022-1234567",
      npwp: "01.234.567.8-901.000",
    },
  });

  await prisma.account.createMany({
    data: DEFAULT_COA.map((account) => ({ ...account, companyId: company.id, isDefault: true })),
  });

  const accounts = await prisma.account.findMany({ where: { companyId: company.id } });
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  function code(c: string) {
    const account = byCode.get(c);
    if (!account) throw new Error(`Seed account code ${c} not found`);
    return account.id;
  }

  async function addEntry(
    date: Date,
    description: string,
    lines: Line[],
    reference?: string,
  ) {
    await prisma.journalEntry.create({
      data: {
        date,
        description,
        reference,
        companyId: company.id,
        lines: {
          create: lines.map((l) => ({
            accountId: code(l.code),
            debit: l.debit ?? 0,
            credit: l.credit ?? 0,
          })),
        },
      },
    });
  }

  // --- Opening balances ---
  await addEntry(daysAgo(90), "Setoran modal awal pemilik", [
    { code: "101", debit: 40_000_000 },
    { code: "102", debit: 15_000_000 },
    { code: "301", credit: 55_000_000 },
  ]);

  await addEntry(daysAgo(88), "Pembelian persediaan awal (tunai)", [
    { code: "104", debit: 10_000_000 },
    { code: "101", credit: 10_000_000 },
  ]);

  await addEntry(daysAgo(85), "Pencairan pinjaman bank", [
    { code: "102", debit: 25_000_000 },
    { code: "202", credit: 25_000_000 },
  ]);

  await addEntry(daysAgo(80), "Pembelian persediaan tambahan (kredit)", [
    { code: "104", debit: 6_000_000 },
    { code: "201", credit: 6_000_000 },
  ]);

  await addEntry(daysAgo(75), "Pembelian peralatan toko", [
    { code: "123", debit: 8_000_000 },
    { code: "101", credit: 8_000_000 },
  ]);

  await addEntry(daysAgo(60), "Pembayaran sebagian utang usaha", [
    { code: "201", debit: 3_000_000 },
    { code: "101", credit: 3_000_000 },
  ]);

  // --- Sales cycle: 7 transactions spread across the last ~85 days ---
  const salesPlan = [
    { day: 82, amount: 2_500_000, credit: false },
    { day: 70, amount: 3_200_000, credit: true },
    { day: 58, amount: 1_800_000, credit: false },
    { day: 45, amount: 4_000_000, credit: true },
    { day: 32, amount: 2_100_000, credit: false },
    { day: 18, amount: 3_600_000, credit: false },
    { day: 6, amount: 2_900_000, credit: true },
  ];

  let piutangSaleDate: Date | null = null;

  for (const sale of salesPlan) {
    const date = daysAgo(sale.day);
    const hpp = Math.round(sale.amount * 0.55);
    await addEntry(
      date,
      sale.credit ? "Penjualan kredit" : "Penjualan tunai",
      [
        { code: sale.credit ? "103" : "101", debit: sale.amount },
        { code: "401", credit: sale.amount },
      ],
    );
    await addEntry(date, "Harga pokok penjualan atas transaksi", [
      { code: "501", debit: hpp },
      { code: "104", credit: hpp },
    ]);
    if (sale.credit) piutangSaleDate = date;
  }

  if (piutangSaleDate) {
    await addEntry(daysAgo(20), "Penerimaan pelunasan piutang usaha", [
      { code: "101", debit: 3_200_000 },
      { code: "103", credit: 3_200_000 },
    ]);
  }

  // --- Monthly operating expenses (3 months) ---
  const expenseMonths = [85, 55, 25];
  for (const day of expenseMonths) {
    await addEntry(daysAgo(day), "Pembayaran gaji karyawan", [
      { code: "601", debit: 3_500_000 },
      { code: "101", credit: 3_500_000 },
    ]);
    await addEntry(daysAgo(day - 1), "Pembayaran sewa toko", [
      { code: "602", debit: 2_000_000 },
      { code: "101", credit: 2_000_000 },
    ]);
    await addEntry(daysAgo(day - 2), "Pembayaran listrik, air & telepon", [
      { code: "603", debit: 750_000 },
      { code: "101", credit: 750_000 },
    ]);
  }

  // --- Bank interest & owner withdrawals ---
  await addEntry(daysAgo(55), "Beban bunga pinjaman bank", [
    { code: "609", debit: 300_000 },
    { code: "102", credit: 300_000 },
  ]);
  await addEntry(daysAgo(25), "Beban bunga pinjaman bank", [
    { code: "609", debit: 300_000 },
    { code: "102", credit: 300_000 },
  ]);

  await addEntry(daysAgo(50), "Penarikan modal pemilik (prive)", [
    { code: "302", debit: 1_000_000 },
    { code: "101", credit: 1_000_000 },
  ]);
  await addEntry(daysAgo(15), "Penarikan modal pemilik (prive)", [
    { code: "302", debit: 1_200_000 },
    { code: "101", credit: 1_200_000 },
  ]);

  const totalEntries = await prisma.journalEntry.count({ where: { companyId: company.id } });
  console.log(`Seed selesai: user=${email} / password123, perusahaan="${company.name}"`);
  console.log(`${totalEntries} jurnal berhasil dibuat.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
