"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPut, apiDelete } from "@/lib/api-client";

export type Fonte = {
  id: string;
  nome: string;
  tipo: string;
  prioridade: number;
  ativo: boolean;
  config: Record<string, unknown>;
  submission_type: string;
  url: string | null;
  scraping_status: string;
  processing_status: string;
  storage_path: string | null;
  notas: string | null;
  last_processed_at: string | null;
  last_scraped_at: string | null;
  created_at: string | null;
  updated_at: string | null;
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

  async function atualizar(id: string, data: Partial<Fonte>) {
    const updated = await apiPut<Fonte>(`/api/v1/mdm/fontes/${id}`, data, { auth: true });
    setFontes((prev) => prev.map((f) => f.id === id ? updated : f));
    return updated;
  }

  async function excluir(id: string) {
    await apiDelete(`/api/v1/mdm/fontes/${id}`, { auth: true });
    setFontes((prev) => prev.filter((f) => f.id !== id));
  }

  return { fontes, loading, atualizar, excluir, reload: load };
}
