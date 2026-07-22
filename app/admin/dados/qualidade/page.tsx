"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

type QualidadeItem = {
  imovel_id: string;
  titulo: string | null;
  cidade: string | null;
  score: number;
  completude: number;
  frescor: number;
  campos_vazios: string[];
};

function scoreColor(s: number) {
  if (s >= 0.8) return "text-green-700 bg-green-50";
  if (s >= 0.5) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function scoreBar(s: number) {
  if (s >= 0.8) return "bg-green-500";
  if (s >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

export default function QualidadePage() {
  const [items, setItems] = useState<QualidadeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await apiGet<QualidadeItem[]>("/api/v1/mdm/qualidade/ranking", { auth: true, params: { limit: "50" } });
      setItems(data);
    } catch (err) {
      console.error("Erro ao carregar ranking:", err);
    } finally {
      setLoading(false);
    }
  }

  async function recalcular() {
    setRecalculando(true);
    try {
      await apiPost("/api/v1/mdm/qualidade/recalcular", {}, { auth: true });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculando(false);
    }
  }

  const avgScore = items.length > 0
    ? items.reduce((sum, i) => sum + i.score, 0) / items.length
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Qualidade</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ranking de qualidade dos dados de imoveis</p>
        </div>
        <button
          onClick={recalcular}
          disabled={recalculando}
          className="text-sm px-4 py-2 bg-[#2e3092] text-white hover:bg-[#252777] transition-colors font-medium disabled:opacity-50"
        >
          {recalculando ? "Recalculando..." : "Recalcular"}
        </button>
      </div>

      {/* Score medio */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className={`border px-4 py-3 ${scoreColor(avgScore)}`}>
            <p className="text-2xl font-semibold">{Math.round(avgScore * 100)}%</p>
            <p className="text-xs mt-0.5 opacity-70">Score medio</p>
          </div>
          <div className="border border-gray-200 px-4 py-3">
            <p className="text-2xl font-semibold text-gray-900">{items.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Imoveis avaliados</p>
          </div>
          <div className="border border-gray-200 px-4 py-3">
            <p className="text-2xl font-semibold text-red-600">{items.filter((i) => i.score < 0.5).length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Qualidade baixa</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          Nenhum imovel avaliado. Clique em Recalcular para gerar o ranking.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          <div className="grid grid-cols-[1fr_80px_80px_100px] gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
            <span>Imovel</span>
            <span className="text-right">Completude</span>
            <span className="text-right">Frescor</span>
            <span className="text-right">Score</span>
          </div>
          {items.map((item) => (
            <div key={item.imovel_id} className="grid grid-cols-[1fr_80px_80px_100px] gap-4 px-4 py-3 items-center">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{item.titulo ?? "Sem titulo"}</p>
                <p className="text-xs text-gray-400 truncate">
                  {item.cidade ?? "Sem cidade"}
                  {item.campos_vazios.length > 0 && (
                    <span className="text-red-400"> · {item.campos_vazios.length} campo{item.campos_vazios.length !== 1 ? "s" : ""} vazio{item.campos_vazios.length !== 1 ? "s" : ""}</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-700">{Math.round(item.completude * 100)}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-700">{Math.round(item.frescor * 100)}%</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-12 h-1.5 bg-gray-100 overflow-hidden">
                    <div className={`h-full ${scoreBar(item.score)}`} style={{ width: `${item.score * 100}%` }} />
                  </div>
                  <span className={`text-sm font-medium ${item.score >= 0.8 ? "text-green-600" : item.score >= 0.5 ? "text-amber-600" : "text-red-600"}`}>
                    {Math.round(item.score * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
