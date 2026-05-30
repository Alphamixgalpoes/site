"use client";

import { useEffect } from "react";
import GalpaoCardPreview from "./GalpaoCardPreview";
import { campoVisivel } from "@/lib/visibilidade";
import type { ConfigCampo } from "@/lib/visibilidade";
import type { Galpao } from "./useGalpoes";

type Props = {
  galpao: Galpao;
  configCampos: ConfigCampo[];
  onClose: () => void;
};

function FichaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row px-4 py-3 gap-0.5 sm:gap-0 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 sm:w-44 shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

export default function GalpaoPreviewModal({ galpao: g, configCampos, onClose }: Props) {
  const overrides = g.campos_visibilidade ?? {};
  const cv = (chave: string) => campoVisivel(chave, "ficha", configCampos, overrides);

  const tipoLabel = g.tipo === "venda" ? "Venda" : g.tipo === "locacao" ? "Locação" : "Venda / Locação";
  const categoriaLabel = g.categoria === "loja" ? "Loja" : g.categoria === "terreno" ? "Terreno" : "Galpão";
  const usoTerrenoLabel =
    g.uso_terreno === "galpao"
      ? "Para galpão"
      : g.uso_terreno === "loja"
      ? "Para loja"
      : g.uso_terreno === "ambos"
      ? "Galpão e loja"
      : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler, true); // capture phase — consome antes do modal atrás
    return () => document.removeEventListener("keydown", handler, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-sm shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Prévia do anúncio</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">Como o visitante vê</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors text-xl leading-none px-1"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Aviso se oculto */}
        {!g.publicado && (
          <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-sm px-4 py-2.5 text-xs text-amber-800 font-medium">
            Este imóvel está oculto — visitantes não o veem.
          </div>
        )}

        {/* Card */}
        <div className="px-5 pt-5">
          <p className="text-xs text-gray-400 mb-2">Card na listagem</p>
          <GalpaoCardPreview galpao={g} configCampos={configCampos} />
        </div>

        {/* Separador */}
        <div className="mx-5 my-6 border-t border-gray-200" />

        {/* Ficha pública */}
        <div className="px-5 pb-6">
          <p className="text-xs text-gray-400 mb-2">Ficha técnica na página do anúncio</p>

          {/* Sidebar resumo */}
          <div className="border border-gray-200 rounded-sm p-4 mb-4">
            <span className="text-xs font-bold tracking-widest text-[#2e3092] uppercase">{tipoLabel}</span>
            <p className="text-base font-bold text-gray-900 mt-1 leading-snug">{g.titulo}</p>
            {cv("bairro") && g.bairro && (
              <p className="text-xs text-gray-400 mt-0.5">{g.bairro}, {g.cidade}</p>
            )}
            {!cv("bairro") && (
              <p className="text-xs text-gray-400 mt-0.5">{g.cidade}</p>
            )}
            {g.valor && cv("valor") && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                  {g.tipo === "locacao" ? "Valor mensal" : "Valor"}
                </p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  R$ {Number(g.valor).toLocaleString("pt-BR")}
                </p>
              </div>
            )}
          </div>

          {/* Ficha de campos */}
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <FichaRow label="Categoria" value={categoriaLabel} />
            {cv("uso_terreno") && <FichaRow label="Uso indicado" value={usoTerrenoLabel} />}
            <FichaRow label="Negócio" value={tipoLabel} />
            <FichaRow label="Cidade" value={g.cidade} />
            {cv("bairro") && <FichaRow label="Bairro" value={g.bairro} />}
            {cv("endereco") && <FichaRow label="Endereço" value={g.endereco} />}
            {cv("area_total_m2") && (
              <FichaRow
                label="Área total"
                value={g.area_total_m2 ? `${g.area_total_m2.toLocaleString("pt-BR")} m²` : null}
              />
            )}
            {cv("area_construida_m2") && (
              <FichaRow
                label="Área construída"
                value={g.area_construida_m2 ? `${g.area_construida_m2.toLocaleString("pt-BR")} m²` : null}
              />
            )}
            {cv("area_piso_m2") && (
              <FichaRow
                label="Área de piso"
                value={g.area_piso_m2 ? `${g.area_piso_m2.toLocaleString("pt-BR")} m²` : null}
              />
            )}
            {cv("pe_direito_m") && (
              <FichaRow
                label="Pé direito"
                value={g.pe_direito_m ? `${g.pe_direito_m} m` : null}
              />
            )}
            {cv("numero_docas") && (
              <FichaRow
                label="Docas"
                value={g.numero_docas > 0 ? `${g.numero_docas}` : null}
              />
            )}
            {cv("potencia_eletrica_kva") && (
              <FichaRow
                label="Potência elétrica"
                value={g.potencia_eletrica_kva ? `${g.potencia_eletrica_kva} kVA` : null}
              />
            )}
            {cv("vagas_estacionamento") && (
              <FichaRow
                label="Vagas"
                value={g.vagas_estacionamento > 0 ? `${g.vagas_estacionamento}` : null}
              />
            )}
            {cv("acesso_carreta") && <FichaRow label="Acesso carreta" value={g.acesso_carreta ? "Sim" : null} />}
            {cv("sprinklers") && <FichaRow label="Sprinklers" value={g.sprinklers ? "Sim" : null} />}
            {cv("guarita") && <FichaRow label="Guarita" value={g.guarita ? "Sim" : null} />}
            {cv("condominio") && (
              <FichaRow
                label="Condomínio"
                value={
                  g.condominio
                    ? `Sim${g.valor_condominio ? ` — R$ ${Number(g.valor_condominio).toLocaleString("pt-BR")}/mês` : ""}`
                    : null
                }
              />
            )}
          </div>

          {/* Descrição pública */}
          {g.descricao && cv("descricao") && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Descrição</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{g.descricao}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
