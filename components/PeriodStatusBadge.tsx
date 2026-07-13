export function PeriodStatusBadge({ isClosed }: { isClosed: boolean }) {
  return isClosed ? (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Ditutup</span>
  ) : (
    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Terbuka</span>
  );
}
