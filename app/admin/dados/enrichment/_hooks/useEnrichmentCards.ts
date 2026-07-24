"use client";

import { useEffect, useState, useMemo } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

export type EnrichmentCardSummary = {
  id: string;
  fonte_id: string;
  status: string;
  cidade: string | null;
  bairro: string | null;
  logradouro: string | null;
  area: number | null;
  score_max: number | null;
  registro_snapshot: Record<string, unknown>;
  similares: Array<{
    imovel_id: string;
    score: number;
    rank: number;
    snapshot: Record<string, unknown>;
  }>;
  created_at: string | null;
};

type ListResponse = {
  cards: EnrichmentCardSummary[];
  total: Record<string, number>;
};

export function useEnrichmentCards() {
  const [cards, setCards] = useState<EnrichmentCardSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pendente");
  const [filtroCidade, setFiltroCidade] = useState("todas");

  useEffect(() => {
    load();
  }, [status]);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { status, limit: "100" };
      if (filtroCidade !== "todas") params.cidade = filtroCidade;

      const res = await apiGet<ListResponse>("/api/v1/mdm/enrichment/cards", {
        auth: true,
        params,
      });
      setCards(res.cards);
      setCounts(res.total);
    } catch (err) {
      console.error("Erro ao carregar enrichment cards:", err);
    } finally {
      setLoading(false);
    }
  }

  const cidades = useMemo(() => {
    const s = new Set(
      cards.map((c) => c.cidade).filter(Boolean) as string[],
    );
    return Array.from(s).sort();
  }, [cards]);

  async function generate(fonteId: string) {
    await apiPost("/api/v1/mdm/enrichment/generate", { fonte_id: fonteId }, { auth: true });
    await load();
  }

  return {
    cards,
    counts,
    loading,
    cidades,
    status,
    setStatus,
    filtroCidade,
    setFiltroCidade,
    reload: load,
    generate,
  };
}
