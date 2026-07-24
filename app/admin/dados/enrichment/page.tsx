"use client";

import { useEnrichmentCards } from "./_hooks/useEnrichmentCards";
import EnrichmentCardPreview from "./_components/EnrichmentCardPreview";

export default function EnrichmentPage() {
  const {
    cards,
    counts,
    loading,
    cidades,
    status,
    setStatus,
    filtroCidade,
    setFiltroCidade,
  } = useEnrichmentCards();

  const pendentes = counts.pendente ?? 0;
  const emAndamento = counts.em_andamento ?? 0;
  const concluidos = counts.concluido ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Enriquecimento</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {pendentes} pendente{pendentes !== 1 ? "s" : ""}
          {emAndamento > 0 && ` · ${emAndamento} em andamento`}
          {concluidos > 0 && ` · ${concluidos} concluído${concluidos !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-gray-200 px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="pendente">Pendentes</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluídos</option>
          <option value="descartado">Descartados</option>
        </select>

        <select
          value={filtroCidade}
          onChange={(e) => setFiltroCidade(e.target.value)}
          className="text-sm border border-gray-200 px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="todas">Todas as cidades</option>
          {cidades.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <span className="text-xs text-gray-400 ml-auto">
          {cards.length} card{cards.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          Carregando...
        </div>
      ) : cards.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          Nenhum card de enriquecimento
          {status !== "pendente" ? ` com status "${status}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <EnrichmentCardPreview key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
