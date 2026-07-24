"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

export type PropertyState = {
  id: string;
  original: Record<string, unknown>;
  atual: Record<string, unknown>;
  changes: Record<string, { from: unknown; to: unknown; source: string; event_id: string }>;
  imagens?: Array<{ storage_path: string; ordem: number }>;
};

export type SimilarState = PropertyState & {
  score: number;
  rank: number;
  imovel_id: string;
};

export type EventRecord = {
  id: string;
  card_id: string;
  tipo: string;
  campo: string;
  valor_anterior: unknown;
  valor_novo: unknown;
  origem_tipo: string;
  origem_id: string | null;
  destino_tipo: string;
  destino_id: string;
  undone: boolean;
  created_at: string | null;
};

export type CardState = {
  card: {
    id: string;
    fonte_id: string;
    status: string;
    score_max: number | null;
    created_at: string | null;
  };
  registro: PropertyState;
  similares: SimilarState[];
  events: EventRecord[];
  stats: {
    total_events: number;
    active_events: number;
    pending_changes: number;
  };
};

export function useEnrichmentCard(cardId: string) {
  const [state, setState] = useState<CardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<CardState>(
        `/api/v1/mdm/enrichment/cards/${cardId}`,
        { auth: true },
      );
      setState(data);
    } catch (err) {
      console.error("Erro ao carregar card:", err);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createEvent(data: {
    tipo: string;
    campo: string;
    valor_novo: unknown;
    valor_anterior?: unknown;
    origem_tipo: string;
    origem_id?: string | null;
    destino_tipo: string;
    destino_id: string;
  }) {
    setSaving(true);
    try {
      await apiPost(
        `/api/v1/mdm/enrichment/cards/${cardId}/events`,
        data,
        { auth: true },
      );
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function undoEvent(eventId: string) {
    setSaving(true);
    try {
      await apiPost(
        `/api/v1/mdm/enrichment/cards/${cardId}/undo`,
        { event_id: eventId },
        { auth: true },
      );
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function finalize(criarImovel: boolean) {
    setSaving(true);
    try {
      const result = await apiPost(
        `/api/v1/mdm/enrichment/cards/${cardId}/finalize`,
        { criar_imovel: criarImovel },
        { auth: true },
      );
      await load();
      return result;
    } finally {
      setSaving(false);
    }
  }

  async function discard() {
    setSaving(true);
    try {
      await apiPost(
        `/api/v1/mdm/enrichment/cards/${cardId}/discard`,
        {},
        { auth: true },
      );
      await load();
    } finally {
      setSaving(false);
    }
  }

  // Get the last non-undone event for undo button
  const lastEvent = state?.events
    .filter((e) => !e.undone)
    .at(-1);

  return {
    state,
    loading,
    saving,
    createEvent,
    undoEvent,
    finalize,
    discard,
    lastEvent,
    reload: load,
  };
}
