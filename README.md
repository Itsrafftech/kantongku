# KantongKu

Aplikasi pembukuan akuntansi untuk UMKM Indonesia, sesuai standar **SAK EMKM** (Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah).

## Fitur

- **Daftar Akun** — chart of accounts standar SAK EMKM (Aset, Liabilitas, Ekuitas, Pendapatan, HPP, Beban), dapat ditambah/diubah/dihapus.
- **Jurnal Umum** — input transaksi double-entry dengan validasi debit = kredit.
- **Buku Besar** — mutasi per akun dengan saldo awal, mutasi, dan saldo akhir.
- **Laporan Keuangan** — Laba Rugi, Neraca, Arus Kas, dan Perubahan Modal, otomatis dari data jurnal, dengan filter periode dan export PDF.
- **Periode Akuntansi & Tutup Buku** — tutup buku akhir periode menghasilkan jurnal penutup otomatis.
- **Dashboard** — ringkasan aset/utang/modal/laba, grafik pendapatan vs beban, grafik arus kas bulanan, transaksi terakhir, dan input transaksi cepat.
- **Multi-Perusahaan** — satu akun pengguna dapat mengelola beberapa perusahaan, data terpisah sepenuhnya per perusahaan.

## Tech Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · tRPC · Prisma · PostgreSQL · NextAuth.js (Credentials + Google OAuth) · Recharts · html2canvas + jsPDF

## Setup

### 1. Environment

```bash
cp .env.example .env
```

Isi `NEXTAUTH_SECRET` dengan string acak (mis. `openssl rand -base64 32`). `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` opsional — kosongkan jika tidak menggunakan login Google.

### 2. Database

Jalankan PostgreSQL lokal lewat Docker:

```bash
docker compose up -d
```

Atau arahkan `DATABASE_URL` di `.env` ke instance PostgreSQL Anda sendiri.

### 3. Install & migrasi

```bash
npm install
npm run db:push
npm run db:seed
```

Akun demo setelah seeding:

- Email: `demo@kantongku.id`
- Password: `password123`
- Perusahaan: "Toko Maju Jaya" dengan ~34 transaksi contoh selama 3 bulan terakhir

### 4. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Skrip npm

| Skrip             | Keterangan                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`       | Menjalankan server pengembangan               |
| `npm run build`     | Build produksi                                |
| `npm run start`     | Menjalankan build produksi                    |
| `npm run db:push`   | Menerapkan `prisma/schema.prisma` ke database |
| `npm run db:seed`   | Mengisi data contoh (demo user + transaksi)   |
| `npm run db:studio` | Membuka Prisma Studio                         |

## Struktur Folder

```
app/
  (auth)/login, (auth)/register
  (dashboard)/dashboard, jurnal, buku-besar, laporan/*, akun, pengaturan
  api/auth, api/trpc
components/
server/routers/      tRPC routers per domain
lib/                  utilitas & mesin laporan (lib/reports/*)
prisma/               schema.prisma & seed.ts
types/
```

---

Dibuat dengan KantongKu.
