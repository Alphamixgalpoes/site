"use client";

import Link from "next/link";
import { tipoLabel } from "@/lib/imovel-utils";

type Props = {
  imovel: {
    id: string;
    titulo: string;
    tipo: string;
    cidade: string;
    bairro: string | null;
    area_construida_m2: number | null;
    publicado: boolean;
    latitude: number | null;
    longitude: number | null;
  };
  selecionado: boolean;
  onCentralizar: (id: string) => void;
  onTogglePublicado: (id: string, valor: boolean) => void;
};

export default function MapaListaItem({ imovel: g, selecionado, onCentralizar, onTogglePublicado }: Props) {
  const temCoordenadas = g.latitude !== null && g.longitude !== null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-colors ${
        selecionado ? "bg-blue-50 border-l-2 border-l-[#2e3092]" : "hover:bg-gray-50"
      }`}
    >
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{g.titulo}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {tipoLabel(g.tipo)}
          {g.area_construida_m2 ? ` · ${g.area_construida_m2} m²` : ""}
          {" · "}
          {[g.bairro, g.cidade].filter(Boolean).join(", ")}
        </p>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 shrink-0">
        {!temCoordenadas && (
          <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 font-medium" title="Sem coordenadas">
            Sem pin
          </span>
        )}

        {/* Toggle publicado */}
        <button
          onClick={() => onTogglePublicado(g.id, !g.publicado)}
          className={`text-xs px-1.5 py-0.5 font-medium transition-colors ${
            g.publicado ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
          title={g.publicado ? "Ocultar" : "Publicar"}
        >
          {g.publicado ? "Publicado" : "Oculto"}
        </button>

        {/* Centralizar no mapa */}
        {temCoordenadas && (
          <button
            onClick={() => onCentralizar(g.id)}
            className="p-1.5 text-gray-400 hover:text-[#2e3092] transition-colors"
            title="Centralizar no mapa"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </button>
        )}

        {/* Editar */}
        <Link
          href={`/admin/imoveis/${g.id}/editar`}
          className="p-1.5 text-gray-400 hover:text-[#2e3092] transition-colors"
          title="Editar imovel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
