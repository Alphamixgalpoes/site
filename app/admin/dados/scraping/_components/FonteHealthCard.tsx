"use client";

import type { FonteHealth, RecentRun } from "../_hooks/useScrapingMonitor";

const statusConfig: Record<string, { dot: string; bg: string; label: string }> = {
  ok: { dot: "bg-green-500", bg: "bg-green-50", label: "OK" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50", label: "Warning" },
  error: { dot: "bg-red-500", bg: "bg-red-50", label: "Erro" },
  stale: { dot: "bg-gray-400", bg: "bg-gray-50", label: "Stale" },
  never: { dot: "bg-blue-400", bg: "bg-blue-50", label: "Nunca" },
};

function RunDot({ run }: { run: RecentRun }) {
  const color =
    run.status === "concluido"
      ? "bg-green-500"
      : run.status === "erro"
        ? "bg-red-500"
        : run.status === "processando"
          ? "bg-amber-400 animate-pulse"
          : "bg-gray-300";

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color}`}
      title={`${run.status} — ${run.registros_novos} novos`}
    />
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FonteHealthCard({
  fonte,
  onSelectRun,
  onExecute,
}: {
  fonte: FonteHealth;
  onSelectRun?: (runId: string) => void;
  onExecute?: (fonteId: string) => void;
}) {
  const cfg = statusConfig[fonte.status] || statusConfig.never;

  return (
    <div className={`border border-gray-200 p-4 ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{fonte.nome}</h3>
          <p className="text-[10px] text-gray-400 uppercase">{fonte.platform}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className="text-[10px] font-medium text-gray-500">{cfg.label}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(fonte.success_rate_last_5 * 100)}%
          </p>
          <p className="text-[9px] text-gray-400">Success</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{fonte.avg_novos_last_5}</p>
          <p className="text-[9px] text-gray-400">Avg Novos</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {fonte.avg_duration_ms > 0 ? formatDuration(fonte.avg_duration_ms) : "—"}
          </p>
          <p className="text-[9px] text-gray-400">Avg Tempo</p>
        </div>
      </div>

      {/* Last run + sparkline + execute */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-gray-400">
            Ultimo: {formatDate(fonte.last_run_at)}
          </p>
          {onExecute && (
            <button
              type="button"
              onClick={() => onExecute(fonte.fonte_id)}
              className="text-[10px] px-1.5 py-0.5 border border-gray-300 text-gray-600 hover:bg-white"
            >
              Executar
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {fonte.recent_runs.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRun?.(r.id)}
              className="cursor-pointer"
            >
              <RunDot run={r} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
