"use client";

import { useState } from "react";
import { useScrapingMonitor } from "./_hooks/useScrapingMonitor";
import { OverviewCards } from "./_components/OverviewCards";
import { FonteHealthCard } from "./_components/FonteHealthCard";
import { RunDetailPanel } from "./_components/RunDetailPanel";

const statusOrder: Record<string, number> = {
  error: 0,
  warning: 1,
  stale: 2,
  ok: 3,
  never: 4,
};

export default function ScrapingPage() {
  const { overview, fontes, loading, reload, executarTodos, executarFonte } = useScrapingMonitor();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const sortedFontes = [...fontes].sort(
    (a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5),
  );

  async function handleExecutarTodos() {
    setExecuting(true);
    try {
      await executarTodos();
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Scraping Monitor</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Observabilidade e controle de todos os scrapers
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={reload}
            className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={handleExecutarTodos}
            disabled={executing}
            className="text-xs px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {executing ? "Iniciando..." : "Executar Todos"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : (
        <>
          {/* Overview */}
          {overview && <OverviewCards data={overview} />}

          {/* Fontes grid */}
          {sortedFontes.length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">
                Fontes ({fontes.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedFontes.map((f) => (
                  <FonteHealthCard
                    key={f.fonte_id}
                    fonte={f}
                    onSelectRun={setSelectedRunId}
                    onExecute={async (id) => {
                      const runId = await executarFonte(id);
                      setSelectedRunId(runId);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-8 text-center">
              Nenhuma fonte com scraping configurado.
            </div>
          )}

          {/* Run detail panel */}
          {selectedRunId && (
            <RunDetailPanel
              runId={selectedRunId}
              onClose={() => setSelectedRunId(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
