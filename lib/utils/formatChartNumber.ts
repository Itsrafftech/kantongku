/**
 * Compact Indonesian Rupiah formatting for chart axes/tooltips, e.g.
 * 500000 -> "Rp 500rb", 10000000 -> "Rp 10 jt", 1500000 -> "Rp 1,5 jt".
 * Negative values keep the sign (e.g. arus kas bulanan can go negative).
 */
export function formatChartNumber(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    const millions = (abs / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `${sign}Rp ${millions} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000)}rb`;
  }
  return `${sign}Rp ${abs}`;
}
