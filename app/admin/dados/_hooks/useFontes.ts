"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

export type Fonte = {
  id: string;
  nome: string;
  tipo: string;
  prioridade: number;
  ativo: boolean;
  config: Record<string, unknown>;
  schema_map: Record<string, string>;
  created_at: string | null;
};

export function useFontes() {
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await apiGet<Fonte[]>("/api/v1/mdm/fontes", { auth: true });
      setFontes(data);
    } catch (err) {
      console.error("Erro ao carregar fontes:", err);
    } finally {
      setLoading(false);
    }
  }

  async function criar(data: { nome: string; tipo: string; prioridade?: number }) {
    const nova = await apiPost<Fonte>("/api/v1/mdm/fontes", data, { auth: true });
    setFontes((prev) => [nova, ...prev]);
    return nova;
  }

  async function atualizar(id: string, data: Partial<Fonte>) {
    const updated = await apiPut<Fonte>(`/api/v1/mdm/fontes/${id}`, data, { auth: true });
    setFontes((prev) => prev.map((f) => f.id === id ? updated : f));
    return updated;
  }

  async function excluir(id: string) {
    await apiDelete(`/api/v1/mdm/fontes/${id}`, { auth: true });
    setFontes((prev) => prev.filter((f) => f.id !== id));
  }

  return { fontes, loading, criar, atualizar, excluir, reload: load };
}
