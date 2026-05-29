"use client";

import Link from "next/link";
import { Galpao } from "./useGalpoes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const tipoLabel = (t: string) =>
  t === "venda" ? "Venda" : t === "locacao" ? "Locação" : "V/L";

type Props = {
  galpao: Galpao;
  deletingId: string | null;
  onTogglePublicado: (id: string, atual: boolean) => void;
  onStartDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
};

export default function GalpaoRow({
  galpao: g,
  deletingId,
  onTogglePublicado,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
}: Props) {
  const imgs = [...g.galpao_imagens].sort((a, b) => a.ordem - b.ordem);
  const capa = imgs[0];

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">

      {/* Thumbnail */}
      <div className="w-16 h-12 bg-gray-100 shrink-0 overflow-hidden">
        {capa ? (
          <img
            src={`${supabaseUrl}/storage/v1/object/public/galpoes/${capa.storage_path}`}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">—</div>
        )}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{g.titulo}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {[g.bairro, g.cidade].filter(Boolean).join(", ")}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 md:hidden">
          {tipoLabel(g.tipo)}
          {g.area_construida_m2 ? ` · ${g.area_construida_m2} m²` : ""}
          {g.valor ? ` · R$ ${Number(g.valor).toLocaleString("pt-BR")}` : ""}
        </p>
      </div>

      {/* Badges — desktop */}
      <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 shrink-0">
        <span className="w-20 text-center">{tipoLabel(g.tipo)}</span>
        <span className="w-20 text-right">{g.area_construida_m2 ? `${g.area_construida_m2} m²` : "—"}</span>
        <span className="w-24 text-right">{g.valor ? `R$ ${Number(g.valor).toLocaleString("pt-BR")}` : "—"}</span>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-3 shrink-0 ml-2">
        <button
          onClick={() => onTogglePublicado(g.id, g.publicado)}
          className={`text-xs px-3 py-1 font-medium transition-colors min-w-[80px] text-center ${
            g.publicado
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {g.publicado ? "Publicado" : "Oculto"}
        </button>

        <Link href={`/admin/galpoes/${g.id}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
          Editar
        </Link>

        {deletingId === g.id ? (
          <div className="flex items-center gap-2">
            <button onClick={() => onConfirmDelete(g.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">
              Confirmar
            </button>
            <button onClick={onCancelDelete} className="text-xs text-gray-400 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStartDelete(g.id)}
            className="text-xs text-gray-300 hover:text-red-500 transition-colors"
          >
            Excluir
          </button>
        )}
      </div>
    </div>
  );
}
