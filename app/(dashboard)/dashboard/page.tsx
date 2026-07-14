"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import toast from "react-hot-toast";
import { TrendingUp, TrendingDown, AlertTriangle, type LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/ActiveCompanyProvider";
import { Modal } from "@/components/Modal";
import { CardSkeleton, TableSkeleton } from "@/components/LoadingSkeleton";
import { InfoTooltip } from "@/components/ui/Tooltip";
import {
  JournalLineRows,
  emptyLine,
  getLinesBalanceError,
  type JournalLineInput,
} from "@/components/JournalLineRows";
import { formatDateID, formatDateLongID, formatRupiah, toInputDate } from "@/lib/format";
import { parseRupiah } from "@/lib/utils/currency";
import { formatChartNumber } from "@/lib/utils/formatChartNumber";
import { useRupiahInput } from "@/hooks/useRupiahInput";
import { getDescriptionError, getDateError, getNominalError } from "@/lib/validation/transactionForm";
import {
  KAS_ACCOUNT_CODE,
  SIMPLE_INCOME_CATEGORIES,
  SIMPLE_EXPENSE_CATEGORIES,
  getSimpleCategoryLabel,
} from "@/lib/coa";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useLanguage } from "@/components/LanguageProvider";

type TxMode = "sederhana" | "jurnal";
type Jenis = "PEMASUKAN" | "PENGELUARAN";
const TX_MODE_STORAGE_KEY = "kantongku:quickTxMode";
const ONBOARDING_STORAGE_KEY = "kantongku_onboarding_done";

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-brand-600" : "text-gray-900"}`}>
        {formatRupiah(value)}
      </p>
    </div>
  );
}

type InsightTone = "positive" | "negative" | "neutral" | "warning";

const INSIGHT_TONE_CLASSES: Record<InsightTone, string> = {
  positive: "text-green-600",
  negative: "text-red-600",
  neutral: "text-gray-400",
  warning: "text-amber-600",
};

function InsightCard({ icon: Icon, tone, children }: { icon: LucideIcon; tone: InsightTone; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <Icon className={clsx("h-5 w-5 shrink-0", INSIGHT_TONE_CLASSES[tone])} />
      <span>{children}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const { activeCompanyId, isLoading: companyLoading } = useActiveCompany();
  const utils = trpc.useContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mode, setModeState] = useState<TxMode>("sederhana");
  const [date, setDate] = useState(toInputDate(new Date()));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLineInput[]>([emptyLine(), emptyLine()]);
  const [jenis, setJenis] = useState<Jenis>("PEMASUKAN");
  const [kategori, setKategori] = useState(SIMPLE_INCOME_CATEGORIES[0].code);
  const nominalInput = useRupiahInput();

  // Remember last used mode for the rest of this browser session.
  useEffect(() => {
    const stored = sessionStorage.getItem(TX_MODE_STORAGE_KEY);
    if (stored === "sederhana" || stored === "jurnal") setModeState(stored);
  }, []);

  function setMode(next: TxMode) {
    setModeState(next);
    sessionStorage.setItem(TX_MODE_STORAGE_KEY, next);
  }

  function handleJenisChange(next: Jenis) {
    setJenis(next);
    setKategori((next === "PEMASUKAN" ? SIMPLE_INCOME_CATEGORIES : SIMPLE_EXPENSE_CATEGORIES)[0].code);
  }

  const { data, isLoading } = trpc.dashboard.summary.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );
  const { data: accounts } = trpc.account.list.useQuery(
    { companyId: activeCompanyId! },
    { enabled: !!activeCompanyId },
  );

  // Show immediately for anyone who hasn't finished/skipped onboarding yet.
  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    if (!done) setOnboardingOpen(true);
  }, []);

  // Fallback: nudge again once we know the company has no transactions,
  // even if onboarding was already marked done (e.g. skipped early on).
  useEffect(() => {
    if (!data) return;
    const done = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    if (done && data.latestEntries.length === 0) setOnboardingOpen(true);
  }, [data]);

  function closeOnboarding() {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setOnboardingOpen(false);
  }

  function handleOnboardingStartTransaction() {
    closeOnboarding();
    setModalOpen(true);
  }

  function resetForm() {
    setDescription("");
    setLines([emptyLine(), emptyLine()]);
    nominalInput.setValue("");
    setJenis("PEMASUKAN");
    setKategori(SIMPLE_INCOME_CATEGORIES[0].code);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  const createEntry = trpc.journal.create.useMutation({
    onSuccess: () => {
      toast.success(t("journal.transactionSaved"));
      utils.dashboard.summary.invalidate();
      setModalOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message || t("journal.transactionSaveError")),
  });

  const formErrors = useMemo(() => {
    const errors: string[] = [];
    const descError = getDescriptionError(description, t);
    if (descError) errors.push(descError);
    const dateError = getDateError(date, t);
    if (dateError) errors.push(dateError);
    if (mode === "jurnal") {
      const linesError = getLinesBalanceError(lines, t);
      if (linesError) errors.push(linesError);
    } else {
      const nominalError = getNominalError(nominalInput.numericValue, t);
      if (nominalError) errors.push(nominalError);
    }
    return errors;
  }, [description, date, mode, lines, nominalInput.numericValue, t]);

  const insights = useMemo(() => {
    if (!data) return [];

    const items: { key: string; icon: LucideIcon; tone: InsightTone; text: ReactNode }[] = [];

    const labaPositive = data.labaBersihBulanIni >= 0;
    items.push({
      key: "laba",
      icon: labaPositive ? TrendingUp : TrendingDown,
      tone: labaPositive ? "positive" : "negative",
      text: (
        <>
          {t("dashboard.insightNetIncomePrefix")}{" "}
          <span className={clsx("font-medium", labaPositive ? "text-green-700" : "text-red-600")}>
            {formatRupiah(data.labaBersihBulanIni)}
          </span>
        </>
      ),
    });

    if (data.topExpense) {
      items.push({
        key: "topExpense",
        icon: TrendingDown,
        tone: "neutral",
        text: (
          <>
            {t("dashboard.insightTopExpensePrefix")}{" "}
            <span className="font-medium text-gray-900">{data.topExpense.name}</span>{" "}
            ({formatRupiah(data.topExpense.amount)})
          </>
        ),
      });
    }

    if (data.incompleteTransactionCount > 0) {
      items.push({
        key: "incomplete",
        icon: AlertTriangle,
        tone: "warning",
        text: t("dashboard.insightIncomplete", { count: data.incompleteTransactionCount }),
      });
    }

    return items;
  }, [data, t]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || formErrors.length > 0) return;

    if (mode === "jurnal") {
      createEntry.mutate({
        companyId: activeCompanyId,
        date: new Date(date),
        description,
        lines: lines
          .filter((l) => l.accountId)
          .map((l) => ({
            accountId: l.accountId,
            debit: parseRupiah(l.debit),
            credit: parseRupiah(l.credit),
          })),
      });
      return;
    }

    // Mode Sederhana: build the double-entry journal automatically.
    const amount = nominalInput.numericValue;
    const kasAccount = accounts?.find((a) => a.code === KAS_ACCOUNT_CODE);
    const categoryAccount = accounts?.find((a) => a.code === kategori);
    if (!kasAccount || !categoryAccount) {
      toast.error(t("journal.accountForCategoryMissing"));
      return;
    }

    createEntry.mutate({
      companyId: activeCompanyId,
      date: new Date(date),
      description,
      lines:
        jenis === "PEMASUKAN"
          ? [
              { accountId: kasAccount.id, debit: amount, credit: 0 },
              { accountId: categoryAccount.id, debit: 0, credit: amount },
            ]
          : [
              { accountId: categoryAccount.id, debit: amount, credit: 0 },
              { accountId: kasAccount.id, debit: 0, credit: amount },
            ],
    });
  }

  const loading = companyLoading || isLoading;
  const simpleCategories = jenis === "PEMASUKAN" ? SIMPLE_INCOME_CATEGORIES : SIMPLE_EXPENSE_CATEGORIES;
  const submitDisabled = createEntry.isLoading || formErrors.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t("nav.dashboard")}</h1>
          <p className="text-sm text-gray-500">{t("dashboard.subtitle")}</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          {t("journal.addTransaction")}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <>
          <p className="text-xs text-gray-400">
            {t("dashboard.summaryAsOf", { date: formatDateLongID(new Date(), lang) })}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("dashboard.totalAsset")} value={data.totalAset} />
            <StatCard label={t("dashboard.totalLiability")} value={data.totalUtang} />
            <StatCard label={t("dashboard.equity")} value={data.modal} />
            <StatCard label={t("dashboard.netIncomeThisMonth")} value={data.labaBersihBulanIni} accent />
          </div>
        </>
      ) : null}

      {data && insights.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {insights.map((insight) => (
            <InsightCard key={insight.key} icon={insight.icon} tone={insight.tone}>
              {insight.text}
            </InsightCard>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : data ? (
        <>
          <p className="text-xs text-gray-400">{t("dashboard.last6Months")}</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("dashboard.revenueVsExpense")}</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.revenueVsExpense}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatChartNumber} width={70} />
                  <Tooltip formatter={(v: number) => formatChartNumber(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="pendapatan" name={t("dashboard.revenue")} stroke="#16a34a" strokeWidth={2} />
                  <Line type="monotone" dataKey="beban" name={t("dashboard.expense")} stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="mb-4 flex items-center gap-1 text-sm font-semibold text-gray-700">
                {t("dashboard.monthlyCashFlow")}
                <InfoTooltip text={t("dashboard.cashFlowTooltip")} />
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.cashFlowMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatChartNumber} width={70} />
                  <Tooltip formatter={(v: number) => formatChartNumber(v)} />
                  <Bar dataKey="kasBersih" name={t("dashboard.netCash")} fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}

      <div className="card !p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">{t("dashboard.latestTransactions")}</h2>
          <Link href="/jurnal" className="text-xs font-medium text-brand-600 hover:underline">
            {t("dashboard.viewAll")}
          </Link>
        </div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : !data || data.latestEntries.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">{t("dashboard.noTransactions")}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {data.latestEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                    {formatDateID(entry.date)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">{entry.description}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-900">
                    {formatRupiah(entry.lines.reduce((s, l) => s + Number(l.debit), 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={t("journal.quickAddTitle")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("sederhana")}
              className={clsx(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition",
                mode === "sederhana" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500",
              )}
            >
              {t("journal.modeSederhana")}
            </button>
            <button
              type="button"
              onClick={() => setMode("jurnal")}
              className={clsx(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition",
                mode === "jurnal" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500",
              )}
            >
              {t("journal.modeJurnal")}
            </button>
          </div>

          <div>
            <label className="label-field">{t("common.date")}</label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label-field">{t("common.description")}</label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Penjualan tunai"
            />
          </div>

          {mode === "sederhana" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">{t("journal.transactionType")}</label>
                  <select
                    className="input-field"
                    value={jenis}
                    onChange={(e) => handleJenisChange(e.target.value as Jenis)}
                  >
                    <option value="PEMASUKAN">{t("journal.income")}</option>
                    <option value="PENGELUARAN">{t("journal.expense")}</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">{t("journal.category")}</label>
                  <select
                    className="input-field"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                  >
                    {simpleCategories.map((c) => (
                      <option key={c.code} value={c.code}>
                        {getSimpleCategoryLabel(c, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-field">{t("journal.nominalRp")}</label>
                <input
                  ref={nominalInput.inputRef}
                  type="text"
                  inputMode="numeric"
                  className="input-field"
                  value={nominalInput.displayValue}
                  onChange={nominalInput.onChange}
                  required
                  placeholder="500.000"
                />
              </div>
            </>
          ) : (
            <JournalLineRows accounts={accounts ?? []} lines={lines} onChange={setLines} />
          )}

          {formErrors.length > 0 && (
            <div className="space-y-1">
              {formErrors.map((error) => (
                <p key={error} className="text-sm text-red-500">
                  {error}
                </p>
              ))}
            </div>
          )}

          <button type="submit" disabled={submitDisabled} className="btn-primary w-full">
            {createEntry.isLoading ? t("common.saving") : t("journal.saveTransaction")}
          </button>
        </form>
      </Modal>

      <OnboardingModal
        open={onboardingOpen}
        onClose={closeOnboarding}
        onStartTransaction={handleOnboardingStartTransaction}
      />
    </div>
  );
}
