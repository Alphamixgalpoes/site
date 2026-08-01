"use client";

import { useEffect, useState } from "react";
import { apiGet, apiDelete } from "@/lib/api-client";

export type RegistroArquivo = {
  id: string;
  registro_id: string;
  tipo: string;
  storage_path: string;
  nome: string | null;
  content_type: string | null;
  ordem: number;
  created_at: string | null;
};

export type Registro = {
  id: string;
  texto: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  arquivos: RegistroArquivo[];
};

export function useRegistros() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await apiGet<Registro[]>("/api/v1/registros", { auth: true });
      setRegistros(data);
    } catch (err) {
      console.error("Erro ao carregar registros:", err);
    } finally {
      setLoading(false);
    }
  }

  async function excluir(id: string) {
    await apiDelete(`/api/v1/registros/${id}`, { auth: true });
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  }

  async function getArquivoUrl(registroId: string, path: string): Promise<string> {
    const res = await apiGet<{ url: string }>(
      `/api/v1/registros/${registroId}/arquivo-url`,
      { auth: true, params: { path } },
    );
    return res.url;
  }

  return { registros, loading, excluir, getArquivoUrl, reload: load };
}
