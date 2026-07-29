"use client";

import type { ScrapingOverview } from "../_hooks/useScrapingMonitor";

const stats = [
  { key: "fontes_ok", label: "OK", color: "text-green-600", bg: "bg-green-50" },
  { key: "fontes_warning", label: "Warning", color: "text-amber-600", bg: "bg-amber-50" },
  { key: "fontes_error", label: "Erro", color: "text-red-600", bg: "bg-red-50" },
  { key: "fontes_stale", label: "Stale", color: "text-gray-500", bg: "bg-gray-50" },
  { key: "fontes_never", label: "Nunca", color: "text-blue-500", bg: "bg-blue-50" },
] as const;

export function OverviewCards({ data }: { data: ScrapingOverview }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* Total fontes */}
      <div className="bg-white border border-gray-200 p-3">
        <p className="text-[10px] uppercase tracking-wide text-gray-400">Fontes</p>
        <p className="text-2xl font-semibold text-gray-900">{data.total_fontes}</p>
      </div>

      {/* Health breakdown */}
      {stats.map((s) => (
        <div key={s.key} className={`${s.bg} border border-gray-100 p-3`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">{s.label}</p>
          <p className={`text-2xl font-semibold ${s.color}`}>
            {data[s.key]}
          </p>
        </div>
      ))}

      {/* 7-day stats */}
      <div className="bg-white border border-gray-200 p-3">
        <p className="text-[10px] uppercase tracking-wide text-gray-400">7d Runs</p>
        <p className="text-2xl font-semibold text-gray-900">{data.runs_last_7d}</p>
        <p className="text-[10px] text-gray-400">{data.novos_last_7d} novos</p>
      </div>
    </div>
  );
}
