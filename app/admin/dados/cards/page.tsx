"use client";

import Link from "next/link";
import { useCards } from "../_hooks/useCards";

const tipoBadge: Record<string, string> = {
  criar: "bg-green-100 text-green-700",
  atualizar: "bg-blue-100 text-blue-700",
  mesclar: "bg-purple-100 text-purple-700",
  enriquecer: "bg-amber-100 text-amber-700",
  alertar: "bg-red-100 text-red-700",
};

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR");
}

function fmtMoney(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CardsPage() {
  const {
    cards, resumo, loading, cidades, fontesIds,
    filtroTipo, setFiltroTipo, filtroCidade, setFiltroCidade,
    filtroFonte, setFiltroFonte,
    selecionados, toggleSelecionado, selecionarTodos, limparSelecao,
    aprovar, rejeitar, aprovarLote, rejeitarLote,
  } = useCards();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cards</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {resumo.total} pendente{resumo.total !== 1 ? "s" : ""} · {resumo.criar} criar · {resumo.atualizar} atualizar · {resumo.mesclar} mesclar
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="text-sm border border-gray-200 px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="todos">Todos os tipos</option>
          <option value="criar">Criar</option>
          <option value="atualizar">Atualizar</option>
          <option value="mesclar">Mesclar</option>
          <option value="enriquecer">Enriquecer</option>
          <option value="alertar">Alertar</option>
        </select>

        <select
          value={filtroCidade}
          onChange={(e) => setFiltroCidade(e.target.value)}
          className="text-sm border border-gray-200 px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="todas">Todas as cidades</option>
          {cidades.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {fontesIds.length > 1 && (
          <select
            value={filtroFonte}
            onChange={(e) => setFiltroFonte(e.target.value)}
            className="text-sm border border-gray-200 px-3 py-1.5 bg-white text-gray-700"
          >
            <option value="todas">Todas as fontes</option>
            {fontesIds.map((f) => (
              <option key={f} value={f}>{f.slice(0, 8)}...</option>
            ))}
          </select>
        )}

        {selecionados.size > 0 && (
          <div className="flex gap-2 ml-auto">
            <span className="text-xs text-gray-500 self-center">{selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""}</span>
            <button
              onClick={aprovarLote}
              className="text-xs px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
            >
              Aprovar selecionados
            </button>
            <button
              onClick={rejeitarLote}
              className="text-xs px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium"
            >
              Rejeitar selecionados
            </button>
            <button
              onClick={limparSelecao}
              className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : cards.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          Nenhum card pendente{filtroTipo !== "todos" || filtroCidade !== "todas" || filtroFonte !== "todas" ? " com esses filtros" : ""}.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {/* Select all */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50">
            <input
              type="checkbox"
              checked={selecionados.size === cards.length && cards.length > 0}
              onChange={() => selecionados.size === cards.length ? limparSelecao() : selecionarTodos()}
              className="accent-[#2e3092]"
            />
            <span className="text-xs text-gray-500">{cards.length} card{cards.length !== 1 ? "s" : ""}</span>
          </div>

          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selecionados.has(card.id)}
                onChange={() => toggleSelecionado(card.id)}
                className="accent-[#2e3092] shrink-0"
              />

              {/* Tipo badge */}
              <span className={`text-[10px] px-2 py-0.5 font-semibold uppercase shrink-0 ${tipoBadge[card.tipo] ?? "bg-gray-100 text-gray-600"}`}>
                {card.tipo}
              </span>

              {/* Info */}
              <Link href={`/admin/dados/cards/${card.id}`} className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate hover:text-[#2e3092] transition-colors">
                  {card.cidade ?? "Sem cidade"}{card.bairro ? ` · ${card.bairro}` : ""}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0 mt-0.5">
                  {card.area != null && (
                    <span className="text-xs text-gray-400">{fmt(card.area)} m²</span>
                  )}
                  {card.valor != null && (
                    <span className="text-xs text-gray-400">{fmtMoney(card.valor)}</span>
                  )}
                  {card.mensagem && (
                    <span className="text-xs text-gray-300 truncate max-w-[200px]">{card.mensagem}</span>
                  )}
                </div>
              </Link>

              {/* Confianca */}
              <div className="text-right shrink-0">
                <p className={`text-sm font-medium ${card.confianca >= 0.8 ? "text-green-600" : card.confianca >= 0.5 ? "text-amber-600" : "text-gray-400"}`}>
                  {Math.round(card.confianca * 100)}%
                </p>
                <p className="text-[10px] text-gray-300">confianca</p>
              </div>

              {/* Acoes */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => aprovar(card.id)}
                  title="Aprovar"
                  className="p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
                <button
                  onClick={() => rejeitar(card.id)}
                  title="Rejeitar"
                  className="p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
