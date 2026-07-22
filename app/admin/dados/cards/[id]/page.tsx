"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import type { Card } from "../../_hooks/useCards";

const tipoBadge: Record<string, string> = {
  criar: "bg-green-100 text-green-700",
  atualizar: "bg-blue-100 text-blue-700",
  mesclar: "bg-purple-100 text-purple-700",
  enriquecer: "bg-amber-100 text-amber-700",
  alertar: "bg-red-100 text-red-700",
};

function fmt(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  if (typeof v === "boolean") return v ? "Sim" : "Nao";
  return String(v);
}

export default function CardDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    apiGet<Card>(`/api/v1/mdm/cards/${id}`, { auth: true })
      .then(setCard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAprovar() {
    setActing(true);
    try {
      await apiPost(`/api/v1/mdm/cards/${id}/aprovar`, {}, { auth: true });
      router.push("/admin/dados/cards");
    } catch (err) {
      console.error(err);
      setActing(false);
    }
  }

  async function handleRejeitar() {
    setActing(true);
    try {
      await apiPost(`/api/v1/mdm/cards/${id}/rejeitar`, {}, { auth: true });
      router.push("/admin/dados/cards");
    } catch (err) {
      console.error(err);
      setActing(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  }

  if (!card) {
    return <div className="text-sm text-gray-400 py-12 text-center">Card nao encontrado.</div>;
  }

  const allKeys = new Set([
    ...Object.keys(card.dados_propostos ?? {}),
    ...Object.keys(card.dados_atuais ?? {}),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Card</h1>
            <span className={`text-[10px] px-2 py-0.5 font-semibold uppercase ${tipoBadge[card.tipo] ?? "bg-gray-100 text-gray-600"}`}>
              {card.tipo}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {card.cidade ?? "Sem cidade"}{card.bairro ? ` · ${card.bairro}` : ""}
            {card.area != null ? ` · ${card.area.toLocaleString("pt-BR")} m²` : ""}
          </p>
          {card.mensagem && (
            <p className="text-sm text-gray-500 mt-2">{card.mensagem}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAprovar}
            disabled={acting}
            className="text-sm px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
          >
            Aprovar
          </button>
          <button
            onClick={handleRejeitar}
            disabled={acting}
            className="text-sm px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
          >
            Rejeitar
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-gray-200 px-4 py-3">
          <p className="text-2xl font-semibold text-gray-900">{Math.round(card.confianca * 100)}%</p>
          <p className="text-xs text-gray-400 mt-0.5">Confianca</p>
        </div>
        {card.score_match != null && (
          <div className="border border-gray-200 px-4 py-3">
            <p className="text-2xl font-semibold text-gray-900">{Math.round(card.score_match * 100)}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Score match</p>
          </div>
        )}
        {card.created_at && (
          <div className="border border-gray-200 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">
              {new Date(card.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Criado em</p>
          </div>
        )}
      </div>

      {/* Comparacao de campos */}
      {(card.tipo === "atualizar" || card.tipo === "mesclar" || card.tipo === "enriquecer") && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Comparacao de campos</h2>
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            <div className="grid grid-cols-3 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
              <span>Campo</span>
              <span>Atual</span>
              <span>Proposto</span>
            </div>
            {Array.from(allKeys).sort().map((key) => {
              const changed = card.campos_alterados?.includes(key);
              return (
                <div key={key} className={`grid grid-cols-3 gap-4 px-4 py-2 text-sm ${changed ? "bg-amber-50" : ""}`}>
                  <span className={`text-gray-600 ${changed ? "font-medium" : ""}`}>{key}</span>
                  <span className="text-gray-400 truncate">{fmt(card.dados_atuais?.[key])}</span>
                  <span className={`truncate ${changed ? "text-amber-700 font-medium" : "text-gray-400"}`}>
                    {fmt(card.dados_propostos?.[key])}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dados propostos (criar) */}
      {card.tipo === "criar" && card.dados_propostos && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Dados do novo imovel</h2>
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {Object.entries(card.dados_propostos).map(([key, val]) => (
              <div key={key} className="grid grid-cols-2 gap-4 px-4 py-2 text-sm">
                <span className="text-gray-600">{key}</span>
                <span className="text-gray-900 truncate">{fmt(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voltar */}
      <button
        onClick={() => router.push("/admin/dados/cards")}
        className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        ← Voltar para cards
      </button>
    </div>
  );
}
