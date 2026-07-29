"use client";

import { useRunDetail } from "../_hooks/useRunDetail";

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const statusColors: Record<string, string> = {
  concluido: "text-green-600",
  processando: "text-amber-600",
  erro: "text-red-600",
  pendente: "text-gray-500",
};

export function RunDetailPanel({
  runId,
  onClose,
}: {
  runId: string;
  onClose: () => void;
}) {
  const { detail, live, requests, loading } = useRunDetail(runId);

  const isActive = live?.status === "processando";
  const summary = detail;

  return (
    <div className="bg-white border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            Run {runId.slice(0, 8)}...
          </h3>
          {summary && (
            <p className="text-[10px] text-gray-400">{summary.fonte_nome}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Fechar
        </button>
      </div>

      {loading && !live ? (
        <p className="text-sm text-gray-400 py-4 text-center">Carregando...</p>
      ) : (
        <>
          {/* Live status */}
          {isActive && live && (
            <div className="bg-amber-50 border border-amber-200 p-3 text-center">
              <p className="text-sm font-medium text-amber-700 animate-pulse">
                Processando...
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {live.elapsed_seconds !== null && `${live.elapsed_seconds}s`}
                {live.registros_scraped > 0 && ` · ${live.registros_scraped} scraped`}
                {live.registros_novos > 0 && ` · ${live.registros_novos} novos`}
              </p>
            </div>
          )}

          {/* Summary metrics */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric
                label="Status"
                value={summary.status}
                className={statusColors[summary.status]}
              />
              <Metric label="Duracao" value={formatMs(summary.duration_ms)} />
              <Metric label="Scraped" value={String(summary.registros_scraped)} />
              <Metric
                label="Novos"
                value={String(summary.registros_novos)}
                className="text-green-600"
              />
            </div>
          )}

          {/* RED metrics */}
          {summary && summary.total_requests > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">
                Requests (RED)
              </p>
              <div className="grid grid-cols-4 gap-3">
                <Metric label="Total" value={String(summary.total_requests)} />
                <Metric
                  label="OK"
                  value={String(summary.successful_requests)}
                  className="text-green-600"
                />
                <Metric
                  label="Erro"
                  value={String(summary.failed_requests)}
                  className="text-red-600"
                />
                <Metric
                  label="Cache"
                  value={String(summary.cached_requests)}
                  className="text-blue-600"
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {summary?.erro_mensagem && (
            <div className="bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-600">{summary.erro_mensagem}</p>
            </div>
          )}

          {/* Request log table */}
          {requests.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">
                Request Log ({requests.length})
              </p>
              <div className="max-h-64 overflow-y-auto border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 font-medium text-gray-500">URL</th>
                      <th className="text-center px-2 py-1 font-medium text-gray-500">Status</th>
                      <th className="text-right px-2 py-1 font-medium text-gray-500">Tempo</th>
                      <th className="text-center px-2 py-1 font-medium text-gray-500">Cache</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td className="px-2 py-1.5 text-gray-700 truncate max-w-[200px]">
                          {req.url}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <span
                            className={
                              !req.status_code
                                ? "text-gray-400"
                                : req.status_code < 400
                                  ? "text-green-600"
                                  : "text-red-600"
                            }
                          >
                            {req.status_code ?? "ERR"}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-500">
                          {req.response_time_ms !== null ? `${req.response_time_ms}ms` : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {req.cached ? (
                            <span className="text-blue-500">HIT</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  className = "text-gray-900",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-gray-50 p-2">
      <p className="text-[9px] uppercase text-gray-400">{label}</p>
      <p className={`text-sm font-semibold ${className}`}>{value}</p>
    </div>
  );
}
