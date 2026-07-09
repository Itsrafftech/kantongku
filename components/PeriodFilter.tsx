"use client";

import { toInputDate } from "@/lib/format";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfQuarter(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function endOfQuarter(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 0);
}
function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}
function endOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 11, 31);
}

export const PRESETS = {
  bulanan: () => ({ startDate: toInputDate(startOfMonth()), endDate: toInputDate(endOfMonth()) }),
  kuartalan: () => ({
    startDate: toInputDate(startOfQuarter()),
    endDate: toInputDate(endOfQuarter()),
  }),
  tahunan: () => ({ startDate: toInputDate(startOfYear()), endDate: toInputDate(endOfYear()) }),
};

export function PeriodFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  return (
    <div className="card flex flex-wrap items-end gap-3">
      <div className="flex gap-2">
        {(["bulanan", "kuartalan", "tahunan"] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(PRESETS[preset]())}
            className="btn-secondary !py-1.5 !text-xs capitalize"
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="h-8 w-px bg-gray-200" />
      <div>
        <label className="label-field">Dari</label>
        <input
          type="date"
          className="input-field"
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        />
      </div>
      <div>
        <label className="label-field">Sampai</label>
        <input
          type="date"
          className="input-field"
          value={value.endDate}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
        />
      </div>
    </div>
  );
}
