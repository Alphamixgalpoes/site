"use client";

import { useScrapingQueue } from "../_hooks/useScrapingQueue";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluido",
  erro: "Erro",
};

const statusColors: Record<string, string> = {
  pendente: "bg-gray-100 text-gray-600",
  em_andamento: "bg-amber-100 text-amber-700",
  concluido: "bg-green-100 text-green-700",
  erro: "bg-red-100 text-red-600",
};

export default function ScrapingPage() {
  const { runs, loading } = useScrapingQueue();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Scraping</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Fila de scraping — URLs aguardando processamento pelo developer
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : runs.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          Nenhuma URL na fila de scraping. Submeta uma URL em &ldquo;Submeter&rdquo; para adicionar.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
            <span>URL</span>
            <span>Status</span>
            <span>Registros</span>
            <span>Data</span>
          </div>

          {runs.map((run) => (
            <div
              key={run.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center"
            >
              {/* URL */}
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{run.url}</p>
                {run.erro_mensagem && (
                  <p className="text-xs text-red-500 mt-0.5 truncate">{run.erro_mensagem}</p>
                )}
                {run.notas_dev && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{run.notas_dev}</p>
                )}
              </div>

              {/* Status */}
              <span className={`text-[10px] px-2 py-0.5 font-medium shrink-0 ${statusColors[run.status] || statusColors.pendente}`}>
                {statusLabels[run.status] || run.status}
              </span>

              {/* Stats */}
              <div className="text-right shrink-0">
                {run.registros_scraped > 0 ? (
                  <div className="text-xs text-gray-500">
                    <span>{run.registros_scraped} total</span>
                    {run.registros_novos > 0 && <span className="text-green-600"> · {run.registros_novos} novos</span>}
                    {run.registros_duplicados > 0 && <span className="text-gray-400"> · {run.registros_duplicados} dup</span>}
                  </div>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>

              {/* Date */}
              <div className="text-xs text-gray-400 shrink-0">
                {run.created_at
                  ? new Date(run.created_at).toLocaleDateString("pt-BR")
                  : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
