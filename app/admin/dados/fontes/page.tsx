"use client";

import Link from "next/link";
import { useFontes, type Fonte } from "../_hooks/useFontes";

const statusLabels: Record<string, string> = {
  pendente_raw: "Pendente",
  tem_raw: "Tem Raw",
  tem_clean: "Tem Clean",
  cards_gerados: "Cards Gerados",
};

const statusColors: Record<string, string> = {
  pendente_raw: "bg-gray-100 text-gray-600",
  tem_raw: "bg-amber-100 text-amber-700",
  tem_clean: "bg-blue-100 text-blue-700",
  cards_gerados: "bg-green-100 text-green-700",
};

const scrapingLabels: Record<string, string> = {
  pendente: "Scraping pendente",
  em_desenvolvimento: "Em desenvolvimento",
  ativo: "Scraping ativo",
  erro: "Scraping erro",
};

const scrapingColors: Record<string, string> = {
  pendente: "bg-gray-100 text-gray-600",
  em_desenvolvimento: "bg-amber-100 text-amber-700",
  ativo: "bg-green-100 text-green-700",
  erro: "bg-red-100 text-red-600",
};

function StatusBadge({ fonte }: { fonte: Fonte }) {
  const status = fonte.processing_status || "pendente_raw";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 font-medium ${statusColors[status] || statusColors.pendente_raw}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function ScrapingBadge({ fonte }: { fonte: Fonte }) {
  if (fonte.submission_type !== "url") return null;
  const s = fonte.scraping_status || "pendente";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 font-medium ${scrapingColors[s] || scrapingColors.pendente}`}>
      {scrapingLabels[s] || s}
    </span>
  );
}

export default function FontesPage() {
  const { fontes, loading, excluir } = useFontes();

  async function handleExcluir(id: string) {
    if (!confirm("Excluir esta fonte e todos os seus dados?")) return;
    await excluir(id);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fontes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {fontes.length} fonte{fontes.length !== 1 ? "s" : ""} cadastrada{fontes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/dados/submeter"
          className="text-sm px-4 py-2 bg-[#2e3092] text-white hover:bg-[#252777] transition-colors font-medium"
        >
          Submeter dados
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : fontes.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          Nenhuma fonte cadastrada. Use &ldquo;Submeter dados&rdquo; para comecar.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {fontes.map((fonte) => (
            <Link
              key={fonte.id}
              href={`/admin/dados/fontes/${fonte.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-[#2e3092] transition-colors">
                    {fonte.nome}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 uppercase">
                    {fonte.submission_type === "url" ? "URL" : "Planilha"}
                  </span>
                  <StatusBadge fonte={fonte} />
                  <ScrapingBadge fonte={fonte} />
                  {!fonte.ativo && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600">Inativa</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fonte.created_at && new Date(fonte.created_at).toLocaleDateString("pt-BR")}
                  {fonte.last_processed_at && ` · Processada ${new Date(fonte.last_processed_at).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExcluir(fonte.id); }}
                className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Excluir
              </button>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
