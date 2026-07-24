"use client";

import { useEffect, useState, useMemo } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

export type CardResumo = {
  criar: number;
  atualizar: number;
  mesclar: number;
  enriquecer: number;
  alertar: number;
  total: number;
};

export type Card = {
  id: string;
  tipo: string;
  status: string;
  imovel_id: string | null;
  dados_propostos: Record<string, unknown>;
  dados_atuais: Record<string, unknown>;
  campos_alterados: string[];
  mensagem: string | null;
  confianca: number;
  score_match: number | null;
  cidade: string | null;
  bairro: string | null;
  area: number | null;
  valor: number | null;
  fonte_id: string | null;
  created_at: string | null;
};

export function useCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [resumo, setResumo] = useState<CardResumo>({ criar: 0, atualizar: 0, mesclar: 0, enriquecer: 0, alertar: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCidade, setFiltroCidade] = useState("todas");
  const [filtroFonte, setFiltroFonte] = useState("todas");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [c, r] = await Promise.all([
        apiGet<Card[]>("/api/v1/mdm/cards", { auth: true }),
        apiGet<CardResumo>("/api/v1/mdm/cards/resumo", { auth: true }),
      ]);
      setCards(c);
      setResumo(r);
    } catch (err) {
      console.error("Erro ao carregar cards:", err);
    } finally {
      setLoading(false);
    }
  }

  const cidades = useMemo(() => {
    const s = new Set(cards.map((c) => c.cidade).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [cards]);

  const fontesIds = useMemo(() => {
    const s = new Set(cards.map((c) => c.fonte_id).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [cards]);

  const filtrados = useMemo(() => {
    return cards.filter((c) => {
      if (filtroTipo !== "todos" && c.tipo !== filtroTipo) return false;
      if (filtroCidade !== "todas" && c.cidade !== filtroCidade) return false;
      if (filtroFonte !== "todas" && c.fonte_id !== filtroFonte) return false;
      return true;
    });
  }, [cards, filtroTipo, filtroCidade, filtroFonte]);

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selecionarTodos() {
    setSelecionados(new Set(filtrados.map((c) => c.id)));
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  async function aprovar(id: string) {
    await apiPost(`/api/v1/mdm/cards/${id}/aprovar`, {}, { auth: true });
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelecionados((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setResumo((prev) => ({ ...prev, total: prev.total - 1 }));
  }

  async function rejeitar(id: string) {
    await apiPost(`/api/v1/mdm/cards/${id}/rejeitar`, {}, { auth: true });
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelecionados((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setResumo((prev) => ({ ...prev, total: prev.total - 1 }));
  }

  async function aprovarLote() {
    const ids = Array.from(selecionados);
    if (!ids.length) return;
    await apiPost("/api/v1/mdm/cards/aprovar-lote", { ids }, { auth: true });
    setCards((prev) => prev.filter((c) => !selecionados.has(c.id)));
    setResumo((prev) => ({ ...prev, total: Math.max(0, prev.total - ids.length) }));
    setSelecionados(new Set());
  }

  async function rejeitarLote() {
    const ids = Array.from(selecionados);
    if (!ids.length) return;
    await apiPost("/api/v1/mdm/cards/rejeitar-lote", { ids }, { auth: true });
    setCards((prev) => prev.filter((c) => !selecionados.has(c.id)));
    setResumo((prev) => ({ ...prev, total: Math.max(0, prev.total - ids.length) }));
    setSelecionados(new Set());
  }

  return {
    cards: filtrados, resumo, loading, cidades, fontesIds,
    filtroTipo, setFiltroTipo, filtroCidade, setFiltroCidade,
    filtroFonte, setFiltroFonte,
    selecionados, toggleSelecionado, selecionarTodos, limparSelecao,
    aprovar, rejeitar, aprovarLote, rejeitarLote,
    reload: load,
  };
}
