"use client";

import { useEffect, useState } from "react";
import { apiGet, apiUpload } from "@/lib/api-client";
import type { Fonte } from "./useFontes";

type Registro = {
  id: string;
  fonte_id: string;
  dados_brutos: Record<string, unknown>;
  dados_normalizados: Record<string, unknown> | null;
  stage: string;
  created_at: string | null;
};

type RegistrosResponse = {
  total: number;
  registros: Registro[];
};

export function useFonteDetail(fonteId: string) {
  const [fonte, setFonte] = useState<Fonte | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [cleanCount, setCleanCount] = useState(0);
  const [rawRegistros, setRawRegistros] = useState<Registro[]>([]);
  const [cleanRegistros, setCleanRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => { load(); }, [fonteId]);

  async function load() {
    setLoading(true);
    try {
      const [f, raw, clean] = await Promise.all([
        apiGet<Fonte>(`/api/v1/mdm/fontes/${fonteId}`, { auth: true }),
        apiGet<RegistrosResponse>(`/api/v1/mdm/fontes/${fonteId}/raw`, { auth: true }),
        apiGet<RegistrosResponse>(`/api/v1/mdm/fontes/${fonteId}/clean`, { auth: true }),
      ]);
      setFonte(f);
      setRawCount(raw.total);
      setRawRegistros(raw.registros);
      setCleanCount(clean.total);
      setCleanRegistros(clean.registros);
    } catch (err) {
      console.error("Erro ao carregar fonte:", err);
    } finally {
      setLoading(false);
    }
  }

  async function resubmit(file: File) {
    setResubmitting(true);
    try {
      const updated = await apiUpload<Fonte>(
        `/api/v1/mdm/submeter/${fonteId}/reenviar`,
        file,
        undefined,
        { auth: true },
      );
      setFonte(updated);
      await load();
    } catch (err) {
      console.error("Erro ao reenviar:", err);
      throw err;
    } finally {
      setResubmitting(false);
    }
  }

  return {
    fonte, loading, rawCount, cleanCount,
    rawRegistros, cleanRegistros,
    resubmit, resubmitting,
    reload: load,
  };
}
