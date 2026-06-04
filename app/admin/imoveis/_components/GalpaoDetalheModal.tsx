"use client";

import { useEffect } from "react";
import Link from "next/link";
import ImageGallery from "@/app/components/ImageGallery";
import type { Galpao } from "../_hooks/useGalpoes";

import { SUPABASE_URL } from "@/lib/constants";
import { tipoLabel, categoriaLabel, usoTerrenoLabel } from "@/lib/galpao-utils";
import { FichaRow } from "@/app/components/FichaRow";

type Props = {
  galpao: Galpao;
  onClose: () => void;
  onOpenPreview: () => void;
};





export default function GalpaoDetalheModal({ galpao: g, onClose, onOpenPreview }: Props) {
  const imgs = [...g.galpao_imagens].sort((a, b) => a.ordem - b.ordem);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const tipo = tipoLabel(g.tipo);
  const categoria = categoriaLabel(g.categoria);
  const usoTerreno = usoTerrenoLabel(g.uso_terreno);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-sm shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-snug">{g.titulo}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {[g.bairro, g.cidade].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2.5 py-1 font-medium rounded-sm ${
              g.publicado ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {g.publicado ? "Publicado" : "Oculto"}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 transition-colors text-xl leading-none px-1"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Galeria — todas as imagens (sem filtro de visibilidade) */}
        {imgs.length > 0 && (
          <div className="px-6 pt-5">
            <ImageGallery
              images={imgs}
              supabaseUrl={SUPABASE_URL}
              alt={g.titulo}
              initialIndex={Math.max(0, imgs.findIndex((i) => i.is_capa))}
            />
          </div>
        )}

        {/* Ficha técnica interna — todos os campos */}
        <div className="px-6 pt-6 pb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Ficha técnica</p>
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <FichaRow label="Categoria" value={categoria} />
            <FichaRow label="Negócio" value={tipo} />
            <FichaRow label="Cidade" value={g.cidade} />
            <FichaRow label="Bairro" value={g.bairro} />
            <FichaRow label="Endereço" value={g.endereco} />
            <FichaRow label="CEP" value={g.cep} />
            {g.uso_terreno && <FichaRow label="Uso indicado" value={usoTerreno} />}
            <FichaRow
              label="Valor"
              value={g.valor ? `R$ ${Number(g.valor).toLocaleString("pt-BR")}${g.tipo === "locacao" ? "/mês" : ""}` : null}
            />
            <FichaRow
              label="Área total"
              value={g.area_total_m2 ? `${g.area_total_m2.toLocaleString("pt-BR")} m²` : null}
            />
            <FichaRow
              label="Área construída"
              value={g.area_construida_m2 ? `${g.area_construida_m2.toLocaleString("pt-BR")} m²` : null}
            />
            <FichaRow
              label="Área de piso"
              value={g.area_piso_m2 ? `${g.area_piso_m2.toLocaleString("pt-BR")} m²` : null}
            />
            <FichaRow
              label="Pé direito"
              value={g.pe_direito_m ? `${g.pe_direito_m} m` : null}
            />
            <FichaRow
              label="Docas"
              value={g.numero_docas > 0 ? `${g.numero_docas}` : null}
            />
            <FichaRow
              label="Potência elétrica"
              value={g.potencia_eletrica_kva ? `${g.potencia_eletrica_kva} kVA` : null}
            />
            <FichaRow
              label="Vagas"
              value={g.vagas_estacionamento > 0 ? `${g.vagas_estacionamento}` : null}
            />
            <FichaRow label="Acesso carreta" value={g.acesso_carreta ? "Sim" : null} />
            <FichaRow label="Sprinklers" value={g.sprinklers ? "Sim" : null} />
            <FichaRow label="Guarita" value={g.guarita ? "Sim" : null} />
            <FichaRow
              label="Condomínio"
              value={
                g.condominio
                  ? `Sim${g.valor_condominio ? ` — R$ ${Number(g.valor_condominio).toLocaleString("pt-BR")}/mês` : ""}`
                  : null
              }
            />
          </div>
        </div>

        {/* Descrição */}
        {g.descricao && (
          <div className="px-6 pt-4 pb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Descrição</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{g.descricao}</p>
          </div>
        )}

        {/* Observações internas */}
        {g.observacoes && (
          <div className="px-6 pt-4 pb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Observações internas
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3">
              <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">{g.observacoes}</p>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="px-6 py-4 mt-2 border-t border-gray-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onOpenPreview}
            className="border border-gray-300 text-gray-700 px-4 py-2 text-sm hover:border-gray-500 hover:text-gray-900 transition-colors rounded-sm"
          >
            Visualizar anúncio
          </button>
          <Link
            href={`/admin/galpoes/${g.id}`}
            className="bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors rounded-sm"
          >
            Editar →
          </Link>
        </div>
      </div>
    </div>
  );
}
