"use client";

import { useState } from "react";
import Link from "next/link";

type Galpao = {
  id: string;
  titulo: string;
  tipo: string;
  valor: number | null;
  cidade: string;
  bairro: string | null;
  area_construida_m2: number | null;
  pe_direito_m: number | null;
  numero_docas: number;
  acesso_carreta: boolean;
  descricao: string | null;
  galpao_imagens: { storage_path: string; ordem: number }[];
};

type Props = {
  galpoes: Galpao[];
  supabaseUrl: string;
};

type Tab = "venda" | "locacao";

export default function GalpoesGrid({ galpoes, supabaseUrl }: Props) {
  const [tab, setTab] = useState<Tab>("venda");

  const filtrados = galpoes.filter((g) =>
    g.tipo === tab || g.tipo === "venda_locacao"
  );

  return (
    <div>
      {/* Abas */}
      <div className="flex mt-8 mb-10 border-b border-gray-200">
        {(["venda", "locacao"] as Tab[]).map((t) => {
          const label = t === "venda" ? "Vendas" : "Locação";
          const count = galpoes.filter(
            (g) => g.tipo === t || g.tipo === "venda_locacao"
          ).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
              <span className={`ml-2 text-xs ${tab === t ? "text-gray-500" : "text-gray-300"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <p className="text-sm text-gray-400 py-8">Nenhum imóvel disponível nesta categoria.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((g) => {
            const imagens = [...g.galpao_imagens].sort((a, b) => a.ordem - b.ordem);
            const capa = imagens[0];
            const tipoLabel = g.tipo === "venda" ? "Venda" : g.tipo === "locacao" ? "Locação" : "Venda / Locação";

            return (
              <Link
                key={g.id}
                href={`/galpoes/${g.id}`}
                className="group border border-gray-200 hover:border-gray-400 transition-colors"
              >
                <div className="bg-gray-100 h-48 overflow-hidden">
                  {capa ? (
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/galpoes/${capa.storage_path}`}
                      alt={g.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      Sem foto
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {tipoLabel}
                    </span>
                    {g.valor && (
                      <span className="text-xs text-gray-500">
                        R$ {Number(g.valor).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{g.titulo}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {g.bairro ? `${g.bairro}, ` : ""}
                    {g.cidade}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    {g.area_construida_m2 && <span>{g.area_construida_m2} m²</span>}
                    {g.pe_direito_m && <span>Pé direito {g.pe_direito_m}m</span>}
                    {g.numero_docas > 0 && (
                      <span>
                        {g.numero_docas} doca{g.numero_docas > 1 ? "s" : ""}
                      </span>
                    )}
                    {g.acesso_carreta && <span>Acesso carreta</span>}
                  </div>
                  <p className="mt-3 text-xs text-gray-400 line-clamp-2">{g.descricao}</p>
                  <p className="mt-4 text-xs font-medium text-gray-900 group-hover:underline">
                    Ver detalhes
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
