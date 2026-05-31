"use client";

import { campoVisivel } from "@/lib/visibilidade";
import type { ConfigCampo } from "@/lib/visibilidade";
import type { Galpao } from "./useGalpoes";
import { SUPABASE_URL } from "@/lib/constants";
import { tipoLabel } from "@/lib/galpao-utils";

type Props = {
  galpao: Galpao;
  configCampos: ConfigCampo[];
};

export default function GalpaoCardPreview({ galpao: g, configCampos }: Props) {
  const imgs = [...g.galpao_imagens].sort((a, b) => a.ordem - b.ordem);
  const capa = imgs.find((i) => i.is_capa) ?? imgs[0];
  const overrides = g.campos_visibilidade ?? {};

  const cv = (chave: string) => campoVisivel(chave, "card", configCampos, overrides);

  const tipoBg =
    g.tipo === "venda"
      ? "bg-[#2e3092] text-white"
      : g.tipo === "locacao"
      ? "bg-gray-900 text-white"
      : "bg-gray-700 text-white";

  return (
    <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden flex flex-col max-w-sm mx-auto">
      {/* Imagem */}
      <div className="relative bg-gray-100 h-52 overflow-hidden shrink-0">
        {capa ? (
          <img
            src={`${SUPABASE_URL}/storage/v1/object/public/galpoes/${capa.storage_path}`}
            alt={g.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            Sem foto
          </div>
        )}
        <span className={`absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-sm ${tipoBg}`}>
          {tipoLabel(g.tipo)}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-sm font-bold text-gray-900 leading-snug">{g.titulo}</h3>
        {cv("bairro") && (
          <p className="text-xs text-gray-400 mt-1">
            {g.bairro ? `${g.bairro}, ` : ""}{g.cidade}
          </p>
        )}

        {g.valor && cv("valor") && (
          <p className="text-lg font-bold text-gray-900 mt-3">
            R$ {Number(g.valor).toLocaleString("pt-BR")}
            {g.tipo === "locacao" && (
              <span className="text-xs font-normal text-gray-400 ml-1">/mês</span>
            )}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {g.categoria === "terreno" ? (
            <>
              {g.area_total_m2 && cv("area_total_m2") && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                  {g.area_total_m2.toLocaleString("pt-BR")} m²
                </span>
              )}
              {g.uso_terreno && cv("uso_terreno") && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                  {g.uso_terreno === "galpao" ? "Para galpão" : g.uso_terreno === "loja" ? "Para loja" : "Galpão e loja"}
                </span>
              )}
            </>
          ) : (
            <>
              {g.area_construida_m2 && cv("area_construida_m2") && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                  {g.area_construida_m2.toLocaleString("pt-BR")} m²
                </span>
              )}
              {g.pe_direito_m && cv("pe_direito_m") && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                  Pé {g.pe_direito_m}m
                </span>
              )}
              {g.numero_docas > 0 && cv("numero_docas") && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                  {g.numero_docas} doca{g.numero_docas > 1 ? "s" : ""}
                </span>
              )}
              {g.acesso_carreta && g.categoria === "galpao" && cv("acesso_carreta") && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                  Acesso carreta
                </span>
              )}
              {g.vagas_estacionamento > 0 && g.categoria === "loja" && cv("vagas_estacionamento") && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                  {g.vagas_estacionamento} vagas
                </span>
              )}
            </>
          )}
        </div>

        <div className="mt-auto pt-4">
          <span className="text-xs font-bold text-[#2e3092]">Ver detalhes →</span>
        </div>
      </div>
    </div>
  );
}
